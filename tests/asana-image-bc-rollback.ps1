[CmdletBinding()]
param([Parameter(Mandatory)][string]$BackupDirectory)

$ErrorActionPreference = 'Stop'
$archive = Join-Path $BackupDirectory 'database.dump'
$schemaFile = Join-Path $BackupDirectory 'schema-and-acl.sql'
$rolesFile = Join-Path $BackupDirectory 'roles-no-passwords.sql'
$manifest = Join-Path $BackupDirectory 'SHA256SUMS.txt'
$rollouts = Join-Path $PSScriptRoot '../supabase/rollouts/asana-image-privacy'
$container = 'asana-bc-rollback-' + [Guid]::NewGuid().ToString('N')

foreach ($file in $archive,$schemaFile,$rolesFile,$manifest) {
  if (-not ((Get-Item -LiteralPath $file).Attributes -band [IO.FileAttributes]::Encrypted)) {
    throw 'Expected EFS-protected inputs.'
  }
}
if ((Get-FileHash -LiteralPath $archive).Hash -ne 'B11F0BB27CCC49CA603624D54D22C94503A94B936C634BD8B8CA91896871EE4B' -or
    (Get-FileHash -LiteralPath $manifest).Hash -ne 'FFA83416CF87BA9638D034777B05826408666117167F496212014F457BEF6A84') {
  throw 'Backup hash mismatch.'
}
foreach ($file in 'schema-and-acl.sql','roles-no-passwords.sql') {
  $entry = @((Get-Content -LiteralPath $manifest) | Where-Object { $_.EndsWith('  ' + $file) })
  if ($entry.Count -ne 1 -or (Get-FileHash -LiteralPath (Join-Path $BackupDirectory $file)).Hash -ne $entry[0].Substring(0,64)) {
    throw 'Restore input hash mismatch.'
  }
}

function Invoke-Sql([string]$sql, [string]$label, [string]$expectedError = '') {
  $ErrorActionPreference = 'Continue'
  $messages = @($sql | & docker exec -i $container psql -X -h /ram -U supabase_admin -d postgres -Atq -v ON_ERROR_STOP=1 -f - 2>&1)
  $exit = $LASTEXITCODE
  if ($expectedError) {
    if ($exit -eq 0 -or ($messages -join "`n") -notmatch $expectedError) { throw "$label did not reject as expected." }
    return
  }
  if ($exit -ne 0) {
    if ($label -match '^0[456]-[a-z-]+\.sql$') {
      $errorLine = $messages | ForEach-Object { "$_" } | Where-Object { $_ -match '^psql:<stdin>:\d+: ERROR:' } | Select-Object -First 1
      throw "$label failed. $errorLine"
    }
    throw "$label failed; SQL error details suppressed."
  }
  return ($messages -join "`n").Trim()
}

function Invoke-Rollout([string]$file, [string]$expectedError = '') {
  $sql = Get-Content -LiteralPath (Join-Path $rollouts $file) -Encoding UTF8 -Raw
  Invoke-Sql ("set role postgres;`n" + $sql) $file $expectedError | Out-Null
}

$fingerprint = @'
set search_path=public;
with ns as (
  select oid,nspname,nspacl from pg_namespace where nspname in ('public','auth','storage','crm_private','asana_image_private')
), defs as (
  select jsonb_build_array('schema',nspname,nspacl::text)::text row from ns
  union all select jsonb_build_array('policy',to_jsonb(p))::text from pg_policies p join ns on nspname=schemaname
  union all select jsonb_build_array('relation',nspname,relname,relkind,relrowsecurity,relforcerowsecurity,relacl::text)::text
    from pg_class c join ns on ns.oid=c.relnamespace where relkind in ('r','p','v','S')
  union all select jsonb_build_array('column',nspname,relname,attname,format_type(atttypid,atttypmod),attnotnull,attacl::text)::text
    from pg_attribute a join pg_class c on c.oid=a.attrelid join ns on ns.oid=c.relnamespace
    where relkind in ('r','p','v') and attnum>0 and not attisdropped
  union all select jsonb_build_array('function',nspname,pg_get_functiondef(p.oid),proacl::text,pg_get_userbyid(proowner))::text
    from pg_proc p join ns on ns.oid=p.pronamespace where prokind='f'
  union all select jsonb_build_array('trigger',nspname,relname,pg_get_triggerdef(t.oid),tgenabled)::text
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join ns on ns.oid=c.relnamespace where not tgisinternal
  union all select jsonb_build_array('index',schemaname,indexdef)::text from pg_indexes join ns on nspname=schemaname
  union all select jsonb_build_array('constraint',nspname,conname,pg_get_constraintdef(c.oid))::text
    from pg_constraint c join ns on ns.oid=c.connamespace
  union all select jsonb_build_array('default_acl',nspname,pg_get_userbyid(defaclrole),defaclobjtype,defaclacl::text)::text
    from pg_default_acl d left join ns on ns.oid=d.defaclnamespace where nspname is not null or defaclnamespace=0
)
select md5(string_agg(row,E'\n' order by row collate "C")) from defs;
select md5(concat(
  (select jsonb_agg(to_jsonb(s)) from asana_image_private.settings s),
  (select count(*) from asana_image_private.reservations),
  (select count(*) from asana_image_private.attempts),
  (select count(*) from public.asanas),
  (select count(*) from public.crm_customers),
  (select count(*) from auth.users),
  (select count(*) from storage.buckets),
  (select count(*) from storage.objects)
));
'@
$policy = @'
set search_path=public;
select md5(jsonb_build_array(policyname,permissive,roles,cmd,qual,with_check)::text)
from pg_policies where schemaname='storage' and tablename='objects' and policyname='asana_private_delete_unused';
'@

try {
  & docker run --pull never --name $container --rm -d --network none --user postgres --tmpfs /ram:rw,mode=1777 --entrypoint bash public.ecr.aws/supabase/postgres:17.11.0.004 -c 'initdb -D /ram/db -U supabase_admin -A trust >/dev/null && exec postgres -D /ram/db -k /ram -c listen_addresses= -c wal_level=logical -c session_preload_libraries=supautils' | Out-Null
  if ($LASTEXITCODE) { throw 'Isolated Docker start failed.' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    & docker exec $container pg_isready -h /ram -U supabase_admin -d postgres | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Isolated PostgreSQL did not start.' }
  $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  $roles = (Get-Content -LiteralPath $rolesFile -Encoding UTF8 | Where-Object { $_ -cne 'CREATE ROLE supabase_admin;' }) -join "`n"
  Invoke-Sql $roles 'Roles restore' | Out-Null
  Invoke-Sql 'alter database postgres owner to postgres;' 'Match production database owner' | Out-Null
  Invoke-Sql @'
alter system set supautils.policy_grants = '{"postgres":["storage.objects"]}';
select pg_reload_conf();
'@ 'Configure isolated Storage policy delegation' | Out-Null
  $schema = Get-Content -LiteralPath $schemaFile -Encoding UTF8 -Raw
  Invoke-Sql ("begin;`n" + $schema + "`ncommit;") 'Schema restore' | Out-Null
  if ((Invoke-Sql "select (select count(*) from auth.users),(select count(*) from public.crm_customers),(select count(*) from public.asanas),(select count(*) from storage.objects);" 'No restored data') -cne '0|0|0|0') {
    throw 'Unexpected restored rows.'
  }
  Invoke-Rollout '04-upload-reservations.sql'
  $baseline = Invoke-Sql $fingerprint 'Stage A baseline'
  $policyBaseline = Invoke-Sql $policy 'Original owner-delete policy'
  if ($policyBaseline -cne '6aae6e43e91e87369674a2cec10b2541') { throw 'Original policy differs from production.' }
  Write-Output "Original owner-delete policy fingerprint: $policyBaseline"

  Invoke-Rollout '05-upload-image-references.sql'
  $stageB = Invoke-Sql $fingerprint 'Stage B catalog'
  if ($stageB -ceq $baseline -or (Invoke-Sql $policy 'Policy removal')) { throw 'Stage B policy not removed.' }
  Invoke-Rollout '06-image-maintenance.sql'
  Invoke-Rollout '05-rollback-unused-image-references.sql' 'Roll back Stage C before Stage B'
  Invoke-Rollout '06-rollback-unused-image-maintenance.sql'
  if ((Invoke-Sql $fingerprint 'After Stage C rollback') -cne $stageB) { throw 'Stage B fingerprint changed.' }
  Invoke-Rollout '05-rollback-unused-image-references.sql'
  if ((Invoke-Sql $fingerprint 'Full round trip') -cne $baseline -or (Invoke-Sql $policy 'Policy restored') -cne $policyBaseline) {
    throw 'Stage A fingerprint or original policy changed.'
  }
  Write-Output 'PASS B and C apply; C then B rollback restores Stage A catalog, ACLs, policies and data counts.'

  Invoke-Rollout '05-upload-image-references.sql'
  Invoke-Sql "create function public.asana_image_maintenance(text,uuid) returns jsonb language sql as 'select null::jsonb';" 'Synthetic collision' | Out-Null
  Invoke-Rollout '06-image-maintenance.sql' 'already exists'
  Invoke-Sql 'drop function public.asana_image_maintenance(text,uuid);' 'Remove synthetic collision' | Out-Null
  if ((Invoke-Sql $fingerprint 'After failed Stage C') -cne $stageB) { throw 'Partial Stage C definitions remain.' }
  Invoke-Rollout '05-rollback-unused-image-references.sql'
  if ((Invoke-Sql $fingerprint 'Failed-C rollback fingerprint') -cne $baseline) { throw 'B-only rollback changed Stage A.' }
  Write-Output 'PASS Failed Stage C rolls back atomically; Stage B alone can be safely reversed.'

  Invoke-Rollout '05-upload-image-references.sql'
  Invoke-Rollout '06-image-maintenance.sql'
  Invoke-Sql @'
insert into asana_image_private.reservations
  (request_id,owner_id,object_path,state,reserved_bytes,actual_bytes,created_at,expires_at,updated_at,reclaim_started_at)
values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',
'00000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000001.webp',
'released',5242880,null,now(),now()+interval '10 minutes',now(),now());
'@ 'Synthetic used ledger' | Out-Null
  $used = Invoke-Sql $fingerprint 'Used state fingerprint'
  Invoke-Rollout '06-rollback-unused-image-maintenance.sql' 'retain Stage C'
  if ((Invoke-Sql $fingerprint 'After rejected Stage C rollback') -cne $used) { throw 'Rejected rollback changed state.' }
  Invoke-Sql 'update asana_image_private.reservations set reclaim_started_at=null;' 'Alternate used ledger scenario' | Out-Null
  Invoke-Rollout '06-rollback-unused-image-maintenance.sql'
  $used = Invoke-Sql $fingerprint 'Used Stage B fingerprint'
  Invoke-Rollout '05-rollback-unused-image-references.sql' 'Stage B safety gate'
  if ((Invoke-Sql $fingerprint 'After rejected Stage B rollback') -cne $used) { throw 'Rejected rollback changed state.' }
  Write-Output 'PASS Used reclaim marker and used reservation ledger reject unsafe rollbacks.'
} finally {
  & docker rm -f $container 2>$null | Out-Null
}
