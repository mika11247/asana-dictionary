'use client'

import Link from 'next/link'

export default function MyPage() {
  return (
    <main className="min-h-screen bg-sky-50 p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
          <Link href="/" className="text-sm text-sky-600">
            ← ホームへ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-sky-800">
            My Page
          </h1>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            アカウント設定やアプリのカスタマイズ機能を、今後ここに追加していく予定です。
          </p>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
          <h2 className="text-lg font-bold text-sky-700">
            現在の状態
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            現在はログイン機能を準備中です。今後、アカウント情報やプラン情報を表示できるようにしていきます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
          <h2 className="text-lg font-bold text-sky-700">
            今後追加予定
          </h2>

          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>・ログイン機能</li>
            <li>・メールアドレス表示</li>
            <li>・ログアウト</li>
            <li>・テーマカラー変更</li>
            <li>・文字サイズ設定</li>
            <li>・プラン管理</li>
          </ul>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
          <h2 className="text-lg font-bold text-sky-700">
            アプリ情報
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            Asana Dictionary は、アーサナ辞書とシークエンス作成をサポートするヨガレッスン管理アプリです。
          </p>
        </section>
      </div>
    </main>
  )
}