'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const isSignup = mode === 'signup'

  async function handleSubmit(e) {
    e.preventDefault()

    if (!email || !password) {
      alert('メールアドレスとパスワードを入力してください')
      return
    }

    setLoading(true)

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      setLoading(false)

      if (error) {
        alert(error.message)
        return
      }

      alert('確認メールを送信しました')
      setMode('login')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    window.location.href = '/'
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <p className="mb-2 text-sm font-medium text-violet-500">
          Asana Dictionary
        </p>

        <h1 className="text-3xl font-bold text-gray-800">
          {isSignup ? '新規登録' : 'ログイン'}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          {isSignup
            ? 'アカウントを作成して、あなただけのアーサナ辞書を育てよう'
            : 'ログインして、アーサナ辞書とシークエンスを管理しよう'}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              !isSignup
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400'
            }`}
          >
            ログイン
          </button>

          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              isSignup
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400'
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:border-sky-300"
          />

          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:border-sky-300"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {loading
              ? '読み込み中...'
              : isSignup
                ? 'アカウントを作成'
                : 'ログイン'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">または</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-bold text-gray-700 transition hover:bg-gray-50"
        >
          Googleで続ける
        </button>

        {isSignup && (
          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            登録後、確認メールが届く場合があります。メール内のリンクを開いてからログインしてください。
          </p>
        )}
      </div>
    </main>
  )
}