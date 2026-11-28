import { supabase } from './supabaseClient'
import { privateBucket, uploadImageLimit } from './asana-image-config.mjs'
import { createAsanaImagePool } from './asana-image-pool.mjs'

export const privateUploads = process.env.NEXT_PUBLIC_PRIVATE_ASANA_UPLOADS === 'true'
const pool = createAsanaImagePool(async (path, owner, signal) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (signal.aborted || session?.user?.id !== owner) return null
  const request = new AbortController()
  const cancel = () => request.abort()
  signal.addEventListener('abort', cancel, { once: true })
  const timeout = setTimeout(cancel, 15000)
  try {
    const { data, error } = await supabase.storage.from(privateBucket).download(path, {}, {
      cache: 'no-store',
      signal: request.signal,
    })
    return error ? null : data
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', cancel)
  }
})

supabase.auth.onAuthStateChange((_event, session) => pool.setOwner(session?.user?.id ?? null))

export function acquireAsanaImage(path, owner) {
  return pool.acquire(path, owner)
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
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const messages = {
      rate_minute: '短時間のアップロード上限に達しました。1分ほど待ってからお試しください。',
      rate_day: '過去24時間のアップロード上限に達しました。時間をおいてお試しください。',
      in_flight: '他の画像を処理中です。完了してからお試しください。',
      user_capacity: '画像の保存容量が上限に達しました。',
      project_capacity: 'サービスの画像保存容量が上限に達しています。',
    }
    const message = messages[result.code] ||
      (response.status === 401 ? '再度ログインしてください。' :
        response.status === 413 ? '画像の容量が上限を超えています。' :
          response.status === 415 ? '有効なWebP画像を選んでください。' : '画像を保存できませんでした。')
    throw new Error(message)
  }
  return result.path
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
