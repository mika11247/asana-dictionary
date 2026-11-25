[CmdletBinding()]
param([switch]$VerifyOnly)

$ErrorActionPreference = 'Stop'
$bin = 'C:\Program Files\PostgreSQL\17\bin'
$connection = 'host=aws-1-ap-southeast-2.pooler.supabase.com port=5432 dbname=postgres user=postgres.wjmjcwakiirkhofytggl sslmode=require connect_timeout=15'
$principal = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$root = Join-Path $env:LOCALAPPDATA 'Mglitter-DB-Backups'
$directory = Join-Path $root ('asana-dictionary-step1-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssZ'))

function Invoke-PostgresTool([string]$Tool, [string[]]$Arguments) {
  & (Join-Path $bin "$Tool.exe") @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Tool failed (exit $LASTEXITCODE)." }
}

foreach ($tool in 'psql', 'pg_dump', 'pg_dumpall', 'pg_restore') {
  if ((Invoke-PostgresTool $tool @('--version')) -notmatch ' 17\.11(\s|$)') {
    throw "$tool 17.11 is required."
  }
}

if (Test-Path Env:PGPASSWORD) { throw 'Open a fresh terminal without PGPASSWORD.' }
$baselineQuery = @'
SELECT jsonb_build_object(
  'database', current_database(),
  'server_major', current_setting('server_version_num')::int / 10000,
  'read_only', current_setting('transaction_read_only'),
  'session_default_read_only', current_setting('default_transaction_read_only'),
  'customers', (SELECT count(*) FROM public.crm_customers),
  'relationships', (SELECT count(*) FROM public.crm_customer_services),
  'records', (SELECT count(*) FROM public.crm_records),
  'customer_hash', (SELECT md5(string_agg(to_jsonb(x)::text, '' ORDER BY id)) FROM public.crm_customers x),
  'relationship_hash', (SELECT md5(string_agg(to_jsonb(x)::text, '' ORDER BY id)) FROM public.crm_customer_services x),
  'record_hash', (SELECT md5(string_agg(to_jsonb(x)::text, '' ORDER BY id)) FROM public.crm_records x),
  'project_admin_matches', (SELECT count(*) FROM public.profiles WHERE left(id::text,8) IN ('cfc85680','6cd36bc2') AND is_admin)
);
'@

Write-Host '1/3: Read-only connection and project verification.'
$baseline = @(Invoke-PostgresTool 'psql' @(
  '-X', '-W', '-Atq', '-v', 'ON_ERROR_STOP=1', '-d', $connection,
  '-c', 'BEGIN READ ONLY', '-c', $baselineQuery, '-c', 'ROLLBACK'
))
if ($baseline.Count -ne 1 -or [string]::IsNullOrWhiteSpace($baseline[0])) {
  throw 'psql returned an unexpected number of verification output lines.'
}
try {
  $meta = ConvertFrom-Json -InputObject $baseline[0] -ErrorAction Stop
} catch {
  throw 'psql verification output was not valid JSON.'
}
Write-Host ('Verification checks: database={0}, major_version={1}, transaction_read_only={2}, production_admin_count={3}, session_default_read_only={4}' -f
  ($meta.database -ceq 'postgres'), ($meta.server_major -eq 17), ($meta.read_only -ceq 'on'),
  ($meta.project_admin_matches -eq 2), ($meta.session_default_read_only -ceq 'on'))
if ($meta.database -ne 'postgres' -or $meta.server_major -ne 17 -or $meta.read_only -ne 'on' -or
    $meta.project_admin_matches -ne 2) { throw 'Production identity or read-only verification failed.' }
if ($VerifyOnly) {
  Write-Host 'Verification complete. No backup was created.'
  return
}
New-Item -ItemType Directory -Path $root -Force | Out-Null
if ((Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint) {
  throw 'The backup root is a reparse point.'
}
New-Item -ItemType Directory -Path $directory | Out-Null
$acl = New-Object System.Security.AccessControl.DirectorySecurity
$acl.SetOwner($principal)
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
  $principal, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $directory -AclObject $acl
$verifiedAcl = Get-Acl -LiteralPath $directory
if (-not $verifiedAcl.AreAccessRulesProtected -or $verifiedAcl.Access.Count -ne 1 -or
    $verifiedAcl.Access[0].IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -ne $principal.Value) {
  throw 'Backup directory ACL verification failed.'
}

$baseline | Set-Content -LiteralPath (Join-Path $directory 'baseline.json') -Encoding Ascii

$archive = Join-Path $directory 'database.dump'
$roles = Join-Path $directory 'roles-no-passwords.sql'
$toc = Join-Path $directory 'archive-contents.txt'
$schema = Join-Path $directory 'schema-and-acl.sql'
Write-Host '2/3: Database backup.'
Invoke-PostgresTool 'pg_dump' @('-W', '--dbname', $connection, '--format=custom', '--file', $archive)
Write-Host '3/3: Role definitions without passwords.'
Invoke-PostgresTool 'pg_dumpall' @('-W', '--dbname', $connection, '--database', 'postgres', '--roles-only', '--no-role-passwords', '--file', $roles)
Invoke-PostgresTool 'pg_restore' @('--list', $archive) | Set-Content -LiteralPath $toc -Encoding UTF8
Invoke-PostgresTool 'pg_restore' @('--schema-only', '--file', $schema, $archive)
Get-FileHash -Algorithm SHA256 -LiteralPath $archive, $roles, $toc, $schema, (Join-Path $directory 'baseline.json') |
  ForEach-Object { '{0}  {1}' -f $_.Hash, (Split-Path $_.Path -Leaf) } |
  Set-Content -LiteralPath (Join-Path $directory 'SHA256SUMS.txt') -Encoding Ascii
Write-Host "Backup complete: $directory"
