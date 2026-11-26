import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { privateBucket, storageImageLimit } from '../../../lib/asana-image-config.mjs'
import { normalizeWebp } from '../../../lib/validate-asana-image.mjs'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')

async function readImage(bucket, path) {
  const { data, error } = await bucket.download(path)
  if (error || !data || data.size > storageImageLimit) throw new Error('download_failed')
  return Buffer.from(await data.arrayBuffer())
}

export async function migrateBatch(client, origin, limit, apply = false) {
  const result = await client.rpc('asana_image_migration_batch', { project_origin: origin, batch_size: limit })
  if (result.error) throw new Error('candidate_query_failed')
  const legacy = client.storage.from('asana-images')
  const target = client.storage.from(privateBucket)
  const counts = { candidates: result.data.length, migrated: 0, changed: 0, failed: 0 }
  if (!apply) return counts

  for (const row of result.data) {
    try {
      const source = await readImage(legacy, row.source_path)
      if (source.byteLength !== Number(row.expected_size)) throw new Error('source_size_mismatch')
      await normalizeWebp(source)
      // No upsert. A retry can reuse an existing destination only if its bytes match.
      await target.upload(row.destination_path, source, {
        contentType: 'image/webp', upsert: false, cacheControl: '0',
      })
      const copied = await readImage(target, row.destination_path)
      if (source.length !== copied.length || digest(source) !== digest(copied)) throw new Error('copy_mismatch')
      const { data, error } = await client.from('asanas')
        .update({ private_image_path: row.destination_path })
        .eq('id', row.asana_id).eq('user_id', row.owner_uuid)
        .eq('image_url', row.legacy_url).is('private_image_path', null).select('id')
      if (error) throw new Error('reference_update_failed')
      if (data.length === 1) counts.migrated++
      else counts.changed++
    } catch {
      counts.failed++
    }
  }
  return counts
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const url = new URL(process.env.ASANA_MIGRATION_ORIGIN)
    if (url.href !== url.origin + '/' ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1'))) {
      throw new Error('invalid_origin')
    }
    const key = process.env.ASANA_MIGRATION_SERVICE_KEY
    if (!key) throw new Error('missing_key')
    const limit = Number(process.env.ASANA_MIGRATION_BATCH ?? '10')
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error('invalid_batch')
    const apply = process.argv.includes('--apply')
    if (apply && process.env.ASANA_MIGRATION_CONFIRM_ORIGIN !== url.origin) throw new Error('confirmation_required')
    const client = createClient(url.origin, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const counts = await migrateBatch(client, url.origin, limit, apply)
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...counts }))
    if (counts.failed || counts.changed) process.exitCode = 1
  } catch {
    console.error('Image migration stopped. Check target configuration and permissions.')
    process.exitCode = 1
  }
}
