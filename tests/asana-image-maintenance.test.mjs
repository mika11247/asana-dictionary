import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { serviceToken } from '../supabase/rollouts/asana-image-privacy/acceptance.mjs'
import { maintainImages } from '../supabase/rollouts/asana-image-privacy/maintain-images.mjs'

const directory = 'supabase/rollouts/asana-image-privacy'
const bucketId = 'asana-images-private'
const origin = 'http://127.0.0.1:35433'
const client = createClient(origin, serviceToken, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init) => {
    const { pathname, search } = new URL(url)
    if (pathname.startsWith('/rest/v1/')) return fetch('http://127.0.0.1:35432' + pathname.slice(8) + search, init)
    if (pathname.startsWith('/storage/v1/')) return fetch('http://127.0.0.1:35435' + pathname.slice(11) + search, init)
    throw new Error('Unknown fixture service')
  } },
})
const bucket = client.storage.from(bucketId)

function sql(query, rejected) {
  const result = spawnSync('docker', ['exec', '-i', 'crm-step1-acceptance-db-1', 'psql',
    '-U', 'postgres', '-d', 'postgres', '-XqAt', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8' })
  if (rejected) {
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, rejected)
  } else {
    assert.equal(result.status, 0, result.stderr)
  }
  return result.stdout.trim()
}

function call(action, id) {
  return sql(`select public.asana_image_maintenance('${action}',${id ? "'"+id+"'" : 'null'})->>'status';`)
}

test('manual maintenance against isolated PostgreSQL and Storage', async () => {
  const rollout = readFileSync(directory + '/06-image-maintenance.sql', 'utf8')
  const rollback = readFileSync(directory + '/06-rollback-unused-image-maintenance.sql', 'utf8')
  sql(rollout)
  sql(rollback)
  sql(rollout)
  sql("notify pgrst, 'reload schema';")
  for (const role of ['anon','authenticated']) {
    sql(`set role ${role}; select public.asana_image_maintenance('inspect');`, /permission denied/)
  }
  assert.equal(sql(`select count(*) from pg_proc p cross join lateral aclexplode(p.proacl) a
    where p.proname='asana_image_maintenance' and a.grantee=0;`), '0')
  const owner = sql("select id from public.profiles where plan='free' order by id limit 1;")
  assert.match(owner, /^[\da-f-]{36}$/)
  const snapshot = () => sql(`select md5(concat(
    (select jsonb_agg(to_jsonb(t) order by id) from auth.users t),
    (select jsonb_agg(to_jsonb(t) order by id) from public.crm_customers t),
    (select jsonb_agg(to_jsonb(t) order by id) from public.asanas t),
    (select jsonb_agg(to_jsonb(t) order by id) from storage.buckets t)
  ));`)
  const baseline = snapshot()
  const photo = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#345678' } }).webp().toBuffer()
  const path = id => `${owner}/${id}.webp`
  const state = id => sql(`select concat_ws('|',state,(reclaim_started_at is not null)::text,actual_bytes) from asana_image_private.reservations where request_id='${id}';`)
  const settle = (id, action) => sql(`select public.asana_image_settle('${owner}','${id}','${path(id)}','${action}');`)
  const attach = id => `insert into public.asanas (user_id,title,private_image_path) values ('${owner}','Maintenance fixture','${path(id)}');`
  async function reserve(targetState, withObject = true) {
    const id = randomUUID()
    // Each scenario isolates its rolling frequency and in-flight setup.
    assert.equal(sql(`select public.asana_image_reserve('${owner}','${id}')->>'status';`), 'held')
    if (targetState !== 'held') assert.equal(settle(id, 'start'), 'writing')
    if (withObject) assert.equal((await bucket.upload(path(id), photo, { contentType: 'image/webp', upsert: false })).error, null)
    if (targetState === 'confirmed') assert.equal(settle(id, 'confirm'), 'confirmed')
    if (targetState === 'uncertain') assert.equal(settle(id, 'uncertain'), 'uncertain')
    sql(`update asana_image_private.attempts set attempted_at=now()-interval '1 hour' where request_id='${id}';`)
    return id
  }
  const age = id => sql(`update asana_image_private.reservations set updated_at=now()-interval '25 hours' where request_id='${id}';`)
  const unmanaged = path(randomUUID())
  assert.equal((await bucket.upload(unmanaged, photo, { contentType: 'image/webp', upsert: false })).error, null)
  assert.equal((await client.storage.from('asana-images').upload('unmanaged-fixture.webp', photo, {
    contentType: 'image/webp', upsert: false,
  })).error, null)
  const young = await reserve('confirmed')
  assert.equal(call('claim', young), 'protected')
  const old = await reserve('confirmed')
  age(old)
  sql(attach(old))
  assert.equal(call('claim', old), 'protected')
  sql("delete from public.asanas where title='Maintenance fixture';")
  assert.equal(call('claim', old), 'protected')
  sql(`update asana_image_private.reservations set unreferenced_since=now()-interval '25 hours' where request_id='${old}';`)
  const beforeDryRun = sql('select md5(jsonb_agg(to_jsonb(r) order by request_id)::text) from asana_image_private.reservations r;')
  assert.equal((await maintainImages(client)).reclaim_count, 1)
  assert.equal((await maintainImages(client)).reclaim_bytes, photo.length)
  assert.equal(sql('select md5(jsonb_agg(to_jsonb(r) order by request_id)::text) from asana_image_private.reservations r;'), beforeDryRun)

  const concurrentClaim = new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', 'crm-step1-acceptance-db-1', 'psql',
      '-U', 'postgres', '-XqAt', '-v', 'ON_ERROR_STOP=1'])
    child.stdout.resume()
    child.stderr.resume()
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error('Fixture claim failed')))
    child.stdin.end(`set application_name='image-fixture-claim'; begin;
      select public.asana_image_maintenance('claim','${old}');
      select pg_sleep(2); commit;`)
  })
  for (let attempt = 0; attempt < 8; attempt++) {
    if (sql("select exists(select 1 from pg_stat_activity where application_name='image-fixture-claim' and wait_event='PgSleep');") === 't') break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  try {
    sql("set lock_timeout='100ms';" + attach(old), /lock timeout/)
  } finally {
    await concurrentClaim
  }
  // Force a failed delete and prove the committed marker fences new references.
  const simulated = remove => ({
    rpc: client.rpc.bind(client),
    storage: {
      getBucket: client.storage.getBucket.bind(client.storage),
      from: () => ({ info: bucket.info.bind(bucket), remove }),
    },
  })
  assert.equal((await maintainImages(simulated(async () => ({ error: { status: 503 } })), 'reclaim')).stopped, true)
  assert.equal(state(old), `confirmed|true|${photo.length}`)
  sql(attach(old), /Private image is unavailable/)
  assert.equal(call('finish', old), 'needs_review')
  assert.equal(call('claim', old), 'claimed')
  const lostResponse = simulated(async paths => {
    assert.equal((await bucket.remove(paths)).error, null)
    throw new Error('fixture response lost')
  })
  lostResponse.rpc = (fn, args) => args.p_action === 'finish'
    ? Promise.resolve({ error: { code: 'fixture' } }) : client.rpc(fn, args)
  assert.equal((await maintainImages(lostResponse, 'reclaim')).stopped, true)
  assert.equal(state(old), `confirmed|true|${photo.length}`)
  assert.equal(sql(`select mismatched_confirmed from asana_image_private.usage_totals('${owner}');`), '1')
  let duplicateDeletes = 0
  assert.deepEqual(await maintainImages(simulated(async () => { duplicateDeletes++ }), 'reclaim'), {
    processed: 1, released: 1, confirmed: 0, skipped: 0, stopped: false,
  })
  assert.equal(duplicateDeletes, 0)
  assert.equal(state(old), 'released|true')
  assert.equal((await maintainImages(client, 'reclaim')).processed, 0)
  assert.equal(call('finish', old), 'released')
  sql(rollback, /retain Stage C/)

  const held = await reserve('held', false)
  sql(`update asana_image_private.reservations set created_at=now()-interval '2 hours', expires_at=now()-interval '1 hour' where request_id='${held}';`)
  const pending = await reserve('uncertain', true)
  assert.equal((await maintainImages(client, 'recover')).released, 1)
  assert.equal(state(pending), `confirmed|false|${photo.length}`)
  const unknown = await reserve('writing', false)
  assert.equal(call('claim', unknown), 'protected')
  assert.equal((await maintainImages(client)).pending_review_count, 1)
  assert.equal((await maintainImages(client, 'recover')).processed, 0)
  assert.equal(state(unknown), 'writing|false')
  assert.equal(sql(`select user_reserved,mismatched_confirmed from asana_image_private.usage_totals('${owner}');`), '5242880|0')
  sql(`update asana_image_private.attempts set attempted_at=now()-interval '8 days' where request_id='${old}';`)
  assert.equal((await maintainImages(client)).old_attempt_count, 1)
  assert.deepEqual(await maintainImages(client, 'prune'), { status: 'pruned', count: 1 })
  assert.equal((await maintainImages(client, 'prune')).count, 0)
  assert.equal(sql(`select count(*) from asana_image_private.attempts where request_id in ('${young}','${pending}','${unknown}');`), '3')
  assert.equal(snapshot(), baseline)
  assert.equal((await bucket.download(path(young))).data.size, photo.length)
  assert.equal((await bucket.download(unmanaged)).data.size, photo.length)
  assert.equal((await client.storage.from('asana-images').download('unmanaged-fixture.webp')).data.size, photo.length)
})
