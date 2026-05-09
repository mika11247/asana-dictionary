'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-white px-4 py-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
          <Link
            href="/guide"
            className="transition hover:text-orange-600"
          >
            使い方ガイド
          </Link>

          <Link
            href="/disclaimer"
            className="transition hover:text-gray-700"
          >
            免責事項
          </Link>

          <Link
            href="/privacy"
            className="transition hover:text-purple-700"
          >
            プライバシーポリシー
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-gray-700">
            🪷 Asana Dictionary
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Yoga Sequence & Asana Management App
          </p>
        </div>
      </div>
    </footer>
  )
}