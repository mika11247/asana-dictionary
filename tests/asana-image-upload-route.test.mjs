import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import sharp from 'sharp'

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@supabase/supabase-js') {
      return { shortCircuit: true, url: 'data:text/javascript,export const createClient = (...args) => globalThis.fixtureClient(...args)' }
    }
    return nextResolve(specifier, context)
  },
})
const { POST } = await import('../app/api/asana-images/route.js')
hooks.deregister()

test('private upload requires a confirmed reservation transition', async t => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fixture-anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service'
  const owner = '00000000-0000-4000-8000-000000000001'
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#123456' } }).webp().toBuffer()
  const scenarios = [
    { name: 'disabled', disabled: true, status: 404, steps: [] },
    { name: 'unauthorized', unauthorized: true, status: 401, steps: [] },
    { name: 'oversize', body: Buffer.alloc(4 * 1024 * 1024 + 1), status: 413, steps: [] },
    { name: 'invalid WebP', body: Buffer.from('not WebP'), status: 415, steps: ['reserve', 'release'] },
    { name: 'rate limit', decision: 'rate_minute', status: 429, steps: ['reserve'] },
    { name: 'concurrency limit', decision: 'in_flight', status: 429, steps: ['reserve'] },
    { name: 'capacity limit', decision: 'user_capacity', status: 409, steps: ['reserve'] },
    { name: 'invalid reservation path', wrongPath: true, status: 503, steps: ['reserve'] },
    { name: 'replayed request', replayed: true, status: 503, steps: ['reserve'] },
    { name: 'unconfirmed start', stop: 'start', status: 503, steps: ['reserve', 'start'] },
    { name: 'successful upload', status: 201, steps: ['reserve', 'start', 'upload', 'confirm'] },
    { name: 'definitive rejection', uploadStatus: 413, status: 413, steps: ['reserve', 'start', 'upload', 'failed'] },
    { name: 'transport failure', uploadStatus: 'throw', status: 503, steps: ['reserve', 'start', 'upload', 'uncertain'] },
    { name: 'confirmation unavailable', stop: 'confirm', status: 503, steps: ['reserve', 'start', 'upload', 'confirm', 'uncertain'] },
  ]
  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      process.env.NEXT_PUBLIC_PRIVATE_ASANA_UPLOADS = scenario.disabled ? 'false' : 'true'
      const steps = []
      let path
      globalThis.fixtureClient = (_url, key) => key === 'fixture-anon' ? {
        auth: { getUser: async () => ({ data: { user: scenario.unauthorized ? null : { id: owner } } }) },
      } : {
        rpc: async (name, { p_owner, p_request, p_path, p_action }) => {
          assert.equal(p_owner, owner)
          if (name === 'asana_image_reserve') {
            steps.push('reserve')
            path = `${owner}/${p_request}.webp`
            return { data: { status: scenario.decision ?? 'held', path: scenario.wrongPath ? 'wrong/path.webp' : path,
              replayed: scenario.replayed, request_bytes: 4194304 } }
          }
          assert.equal(name, 'asana_image_settle')
          assert.equal(p_path, path)
          steps.push(p_action)
          if (scenario.stop === p_action) return { error: { code: 'fixture' } }
          return { data: { start: 'writing', confirm: 'confirmed' }[p_action] ?? 'released' }
        },
        storage: { from: bucket => ({ upload: async (target, _data, options) => {
          assert.equal(bucket, 'asana-images-private')
          assert.equal(target, path)
          assert.equal(options.upsert, false)
          steps.push('upload')
          if (scenario.uploadStatus === 'throw') throw new Error('fixture')
          return { error: scenario.uploadStatus ? { statusCode: scenario.uploadStatus } : null }
        } }) },
      }
      const response = await POST(new Request('http://localhost/api/asana-images', {
        method: 'POST', headers: { authorization: 'Bearer fixture', 'content-type': 'image/webp' },
        body: scenario.body ?? image,
      }))
      assert.equal(response.status, scenario.status)
      assert.deepEqual(steps, scenario.steps)
      if (scenario.status === 201) assert.deepEqual(await response.json(), { path })
    })
  }
})
