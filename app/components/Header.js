'use client'

import { useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabaseClient'
import { useAuth } from './AuthProvider'
import { PLAN_UI } from '@/lib/planUI'

export default function Header() {
  const [open, setOpen] = useState(false)
  const { profile } = useAuth()

async function handleLogout() {
  await supabase.auth.signOut()
  window.location.href = '/login'
}

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">

          <Link href="/" className="group">
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-violet-100 text-xl shadow-sm transition group-hover:scale-105">
                🪷
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-wide text-gray-800">
                  Asana Dictionary
                </h1>

                <p className="text-[11px] tracking-[0.2em] text-gray-400">
                  YOGA SEQUENCE APP
                </p>
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-2xl border border-gray-200 bg-white/90 px-4 py-2 text-sm text-gray-600 shadow-sm transition hover:scale-105 hover:bg-gray-50"
          >
            ☰
          </button>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-72 bg-white p-6 shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold">🪷</p>

            <h2 className="text-xl font-bold tracking-wide">
              Asana Dictionary
            </h2>

            <p className="text-sm text-gray-500">
              Yoga Asana App
            </p>

            {profile && (
  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
    <p className="text-sm font-bold text-gray-800">
      {profile.display_name}
    </p>

    <p className="text-xs text-gray-500">
      {profile.email}
    </p>

    <div
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        PLAN_UI[profile.plan]?.badge
      }`}
    >
      {PLAN_UI[profile.plan]?.label || 'Free'}
    </div>
  </div>
)}

          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-gray-200 px-3 py-1 text-gray-500"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-col gap-4 text-lg">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            🏠 ホーム
          </Link>

          <Link
            href="/asanas"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            📚 アーサナ一覧
          </Link>

          <Link
            href="/asana-create"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            ➕ アーサナ登録
          </Link>

          <Link
            href="/sequences"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            🧘‍♀️ シークエンス
          </Link>

          <Link
            href="/mypage"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 transition hover:bg-sky-50 hover:text-sky-700"
          >
            👤 マイページ
          </Link>

          <div className="mt-6 border-t pt-6">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-gray-400">
              Support
            </p>

            <div className="flex flex-col gap-2 text-sm">
              <Link
                href="/guide"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-600 transition hover:bg-orange-50 hover:text-orange-600"
              >
                📖 使い方ガイド
              </Link>

              <Link
                href="/disclaimer"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-600 transition hover:bg-gray-100"
              >
                ⚠️ 免責事項
              </Link>

              <Link
                href="/privacy"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-600 transition hover:bg-purple-50 hover:text-purple-700"
              >
                🔒 プライバシーポリシー
              </Link>

              <button
  type="button"
  onClick={handleLogout}
  className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
>
  🚪 ログアウト
</button>

            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}