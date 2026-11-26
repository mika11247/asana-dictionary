import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { migrateBatch } from '../supabase/rollouts/asana-image-privacy/migrate.mjs'

const bytes = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#663399' } }).webp().toBuffer()
const candidate = {
  asana_id: 1, owner_uuid: 'fixture-user', legacy_url: 'https://example.invalid/old.webp',
  source_path: 'old.webp', destination_path: 'fixture-user/new.webp', expected_size: bytes.length,
}

function fakeClient({ destinationError = false, changed = false }) {
  const filters = []
  const query = {
    eq: (...args) => { filters.push(args); return query },
    is: (...args) => { filters.push(args); return query },
    select: async () => ({ data: changed ? [] : [{ id: 1 }] }),
  }
  return {
    filters,
    rpc: async () => ({ data: [candidate] }),
    from: () => ({ update: () => query }),
    storage: { from: bucket => ({
      upload: async () => ({ error: new Error('synthetic copy failure or existing copy') }),
      download: async () => bucket === 'asana-images' || !destinationError
        ? { data: new Blob([bytes]) } : { error: new Error('missing destination') },
    }) },
  }
}

test('copy failure leaves the original reference untouched', async () => {
  const client = fakeClient({ destinationError: true })
  assert.deepEqual(await migrateBatch(client, 'https://example.invalid', 10, true),
    { candidates: 1, migrated: 0, changed: 0, failed: 1 })
  assert.deepEqual(client.filters, [])
})

test('matching copy is reusable, but a concurrent edit prevents reference replacement', async () => {
  const client = fakeClient({ changed: true })
  assert.deepEqual(await migrateBatch(client, 'https://example.invalid', 10, true),
    { candidates: 1, migrated: 0, changed: 1, failed: 0 })
  assert.deepEqual(client.filters, [
    ['id', 1], ['user_id', 'fixture-user'],
    ['image_url', candidate.legacy_url], ['private_image_path', null],
  ])
})
