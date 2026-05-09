'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-purple-50 p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
          <Link href="/" className="text-sm text-purple-600">
            ← ホームへ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-purple-800">
            プライバシーポリシー
          </h1>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            本ページでは、アーサナ辞書＆シークエンス管理アプリにおける
            個人情報の取り扱いについて説明します。
          </p>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
          <h2 className="text-lg font-bold text-purple-700">
            取得する情報
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            本アプリでは、ログイン機能の提供のため、
            メールアドレスなどの認証情報を取得する場合があります。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
          <h2 className="text-lg font-bold text-purple-700">
            利用目的
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            取得した情報は、ログイン認証、データ保存、
            サービス提供および改善のために利用します。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
          <h2 className="text-lg font-bold text-purple-700">
            データ管理
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            データは Supabase を利用して管理されています。
            適切なアクセス制限とセキュリティ設定を行い、
            不正アクセス防止に努めます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
          <h2 className="text-lg font-bold text-purple-700">
            第三者提供について
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            法令に基づく場合を除き、
            個人情報を第三者へ提供することはありません。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
          <h2 className="text-lg font-bold text-purple-700">
            ポリシーの変更
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            本ポリシーは、必要に応じて内容を変更する場合があります。
          </p>
        </section>
      </div>
    </main>
  )
}