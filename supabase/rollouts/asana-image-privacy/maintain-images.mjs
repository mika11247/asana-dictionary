import { createClient } from '@supabase/supabase-js'
import { pathToFileURL } from 'node:url'
import { privateBucket } from '../../../lib/asana-image-config.mjs'

const privatePath = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.webp$/

async function objectPresent(bucket, path) {
  const { data, error } = await bucket.info(path)
  if (!error && data) return true
  // Managed/older Storage can wrap an object-not-found code in HTTP 400.
  if (error?.statusCode === 'NoSuchKey' || String(error?.statusCode) === '404' ||
      Number(error?.status) === 404) return false
  throw new Error('storage_status_unknown')
}

export async function maintainImages(client, action = 'inspect') {
  async function rpc(p_action, p_request) {
    const { data, error } = await client.rpc('asana_image_maintenance', { p_action, p_request })
    if (error || !data) throw new Error('maintenance_rpc_failed')
    return data
  }

  if (action === 'prune') return rpc('prune')
  const { reclaim_ids, recovery_ids, ...summary } = await rpc('inspect')
  if (action === 'inspect') return summary
  if (!['reclaim', 'recover'].includes(action)) throw new Error('invalid_action')

  const ids = action === 'reclaim' ? reclaim_ids : recovery_ids
  const { data: bucketSettings, error: bucketError } = await client.storage.getBucket(privateBucket)
  if (bucketError || bucketSettings?.id !== privateBucket || bucketSettings.public !== false) {
    throw new Error('private_bucket_unavailable')
  }
  const bucket = client.storage.from(privateBucket)
  const result = { processed: 0, released: 0, confirmed: 0, skipped: 0, stopped: false }
  for (const id of ids.slice(0, 10)) {
    try {
      const probe = await rpc(action === 'reclaim' ? 'claim' : 'recovery_probe', id)
      let status = probe.status
      if (status === 'claimed' || status === 'verify_object') {
        if (!privatePath.test(probe.path) || !probe.path.endsWith('/' + id + '.webp')) {
          throw new Error('invalid_path')
        }
      }
      if (status === 'claimed') {
        if (await objectPresent(bucket, probe.path)) {
          // A failed or lost response is safe only if a fresh probe proves absence.
          try { await bucket.remove([probe.path]) } catch { /* Verify below. */ }
          if (await objectPresent(bucket, probe.path)) throw new Error('delete_unconfirmed')
        }
        status = (await rpc('finish', id)).status
        if (status !== 'released') throw new Error('release_unconfirmed')
      } else if (status === 'verify_object') {
        const { data, error } = await bucket.download(probe.path, {}, { cache: 'no-store' })
        if (error || !data || data.size !== probe.bytes) throw new Error('recovery_object_unconfirmed')
        status = (await rpc('recover', id)).status
      } else if (status === 'expired_held') {
        status = (await rpc('recover', id)).status
      }
      if (status === 'released' || status === 'confirmed') result[status]++
      else result.skipped++
      result.processed++
    } catch {
      result.stopped = true
      break
    }
  }
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [action = 'inspect', production, ...extra] = process.argv.slice(2)
    const origin = process.env.ASANA_MAINTENANCE_URL
    const productionOrigin = origin === 'https://wjmjcwakiirkhofytggl.supabase.co'
    const localOrigin = origin === 'http://127.0.0.1:35433'
    if ((!productionOrigin && !localOrigin) || extra.length ||
        !['inspect', 'reclaim', 'recover', 'prune'].includes(action) ||
        (production !== undefined && production !== '--production') ||
        (productionOrigin && action !== 'inspect' && production !== '--production')) {
      throw new Error('invalid_invocation')
    }
    const client = createClient(origin, process.env.ASANA_MAINTENANCE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store', signal: AbortSignal.timeout(15000) }) },
    })
    const result = await maintainImages(client, action)
    console.log(JSON.stringify(result))
    if (result.stopped) process.exitCode = 1
  } catch {
    console.error('Image maintenance stopped. No request details were logged.')
    process.exitCode = 1
  }
}
