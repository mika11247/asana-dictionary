import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { migrateBatch } from './migrate.mjs'

function fixtureToken(role, claims = {}) {
  const part = data => Buffer.from(JSON.stringify(data)).toString('base64url')
  const body = `${part({ typ: 'JWT', alg: 'HS256' })}.${part({ role, exp: 4102444800, ...claims })}`
  return body + '.' + createHmac('sha256', 'crm-acceptance-local-only-signing-secret').update(body).digest('base64url')
}

export const serviceToken = fixtureToken('service_role')

export async function uploadFixtureImage(appOrigin, session) {
  assert.equal(appOrigin, 'http://127.0.0.1:35430')
  const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#446688' } }).webp().toBuffer()
  const response = await fetch(appOrigin + '/api/asana-images', {
    method: 'POST', body: image,
    headers: { 'content-type': 'image/webp', authorization: `Bearer ${session.access_token}` },
  })
  assert.equal(response.status, 201)
  return (await response.json()).path
}

export async function verifyImages({ sessions, appOrigin, gatewayOrigin, compatibility = false }) {
  assert.equal(gatewayOrigin, 'http://127.0.0.1:35433')
  assert.equal(appOrigin, 'http://127.0.0.1:35430')
  const [a, b] = sessions
  const options = token => ({
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const client = token => createClient(gatewayOrigin, token, options(token))
  const admin = client(serviceToken)
  const owner = client(a.access_token)
  const other = client(b.access_token)
  const anon = client(fixtureToken('anon'))
  const bucket = 'asana-images-private'
  const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#6340cb' } }).webp().toBuffer()
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#6340cb' } }).png().toBuffer()
  const mime = { contentType: 'image/webp', upsert: false }
  const upload = (body, contentType = 'image/webp', token = a.access_token) => fetch(appOrigin + '/api/asana-images', {
    method: 'POST', body, headers: { 'content-type': contentType, ...(token ? { authorization: `Bearer ${token}` } : {}) },
  })
  if (compatibility) {
    assert.equal((await upload(image)).status, 404)
    const path = a.user.id + '/00000000-0000-4000-8000-000000000001.webp'
    assert.equal((await admin.storage.from(bucket).upload(path, image, mime)).error, null)
    const legacy = owner.storage.from('asana-images')
    assert.equal((await legacy.upload('fixture.webp', image, mime)).error, null)
    assert.equal((await owner.from('asanas').update({
      image_url: legacy.getPublicUrl('fixture.webp').data.publicUrl, private_image_path: path,
    }).eq('user_id', a.user.id)).error, null)
    assert.ok((await other.storage.from(bucket).download(path)).error)
    assert.ok((await anon.storage.from(bucket).download(path)).error)
    return
  }
  assert.equal((await upload(image, 'image/webp', null)).status, 401)
  assert.equal((await upload(png, 'image/png')).status, 415)
  assert.equal((await upload(png)).status, 415)
  assert.equal((await upload(Buffer.alloc(4 * 1024 * 1024 + 1))).status, 413)
  const response = await upload(image)
  assert.equal(response.status, 201)
  const { path } = await response.json()
  assert.equal(path.split('/')[0], a.user.id)
  const initialDownload = await owner.storage.from(bucket).download(path)
  assert.equal(initialDownload.error, null)
  const uploadedBytes = Buffer.from(await initialDownload.data.arrayBuffer())
  if (process.argv.includes('--private-images-no-sign')) {
    const single = await owner.storage.from(bucket).createSignedUrl(path, 30)
    assert.ok(single.error)
    const multiple = await owner.storage.from(bucket).createSignedUrls([path], 30)
    assert.ok(multiple.error || (multiple.data?.length === 1 && !multiple.data[0].signedUrl))
  }
  for (const denied of [other, anon]) {
    assert.ok((await denied.storage.from(bucket).download(path)).error)
    assert.ok((await denied.storage.from(bucket).createSignedUrl(path, 300)).error)
    await denied.storage.from(bucket).remove([path])
    assert.equal((await owner.storage.from(bucket).download(path)).error, null)
  }
  assert.ok((await owner.storage.from(bucket).upload(path, image, { ...mime, upsert: true })).error)
  assert.ok((await other.storage.from(bucket).upload(path, image, mime)).error)
  assert.ok((await admin.storage.from(bucket).upload(a.user.id + '/bad.png', png, { contentType: 'image/png' })).error)
  assert.ok((await admin.storage.from(bucket).upload(a.user.id + '/large.webp', Buffer.alloc(5 * 1024 * 1024 + 1), mime)).error)
  assert.ok((await other.from('asanas').update({ private_image_path: path }).eq('user_id', b.user.id)).error)

  const expired = client(fixtureToken('authenticated', { sub: a.user.id, exp: 1 }))
  assert.ok((await expired.storage.from(bucket).download(path, {}, { cache: 'no-store' })).error)
  const retried = await owner.storage.from(bucket).download(path, {}, { cache: 'no-store' })
  assert.equal(retried.error, null)
  assert.deepEqual(Buffer.from(await retried.data.arrayBuffer()), uploadedBytes)
  assert.equal((await owner.storage.from(bucket).remove([path])).error, null)
  assert.ok((await owner.storage.from(bucket).download(path)).error)

  const old = owner.storage.from('asana-images')
  assert.equal((await old.upload('fixture.webp', image, mime)).error, null)
  const legacy = old.getPublicUrl('fixture.webp').data.publicUrl
  assert.equal((await fetch(legacy)).status, 200)
  assert.equal((await owner.from('asanas').update({ image_url: legacy }).eq('user_id', a.user.id)).error, null)
  assert.equal((await other.from('asanas').update({ image_url: legacy }).eq('user_id', b.user.id)).error, null)
  assert.deepEqual(await migrateBatch(admin, gatewayOrigin, 10), { candidates: 1, migrated: 0, changed: 0, failed: 0 })
  assert.deepEqual(await migrateBatch(admin, gatewayOrigin, 10, true), { candidates: 1, migrated: 1, changed: 0, failed: 0 })
  assert.deepEqual(await migrateBatch(admin, gatewayOrigin, 10, true), { candidates: 0, migrated: 0, changed: 0, failed: 0 })
  const migrated = await owner.from('asanas').select('image_url,private_image_path').eq('user_id', a.user.id).single()
  assert.equal(migrated.data.image_url, legacy)
  const copied = await owner.storage.from(bucket).download(migrated.data.private_image_path)
  assert.deepEqual(Buffer.from(await copied.data.arrayBuffer()), image)
  assert.ok((await other.storage.from(bucket).download(migrated.data.private_image_path)).error)
  await owner.storage.from(bucket).remove([migrated.data.private_image_path])
  assert.equal((await owner.storage.from(bucket).download(migrated.data.private_image_path)).error, null)
  // Remove the cross-owner fixture reference before exercising the normal member UI.
  assert.equal((await other.from('asanas').update({ image_url: null }).eq('user_id', b.user.id)).error, null)
  console.log('PASS private Storage, upload validation, limits, authorization, expired JWT denial and idempotent migration')
}
