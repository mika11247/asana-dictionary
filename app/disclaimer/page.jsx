'use client'

import Link from 'next/link'

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <Link href="/" className="text-sm text-gray-500">
            ← ホームへ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            免責事項
          </h1>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            本ページは、アーサナ辞書＆シークエンス管理アプリのご利用にあたっての注意事項です。
          </p>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            本アプリについて
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            本アプリは、ヨガのアーサナ情報やレッスン構成を管理するための補助ツールです。
            医療的な診断、治療、助言を目的としたものではありません。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            安全管理について
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            アーサナの実践やレッスン指導にあたっては、利用者ご自身の責任において、
            体調・経験・柔軟性・既往歴などを考慮し、安全に配慮して行ってください。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            情報の正確性について
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            登録内容やメモ、シークエンス構成は利用者自身が管理する情報です。
            内容の正確性・完全性・安全性について、当アプリは保証するものではありません。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            損害等について
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            本アプリの利用により生じた身体的トラブル、指導上の問題、データの消失、
            その他の損害について、運営者は一切の責任を負いかねます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            仕様変更について
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            本アプリは開発中のため、機能・表示・利用条件などを予告なく変更する場合があります。
          </p>
        </section>
      </div>
    </main>
  )
}