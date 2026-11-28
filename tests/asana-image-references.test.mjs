import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const container = 'crm-step1-acceptance-db-1'
const directory = 'supabase/rollouts/asana-image-privacy'
const owner = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'

test('reference tracking is transactional and follows the last reference', async () => {
  const database = 'asana_references_' + randomUUID().replaceAll('-', '')
  const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-XqAt', '-v', 'ON_ERROR_STOP=1']
  function query(sql, expectedError, target = database) {
    const result = spawnSync('docker', [...args, '-d', target], { input: sql, encoding: 'utf8' })
    if (expectedError) {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, expectedError)
    } else {
      assert.equal(result.status, 0, result.stderr)
    }
    return result.stdout.trim()
  }
  query(`create database ${database} template template0;`, null, 'postgres')
  try {
    query(readFileSync('tests/asana-image-reservations-fixture.sql', 'utf8'))
    query(`alter table public.asanas add column user_id uuid;
      create policy asana_private_delete_unused on storage.objects for delete to authenticated using (true);
      grant delete on storage.objects to authenticated;`)
    query(readFileSync(directory + '/04-upload-reservations.sql', 'utf8'))
    query(readFileSync(directory + '/05-upload-image-references.sql', 'utf8'))
    const id = randomUUID()
    const path = owner + '/' + id + '.webp'
    const settle = action => `select public.asana_image_settle('${owner}','${id}','${path}','${action}');`
    assert.equal(query(`select public.asana_image_reserve('${owner}','${id}')->>'status';`), 'held')
    const attach = row => `insert into public.asanas (id,user_id,private_image_path) values (${row},'${owner}','${path}');`
    const detached = () => query(`select unreferenced_since is not null from asana_image_private.reservations where request_id='${id}';`)
    query(attach(2), /Private image is not confirmed/)
    assert.equal(query(settle('start')), 'writing')
    query(settle('start'), /Unsafe reservation transition/)
    query(`insert into storage.objects values ('asana-images-private','${path}','{"size":123,"mimetype":"image/webp"}');`)
    assert.equal(query(settle('confirm')), 'confirmed')
    assert.equal(detached(), 'f')
    query(attach(2).replace(owner, other), /Invalid private image reference/)
    query(attach(2) + attach(3))
    query('update public.asanas set private_image_path=null where id=2;')
    assert.equal(detached(), 'f')
    query('begin; delete from public.asanas where id=3; rollback;')
    assert.equal(detached(), 'f')
    query('delete from public.asanas where id=3;')
    assert.equal(detached(), 't')
    assert.equal(query(`set role authenticated; with deleted as (delete from storage.objects returning 1) select count(*) from deleted;`), '0')
    assert.equal(query('select count(*) from storage.objects;'), '1')
    query(attach(4))
    assert.equal(detached(), 'f')
    query(attach(5))
    query('delete from public.asanas where id in (4,5);')
    assert.equal(detached(), 't')
    query(attach(6) + attach(7))
    const concurrent = sql => new Promise((resolve, reject) => {
      const child = spawn('docker', [...args, '-d', database])
      let error = ''
      child.stderr.on('data', chunk => { error += chunk })
      child.on('error', reject)
      child.on('close', code => code === 0 ? resolve() : reject(new Error(error)))
      child.stdin.end(sql)
    })
    await Promise.all([
      concurrent('begin; delete from public.asanas where id=6; select pg_sleep(0.25); commit;'),
      concurrent('delete from public.asanas where id=7;'),
    ])
    assert.equal(detached(), 't')
    assert.equal(query(`select user_objects,user_reserved,mismatched_confirmed from asana_image_private.usage_totals('${owner}');`), '123|0|0')
  } finally {
    query(`drop database ${database};`, null, 'postgres')
  }
})
