'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            Asana Dictionary
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded border px-3 py-2 text-sm"
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
            <p className="text-sm text-gray-500">Yoga Asana App</p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border px-3 py-1"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-col gap-4 text-lg">
  <Link href="/" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 transition hover:bg-gray-100">
    🏠 ホーム
  </Link>

  <Link href="/asanas" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 transition hover:bg-gray-100">
    📚 アーサナ一覧
  </Link>

  <Link href="/asana-create" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 transition hover:bg-gray-100">
    ➕ アーサナ登録
  </Link>

  <Link href="/sequences" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 transition hover:bg-gray-100">
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
  </div>
</div>

</nav>
      </aside>
    </>
  )
}