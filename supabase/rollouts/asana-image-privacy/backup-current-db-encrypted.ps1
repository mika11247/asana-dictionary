[CmdletBinding()]
param([switch]$PrepareOnly, [switch]$VerifyConnectionOnly)

$ErrorActionPreference = 'Stop'
$bin = 'C:\Program Files\PostgreSQL\17\bin'
$connection = 'host=aws-1-ap-southeast-2.pooler.supabase.com port=5432 dbname=postgres user=postgres.wjmjcwakiirkhofytggl sslmode=require connect_timeout=15'
$root = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Mglitter-DB-Backups-EFS'
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User

function Invoke-Pg([string]$tool, [string[]]$arguments) {
  & (Join-Path $bin "$tool.exe") @arguments
  if ($LASTEXITCODE -ne 0) { throw "$tool failed (exit $LASTEXITCODE)." }
}

function Assert-ProductionIdentity([string[]]$lines) {
  $output = ($lines -join "`n").Trim()
  if ($output -cnotmatch '^\{[^\r\n]*\}$') {
    throw 'Production identity check expected one JSON row.'
  }
  try { $identity = ConvertFrom-Json -InputObject $output -ErrorAction Stop }
  catch { throw 'Production identity check returned invalid JSON.' }
  $failed = @(
    foreach ($checkName in 'database','server_major','read_only','role','crm','migration_rpc','private_bucket','sign_restriction','phase_a_absent') {
      if ($identity.$checkName -isnot [bool] -or -not $identity.$checkName) { $checkName }
    }
  )
  if ($failed.Count -gt 0) { throw "Production identity check failed: $($failed -join ', ')." }
}

function Assert-Encrypted([string]$path) {
  $attributes = (Get-Item -LiteralPath $path -Force).Attributes
  if (($attributes -band [IO.FileAttributes]::ReparsePoint) -or
      -not ($attributes -band [IO.FileAttributes]::Encrypted)) {
    throw 'Expected an EFS-encrypted path without a reparse point.'
  }
}

foreach ($tool in 'psql','pg_dump','pg_dumpall','pg_restore') {
  if ((Invoke-Pg $tool @('--version')) -notmatch ' 17\.11(\s|$)') { throw "$tool 17.11 is required." }
}
if (-not (Test-Path -LiteralPath $root)) {
  New-Item -ItemType Directory -Path $root | Out-Null
  $acl = New-Object Security.AccessControl.DirectorySecurity
  $acl.SetOwner($sid)
  $acl.SetAccessRuleProtection($true, $false)
  $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule(
    $sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'
  )))
  Set-Acl -LiteralPath $root -AclObject $acl
  & cipher.exe /e /a $root | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'EFS setup failed; no backup was started.' }
}
Assert-Encrypted $root
$acl = Get-Acl -LiteralPath $root
if (-not $acl.AreAccessRulesProtected -or $acl.Access.Count -ne 1 -or
    $acl.Access[0].IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) {
  throw 'Backup directory ACL verification failed.'
}
$probe = Join-Path $root ([Guid]::NewGuid().ToString('N') + '.probe')
try {
  [IO.File]::WriteAllText($probe, 'EFS test')
  Assert-Encrypted $probe
  if ([IO.File]::ReadAllText($probe) -cne 'EFS test') { throw 'EFS read-back failed.' }
} finally {
  if (Test-Path -LiteralPath $probe) { Remove-Item -LiteralPath $probe }
}
Write-Host 'EFS inheritance, restricted ACL and local read-back verified.'
if ($PrepareOnly) { return }

foreach ($name in 'PGPASSWORD','PGPASSFILE','PGSERVICE','PGSERVICEFILE','PGOPTIONS') {
  if (Test-Path "Env:$name") { throw "Use a fresh terminal without $name." }
}
$check = @'
begin read only;
select json_build_object(
  'database', current_database() = 'postgres',
  'server_major', current_setting('server_version_num')::integer / 10000 = 17,
  'read_only', current_setting('transaction_read_only') = 'on',
  'role', session_user = 'postgres' and current_user = 'postgres',
  'crm', to_regclass('public.crm_customers') is not null,
  'migration_rpc', to_regprocedure('public.asana_image_migration_batch(text,integer)') is not null,
  'private_bucket', exists (select from storage.buckets where id='asana-images-private' and public is false),
  'sign_restriction', exists (select from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='asana_private_read' and qual like '%allow_any_operation%'),
  'phase_a_absent', to_regnamespace('asana_image_private') is null
);
rollback;
'@
$env:PGOPTIONS = '-c default_transaction_read_only=on'
try {
  $verified = @(Invoke-Pg 'psql' @('-X','-W','-A','-t','-q','-v','ON_ERROR_STOP=1','-d',$connection,'-c',$check))
  Assert-ProductionIdentity $verified
  Write-Host 'Production identity verified in a read-only transaction (psql exit 0).'
  if ($VerifyConnectionOnly) { return }
  $directory = Join-Path $root ('asana-dictionary-current-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssZ'))
  New-Item -ItemType Directory -Path $directory | Out-Null
  Assert-Encrypted $directory
  $archive = Join-Path $directory 'database.dump'
  $roles = Join-Path $directory 'roles-no-passwords.sql'
  $toc = Join-Path $directory 'archive-contents.txt'
  $schema = Join-Path $directory 'schema-and-acl.sql'
  $receipt = Join-Path $directory 'backup-scope.txt'
  Invoke-Pg 'pg_dump' @('-W','--dbname',$connection,'--format=custom','--file',$archive)
  Assert-Encrypted $archive
  Invoke-Pg 'pg_dumpall' @('-W','--dbname',$connection,'--database','postgres','--roles-only','--no-role-passwords','--file',$roles)
  Invoke-Pg 'pg_restore' @('--list',$archive) | Set-Content -LiteralPath $toc -Encoding UTF8
  Invoke-Pg 'pg_restore' @('--schema-only','--file',$schema,$archive)
  Invoke-Pg 'pg_restore' @('--file=NUL',$archive)
  $catalog = Get-Content -LiteralPath $toc -Raw
  $definitions = Get-Content -LiteralPath $schema -Raw
  foreach ($entry in 'TABLE DATA auth users','TABLE DATA storage buckets','TABLE DATA storage objects',
    'TABLE DATA public crm_customers','TABLE DATA public asanas') {
    if (-not $catalog.Contains($entry)) { throw 'Expected archive entry missing.' }
  }
  foreach ($entry in 'private_image_path','check_asana_private_image','asana_image_migration_batch',
    'asana_private_read','allow_any_operation','ROW LEVEL SECURITY','GRANT') {
    if (-not $definitions.Contains($entry)) { throw 'Expected schema definition missing.' }
  }
  @("Created UTC: $([DateTime]::UtcNow.ToString('o'))",
    'Source project: asana-dictionary; PostgreSQL tools: 17.11',
    'Database archive, roles without passwords, schema and ACL, and archive catalog.',
    'Database metadata only. Storage object bytes and provider-side settings excluded.',
    'EFS restore requires its private key or a configured recovery agent.') |
    Set-Content -LiteralPath $receipt -Encoding Ascii
  $files = @($archive,$roles,$toc,$schema,$receipt)
  foreach ($file in $files) { Assert-Encrypted $file }
  $manifest = Join-Path $directory 'SHA256SUMS.txt'
  $hashes = @(Get-FileHash -Algorithm SHA256 -LiteralPath $files)
  $hashes | ForEach-Object { '{0}  {1}' -f $_.Hash, (Split-Path $_.Path -Leaf) } |
    Set-Content -LiteralPath $manifest -Encoding Ascii
  Assert-Encrypted $manifest
  foreach ($record in $hashes) {
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $record.Path).Hash -cne $record.Hash) {
      throw 'Backup hash verification failed.'
    }
  }
  Write-Host "Backup complete and verified: $directory"
  Write-Host "Archive SHA-256: $((Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash)"
  Write-Host "Manifest SHA-256: $((Get-FileHash -Algorithm SHA256 -LiteralPath $manifest).Hash)"
} finally {
  Remove-Item Env:PGOPTIONS -ErrorAction SilentlyContinue
}
