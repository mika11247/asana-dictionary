import assert from 'node:assert/strict'
import test from 'node:test'
import { handleContact } from '../lib/contact-handler.mjs'

const valid = { category: 'その他', email: 'test@example.com', message: '合成本文' }
const request = (body, type = 'application/json') =>
  new Request('http://localhost/api/contact', { method: 'POST', body, headers: { 'Content-Type': type } })

test('valid contact with or without a name is accepted', async () => {
  for (const fields of [valid, { ...valid, name: ' 合成名 ' }]) {
    const response = await handleContact(request(JSON.stringify(fields)), async contact => {
      assert.equal(contact.name, fields.name?.trim() ?? '')
      assert.equal(contact.email, valid.email)
      return { data: { id: 'synthetic-id' }, error: null }
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
  }
})

test('rejects malformed input, unknown categories, extra fields and honeypot before sending', async () => {
  const invalid = [
    [], null, { ...valid, category: '未知' }, { ...valid, email: [] },
    { ...valid, email: 'x@example.com\r\nother@example.com' }, { ...valid, name: '  ' },
    { ...valid, message: '　' }, { ...valid, message: 'a'.repeat(4001) },
    { ...valid, extra: true }, { ...valid, website: 'bot' },
  ]
  const neverSend = () => assert.fail('must reject before sending')
  for (const value of invalid) {
    assert.equal((await handleContact(request(JSON.stringify(value)), neverSend)).status, 400)
  }
  assert.equal((await handleContact(request('{'), neverSend)).status, 400)
  assert.equal((await handleContact(request('{}', 'text/plain'), neverSend)).status, 415)
  assert.equal((await handleContact(request('あ'.repeat(12000)), neverSend)).status, 413)
  const oversized = request('あ'.repeat(12000))
  oversized.headers.set('Content-Length', '1')
  assert.equal((await handleContact(oversized, neverSend)).status, 413)
})

test('provider failures only log a reason and a matching correlation ID', async () => {
  const secret = 'synthetic secret / private-email@example.com / 私的本文'
  for (const [send, expected] of [
    [async () => ({ data: null, error: { message: secret } }), 'provider_rejected'],
    [async () => ({}), 'provider_rejected'],
    [async () => { throw new Error(secret) }, 'provider_exception'],
  ]) {
    const logs = []
    const response = await handleContact(request(JSON.stringify(valid)), send, (...args) => logs.push(args))
    const requestId = response.headers.get('X-Request-Id')
    assert.equal(response.status, 502)
    assert.equal((await response.json()).requestId, requestId)
    assert.deepEqual(logs, [['contact_send_failed', { requestId, reason: expected }]])
    assert.doesNotMatch(JSON.stringify(logs), /synthetic secret|example\.com|合成本文|私的本文/)
  }
})
