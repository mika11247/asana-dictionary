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

  let image
  try {
    image = await normalizeWebp(Buffer.concat(chunks))
  } catch {
    return reply(415, {})
  }
  if (image.length > storageImageLimit) return reply(413, {})
  const path = `${user.id}/${randomUUID()}.webp`
  const storage = createClient(url, serviceKey, options).storage.from(privateBucket)
  const result = await storage.upload(path, image, { contentType: 'image/webp', upsert: false, cacheControl: '0' })
  return result.error ? reply(503, {}) : reply(201, { path })
}
