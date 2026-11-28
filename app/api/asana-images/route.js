import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { privateBucket, storageImageLimit, uploadImageLimit } from '../../../lib/asana-image-config.mjs'
import { normalizeWebp } from '../../../lib/validate-asana-image.mjs'

export const runtime = 'nodejs'

function reply(status, body) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request) {
  if (process.env.NEXT_PUBLIC_PRIVATE_ASANA_UPLOADS !== 'true') return reply(404, {})
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1]
  if (!token) return reply(401, {})
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return reply(503, {})
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  const auth = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options)
  const { data: { user }, error } = await auth.auth.getUser(token)
  if (error || !user || user.is_anonymous) return reply(401, {})
  if (request.headers.get('content-type') !== 'image/webp') return reply(415, {})
  if (!request.body) return reply(400, {})
  if (Number(request.headers.get('content-length')) > uploadImageLimit) return reply(413, {})

  const reader = request.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > uploadImageLimit) {
        void reader.cancel().catch(() => {})
        return reply(413, {})
      }
      chunks.push(value)
    }
  } catch {
    return reply(400, {})
  } finally {
    reader.releaseLock()
  }

  const requestId = randomUUID()
  const path = `${user.id}/${requestId}.webp`
  const admin = createClient(url, serviceKey, options)
  const { data: reservation, error: reserveError } = await admin.rpc('asana_image_reserve', {
    p_owner: user.id, p_request: requestId,
  })
  if (reserveError || !reservation) return reply(503, {})
  if (['rate_minute', 'rate_day', 'in_flight'].includes(reservation.status)) {
    return reply(429, { code: reservation.status })
  }
  if (['user_capacity', 'project_capacity'].includes(reservation.status)) {
    return reply(409, { code: reservation.status })
  }
  if (reservation.status === 'account_unavailable') return reply(403, {})
  if (reservation.status !== 'held' || reservation.path !== path || reservation.replayed) return reply(503, {})

  async function settle(action) {
    try {
      const { data, error } = await admin.rpc('asana_image_settle', {
        p_owner: user.id, p_request: requestId, p_path: path, p_action: action,
      })
      return error ? null : data
    } catch {
      return null
    }
  }

  if (size > reservation.request_bytes) {
    await settle('release')
    return reply(413, {})
  }
  let image
  try {
    image = await normalizeWebp(Buffer.concat(chunks))
  } catch {
    await settle('release')
    return reply(415, {})
  }
  if (image.length > storageImageLimit) {
    await settle('release')
    return reply(413, {})
  }
  // An unconfirmed start must never trigger a Storage write.
  if (await settle('start') !== 'writing') return reply(503, {})
  const storage = admin.storage.from(privateBucket)
  try {
    const { error: uploadError } = await storage.upload(path, image, {
      contentType: 'image/webp', upsert: false, cacheControl: '0',
    })
    if (uploadError) {
      const status = Number(uploadError.statusCode ?? uploadError.status)
      await settle([413, 415].includes(status) ? 'failed' : 'uncertain')
      return reply(status === 413 ? 413 : status === 415 ? 415 : 503, {})
    }
  } catch {
    await settle('uncertain')
    return reply(503, {})
  }
  if (await settle('confirm') !== 'confirmed') {
    await settle('uncertain')
    return reply(503, {})
  }
  return reply(201, { path })
}
