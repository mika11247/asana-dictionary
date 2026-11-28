import assert from 'node:assert/strict'
import test from 'node:test'
import { createAsanaImagePool } from '../lib/asana-image-pool.mjs'

const turn = () => new Promise(resolve => setImmediate(resolve))

test('shares active images, caps parallel downloads and revokes after the final lease', async () => {
  const started = []
  const revoked = []
  const pool = createAsanaImagePool(path => new Promise(resolve => started.push({ path, resolve })), {
    createObjectURL: file => 'blob:' + file,
    revokeObjectURL: url => revoked.push(url),
  }, 1)
  pool.setOwner('a')
  const first = pool.acquire('a/one', 'a')
  const duplicate = pool.acquire('a/one', 'a')
  const second = pool.acquire('a/two', 'a')
  await turn()
  assert.deepEqual(started.map(entry => entry.path), ['a/one'])
  assert.equal(await pool.acquire('b/one', 'a').url, null)
  started[0].resolve('one')
  assert.equal(await first.url, 'blob:one')
  assert.equal(await duplicate.url, 'blob:one')
  first.release()
  assert.deepEqual(revoked, [])
  duplicate.release()
  assert.deepEqual(revoked, ['blob:one'])
  await turn()
  assert.equal(started[1].path, 'a/two')
  started[1].resolve('two')
  assert.equal(await second.url, 'blob:two')
  pool.setOwner(null)
  assert.deepEqual(revoked, ['blob:one', 'blob:two'])
})

test('aborts old session downloads and allows retry after a failed request', async () => {
  const started = []
  const created = []
  const pool = createAsanaImagePool((path, owner, signal) => new Promise(resolve => {
    started.push({ path, owner, signal, resolve })
  }), {
    createObjectURL: file => { created.push(file); return 'blob:' + file },
    revokeObjectURL() {},
  })
  pool.setOwner('a')
  const stale = pool.acquire('a/one', 'a')
  await turn()
  pool.setOwner('b')
  assert.equal(started[0].signal.aborted, true)
  assert.equal(await stale.url, null)
  started[0].resolve('stale')
  const failed = pool.acquire('b/one', 'b')
  await turn()
  started[1].resolve(null)
  assert.equal(await failed.url, null)
  const retry = pool.acquire('b/one', 'b')
  await turn()
  started[2].resolve('fresh')
  assert.equal(await retry.url, 'blob:fresh')
  assert.deepEqual(created, ['fresh'])
  retry.release()
})
