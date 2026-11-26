import { supabase } from './supabaseClient'
import { privateBucket, uploadImageLimit } from './asana-image-config.mjs'

export const privateUploads = process.env.NEXT_PUBLIC_PRIVATE_ASANA_UPLOADS === 'true'
const lifetime = 300
const cache = new Map()
let generation = 0
let queued = new Map()
let scheduled = false

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    generation++
    cache.clear()
    for (const resolve of queued.values()) resolve(null)
    queued.clear()
  }
})

async function signQueued() {
  scheduled = false
  const batch = queued
  queued = new Map()
  const current = generation
  const { data: { session } } = await supabase.auth.getSession()
  const paths = [...batch.keys()].filter(path => path.split('/')[0] === session?.user?.id)
  const signed = new Map()
  for (let offset = 0; offset < paths.length && current === generation; offset += 50) {
    const { data } = await supabase.storage.from(privateBucket).createSignedUrls(paths.slice(offset, offset + 50), lifetime)
    for (const row of data ?? []) {
      if (row.signedUrl && !row.error) signed.set(row.path, row.signedUrl)
    }
  }
  for (const [path, resolve] of batch) {
    const url = current === generation ? signed.get(path) ?? null : null
    if (url) cache.set(path, { url, expires: Date.now() + (lifetime - 30) * 1000 })
    resolve(url)
  }
}

export function signAsanaImage(path, refresh = false) {
  const cached = cache.get(path)
  if (!refresh && cached?.expires > Date.now()) return Promise.resolve(cached.url)
  return new Promise(resolve => {
    const previous = queued.get(path)
    queued.set(path, previous ? value => { previous(value); resolve(value) } : resolve)
    if (scheduled) return
    scheduled = true
    setTimeout(() => {
      const pending = queued
      void signQueued().catch(() => {
        for (const finish of pending.values()) finish(null)
      })
    }, 0)
  })
}

export async function uploadPrivateAsanaImage(file) {
  if (file.type !== 'image/webp' || file.size > uploadImageLimit) {
    throw new Error('WebP画像を4 MiB以下にしてから保存してください。')
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('再度ログインしてください。')
  const response = await fetch('/api/asana-images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'image/webp' },
    body: file,
  })
  if (!response.ok) throw new Error('画像を保存できませんでした。')
  return (await response.json()).path
}

export async function waitForAsanaPrintImages(root) {
  if (!root) return false
  const images = [...root.querySelectorAll('img')]
  for (const image of images) image.dispatchEvent(new Event('prepare-asana-print'))
  const deadline = Date.now() + 5000
  while (images.some(image => !image.complete || !image.naturalWidth)) {
    if (Date.now() >= deadline) return false
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return true
}
