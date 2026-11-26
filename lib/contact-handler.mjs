import { randomUUID } from 'node:crypto'
import { validateContact } from './contact-fields.mjs'

const maxBytes = 32 * 1024

async function readContact(request) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') return { status: 415, error: '送信形式が正しくありません。' }
  if (!request.body) return { status: 400, error: 'お問い合わせを入力してください。' }

  const reader = request.body.getReader()
  const bytes = new Uint8Array(maxBytes)
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value.byteLength > maxBytes - length) {
        void reader.cancel().catch(() => {})
        return { status: 413, error: '送信内容が大きすぎます。' }
      }
      bytes.set(value, length)
      length += value.byteLength
    }
    return validateContact(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length))))
  } catch {
    return { status: 400, error: '送信内容を読み取れませんでした。' }
  } finally {
    reader.releaseLock()
  }
}

export async function handleContact(request, send, log = console.error) {
  const requestId = randomUUID()
  const { contact, status, error } = await readContact(request)
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId }
  if (!contact) return Response.json({ error }, { status: status ?? 400, headers })

  let reason
  try {
    const result = await send(contact)
    if (result?.data?.id && !result.error) return Response.json({ ok: true }, { headers })
    reason = 'provider_rejected'
  } catch {
    reason = 'provider_exception'
  }
  log('contact_send_failed', { requestId, reason })
  return Response.json({
    error: '送信を確認できませんでした。時間をおいて再度お試しください。',
    requestId,
  }, { status: 502, headers })
}
