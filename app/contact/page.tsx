'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [category, setCategory] = useState('不具合報告')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSent(false)

    if (!email.trim() || !message.trim()) {
      setError('メールアドレスとお問い合わせ内容を入力してください。')
      return
    }

    try {
      setLoading(true)

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, email, message }),
      })

      const text = await res.text()

let data: { error?: string } = {}

try {
  data = JSON.parse(text)
} catch {
  console.log('APIからJSON以外が返ってきました:', text)
  throw new Error('送信先APIが見つかりません。/app/api/contact/route.js の場所を確認してください。')
}

if (!res.ok) {
  throw new Error(data.error || '送信に失敗しました。')
}

      setSent(true)
      setCategory('不具合報告')
      setEmail('')
      setMessage('')
    } catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : '送信に失敗しました。'
  )
} finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium tracking-wide text-sky-500">
            Contact
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-800">
            お問い合わせ 📩
          </h1>

          <p className="mt-3 text-sm leading-7 text-gray-500">
            不具合報告・ご要望・使い方についてのお問い合わせはこちらから送信できます。
          </p>

          <div className="mt-5 rounded-2xl bg-sky-50 p-4">
            <p className="text-sm font-semibold text-sky-700">
              こんな内容はこちらからどうぞ
            </p>

            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p>・不具合報告</p>
              <p>・機能リクエスト</p>
              <p>・使い方について</p>
              <p>・アカウント関連</p>
              <p>・その他お問い合わせ</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-600">
              退会申請中アカウントの復旧について
            </p>

            <p className="mt-2 text-sm leading-relaxed text-red-500">
              誤って退会申請をしてしまった場合は、
              こちらからご連絡ください。
              <br />
              状況確認後、復旧対応を行います。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700">
                お問い合わせ種別
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-sky-300"
              >
                <option>不具合報告</option>
                <option>機能リクエスト</option>
                <option>使い方について</option>
                <option>アカウント関連</option>
                <option>退会申請中アカウントの復旧</option>
                <option>その他</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="返信先のメールアドレス"
                className="mt-2 w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-sky-300"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                お問い合わせ内容
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                placeholder="できるだけ詳しくご記入ください。"
                className="mt-2 w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm leading-7 text-gray-700 outline-none focus:border-sky-300"
              />
            </div>

            {error && (
              <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-500">
                {error}
              </p>
            )}

            {sent && (
              <p className="rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-600">
                送信しました。お問い合わせありがとうございます。
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-2xl bg-sky-500 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-sky-600 disabled:opacity-60"
            >
              {loading ? '送信中...' : '送信する'}
            </button>
          </form>

          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            ※現在、退会後14日間は復旧対応可能です。
          </p>
        </section>
      </div>
    </main>
  )
}