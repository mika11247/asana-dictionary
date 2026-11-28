const assert = require('node:assert/strict')
const { spawn, spawnSync } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')

const container = 'asana-reservation-acceptance-db-1'
const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'asana_reservation_fixture', '-XqAt', '-v', 'ON_ERROR_STOP=1']
const owners = [1, 2, 3, 4].map(n => '00000000-0000-4000-8000-00000000000' + n)
const mb = 1024 * 1024
const reserve = (owner, id) => `set role service_role; select public.asana_image_reserve('${owner}','${id}')->>'status';`

function query(sql, expectedError) {
  const result = spawnSync('docker', args, { input: sql, encoding: 'utf8' })
  if (expectedError) {
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, expectedError)
  } else {
    assert.equal(result.status, 0, result.stderr)
  }
  return result.stdout.trim()
}

function concurrent(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args)
    let output = ''
    let error = ''
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { error += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(error)))
    child.stdin.end(sql)
  })
}

function settle(owner, id, action, expectedError, path = owner + '/' + id + '.webp') {
  return query(`set role service_role; select public.asana_image_settle('${owner}','${id}','${path}','${action}');`, expectedError)
}

function object(owner, id, bytes, bucket = 'asana-images-private') {
  query(`insert into storage.objects values ('${bucket}','${owner}/${id}.webp',
    jsonb_build_object('size',${bytes},'mimetype','image/webp'));`)
}

function reset() {
  query('truncate asana_image_private.attempts, asana_image_private.reservations, storage.objects;')
}

test('reservation rollout on isolated PostgreSQL', async t => {
  const database = spawnSync('docker', ['exec', container, 'psql', '-U', 'postgres',
    '-c', 'create database asana_reservation_fixture template template0'], { encoding: 'utf8' })
  assert.equal(database.status, 0, database.stderr)
  query(readFileSync('tests/asana-image-reservations-fixture.sql', 'utf8'))
  const snapshotSql = `select md5(concat(
    (select jsonb_agg(to_jsonb(t) order by id) from auth.users t),
    (select jsonb_agg(to_jsonb(t) order by id) from public.asanas t),
    (select jsonb_agg(to_jsonb(t) order by id) from public.crm_customers t),
    (select jsonb_agg(to_jsonb(t) order by tablename,policyname) from pg_policies t
      where schemaname in ('public','storage'))
  ));`
  const baseline = query(snapshotSql)
  const migration = readFileSync('supabase/rollouts/asana-image-privacy/04-upload-reservations.sql', 'utf8')
  query("create function public.asana_image_settle(uuid,uuid,text,text) returns text language sql as 'select null::text';")
  query(migration, /already exists/)
  assert.equal(query(`select to_regnamespace('asana_image_private') is null,
    to_regprocedure('public.asana_image_reserve(uuid,uuid)') is null;`), 't|t')
  query('drop function public.asana_image_settle(uuid,uuid,text,text);')
  query(migration)

  await t.test('per-plan boundaries and downgrade', () => {
    for (const [index, limit] of [40, 60, 120, 300].entries()) {
      reset()
      const owner = owners[index]
      object(owner, randomUUID(), (limit - 5) * mb)
      assert.equal(query(reserve(owner, randomUUID())), 'held')
      assert.equal(query(reserve(owner, randomUUID())), 'user_capacity')
    }
    reset()
    object(owners[3], randomUUID(), 41 * mb)
    query(`update public.profiles set plan='free' where id='${owners[3]}';`)
    assert.equal(query(reserve(owners[3], randomUUID())), 'user_capacity')
    assert.equal(query('select count(*) from storage.objects;'), '1')
    query(`update public.profiles set plan='pro' where id='${owners[3]}';`)
  })

  await t.test('rolling windows, failed attempts and bounded denials', () => {
    reset()
    const owner = owners[0]
    const batch = Array.from({ length: 6 }, () => randomUUID())
    for (const id of batch) {
      assert.equal(query(reserve(owner, id)), 'held')
      assert.equal(settle(owner, id, 'release'), 'released')
    }
    assert.equal(query(reserve(owner, randomUUID())), 'rate_minute')
    assert.equal(query('select count(*) from asana_image_private.attempts;'), '6')
    query("update asana_image_private.attempts set attempted_at=clock_timestamp()-interval '61 seconds';")
    assert.equal(query(reserve(owner, randomUUID())), 'held')
    query(`
      insert into asana_image_private.reservations
      select x,'${owner}','${owner}/'||x||'.webp','released',5242880,null,now(),now()+interval '10 min',now()
      from (select gen_random_uuid() x from generate_series(1,33)) q;
      insert into asana_image_private.attempts
      select r.request_id,r.owner_id,now()-interval '2 hours' from asana_image_private.reservations r
      where not exists (select 1 from asana_image_private.attempts a where a.request_id=r.request_id);
    `)
    assert.equal(query(reserve(owner, randomUUID())), 'rate_day')
    assert.equal(query('select count(*) from asana_image_private.attempts;'), '40')
    query("update asana_image_private.attempts set attempted_at=clock_timestamp()-interval '25 hours';")
    assert.equal(query(reserve(owner, randomUUID())), 'held')
  })

  await t.test('parallel requests respect owner and project boundaries', async () => {
    reset()
    const own = await Promise.all(Array.from({ length: 5 }, () => concurrent(reserve(owners[0], randomUUID()))))
    assert.deepEqual(own.sort(), ['held','held','in_flight','in_flight','in_flight'])
    reset()
    object(owners[0], randomUUID(), 595 * mb, 'asana-images')
    assert.equal(query(`set role service_role; select public.asana_image_reserve('${owners[0]}',
      gen_random_uuid())->>'warning';`), 'true')
    assert.equal(query(reserve(owners[1], randomUUID())), 'held')
    reset()
    object(owners[0], randomUUID(), 625 * mb, 'asana-images')
    const global = await Promise.all(owners.map(owner => concurrent(reserve(owner, randomUUID()))))
    assert.deepEqual(global.sort(), ['held','project_capacity','project_capacity','project_capacity'])
    assert.equal(query('select sum(reserved_bytes) from asana_image_private.reservations;'), String(5 * mb))
  })

  await t.test('state, server sizes, ownership, replay and uncertain writes', async () => {
    reset()
    const [owner, other] = owners
    const id = randomUUID()
    assert.deepEqual(await Promise.all([concurrent(reserve(owner,id)),concurrent(reserve(owner,id))]), ['held','held'])
    assert.equal(query('select count(*) from asana_image_private.attempts;'), '1')
    query(reserve(other,id), /Reservation unavailable/)
    settle(other,id,'start',/Reservation unavailable/)
    settle(owner,id,'start',/Reservation unavailable/,'wrong-path')
    assert.equal(settle(owner,id,'start'),'writing')
    settle(owner,id,'start',/Unsafe reservation transition/)
    settle(owner,id,'confirm',/Unsafe reservation transition/)
    assert.equal(settle(owner,id,'uncertain'),'uncertain')
    settle(owner,id,'release',/Unsafe reservation transition/)
    settle(owner,id,'failed',/Unsafe reservation transition/)
    assert.equal(query('select sum(reserved_bytes) from asana_image_private.reservations;'),String(5 * mb))
    object(owner,id,5 * mb + 1)
    settle(owner,id,'confirm',/Unsafe reservation transition/)
    query(`update storage.objects set metadata=jsonb_build_object('size',1234,'mimetype','image/webp') where name='${owner}/${id}.webp';`)
    assert.equal(settle(owner,id,'confirm'),'confirmed')
    assert.equal(settle(owner,id,'confirm'),'confirmed')
    settle(owner,id,'release',/Unsafe reservation transition/)
    assert.equal(query(`select user_objects,user_reserved,mismatched_confirmed from asana_image_private.usage_totals('${owner}');`),'1234|0|0')
    const failed = randomUUID()
    assert.equal(query(reserve(owner,failed)),'held')
    assert.equal(settle(owner,failed,'start'),'writing')
    assert.equal(settle(owner,failed,'failed'),'released')
    assert.equal(settle(owner,failed,'failed'),'released')
    const expired = randomUUID()
    assert.equal(query(reserve(owner,expired)),'held')
    query(`update asana_image_private.reservations set created_at=now()-interval '12 minutes',
      expires_at=now()-interval '2 minutes' where request_id='${expired}';`)
    settle(owner,expired,'start',/Unsafe reservation transition/)
    assert.equal(settle(owner,expired,'release'),'released')
    query('delete from storage.objects;')
    assert.equal(query(reserve(owner,randomUUID())),'reconciliation_required')
  })

  await t.test('no client bypass and legacy partitions unaffected', () => {
    for (const role of ['anon','authenticated']) {
      query(`set role ${role}; select public.asana_image_reserve('${owners[0]}',gen_random_uuid());`, /permission denied/)
      query(`set role ${role}; select public.asana_image_settle('${owners[0]}',gen_random_uuid(),'bad','release');`, /permission denied/)
      query(`set role ${role}; select * from asana_image_private.settings;`, /permission denied/)
    }
    assert.equal(query(`select count(*) from pg_proc p cross join lateral aclexplode(p.proacl) a
      where p.proname in ('asana_image_reserve','asana_image_settle') and a.grantee=0;`),'0')
    assert.equal(query(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('asana_image_reserve','asana_image_settle')
        and p.prosecdef and pg_get_userbyid(p.proowner)='postgres'
        and p.proconfig @> array['search_path=""'];`),'2')
    assert.equal(query("select has_schema_privilege('service_role','asana_image_private','usage');"),'f')
    query("set role authenticated; insert into storage.objects values ('asana-images-private','foreign.webp','{}');", /row-level security/)
    query("set role authenticated; insert into storage.objects values ('asana-images','legacy.webp','{}');")
    assert.equal(query(snapshotSql), baseline)
  })

  await t.test('rollback refuses used ledgers and removes only unused Stage A definitions', () => {
    reset()
    const rollback = readFileSync('supabase/rollouts/asana-image-privacy/04-rollback-unused-reservations.sql', 'utf8')
    object(owners[0], randomUUID(), 1000, 'asana-images')
    query(reserve(owners[1], randomUUID()))
    assert.equal(query('select count(*) from asana_image_private.reservations;'), '1')
    query(rollback, /Stage A has been used/)
    assert.equal(query('select count(*) from asana_image_private.reservations;'), '1')
    // Reproduce an unused Stage A deployment while retaining the legacy object.
    query('truncate asana_image_private.attempts, asana_image_private.reservations;')
    query(rollback)
    assert.equal(query(`select to_regnamespace('asana_image_private') is null,
      to_regprocedure('public.asana_image_reserve(uuid,uuid)') is null,
      to_regprocedure('public.asana_image_settle(uuid,uuid,text,text)') is null;`), 't|t|t')
    assert.equal(query(snapshotSql), baseline)
    assert.equal(query("select count(*) from storage.objects where bucket_id='asana-images';"), '1')
  })
})
