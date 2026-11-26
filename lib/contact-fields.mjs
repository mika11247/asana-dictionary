export const categories = [
  '不具合報告', '機能リクエスト', '使い方について', 'アカウント関連',
  '退会申請中アカウントの復旧', 'その他',
]

export const limits = { name: 100, email: 254, message: 4000, website: 256 }

const fields = new Set(['category', ...Object.keys(limits)])
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/

export function validateContact(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !fields.has(key))) {
    return { error: 'お問い合わせの入力形式が正しくありません。' }
  }

  const { category, name = '', email, message, website = '' } = body
  if (!categories.includes(category)) return { error: 'お問い合わせ種別を選択してください。' }

  for (const [key, value] of Object.entries({ name, email, message, website })) {
    if (typeof value !== 'string' || value.length > limits[key]) {
      return { error: '入力形式または文字数をご確認ください。' }
    }
  }

  if (website.trim()) return { error: 'フォームを確認して、もう一度送信してください。' }
  if (name && (!name.trim() || /[\r\n\u0000]/.test(name))) {
    return { error: 'お名前をご確認ください。' }
  }
  if (!emailPattern.test(email.trim())) return { error: 'メールアドレスをご確認ください。' }
  if (!message.trim()) return { error: 'お問い合わせ内容を入力してください。' }

  return { contact: { category, name: name.trim(), email: email.trim(), message: message.trim() } }
}
