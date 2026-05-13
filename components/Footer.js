'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="print-footer-full mt-16 border-t border-white/50 bg-white/80 px-4 py-8 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
          <Link
            href="/guide"
            className="transition hover:text-orange-600"
          >
            Guide
          </Link>

          <Link
            href="/disclaimer"
            className="transition hover:text-gray-700"
          >
            Disclaimer
          </Link>

          <Link
            href="/privacy"
            className="transition hover:text-purple-700"
          >
            Privacy
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-gray-700">
            🪷 Asana Dictionary
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Yoga Sequence & Asana Management App
          </p>

          <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-sky-200 to-violet-200" />

          <p className="mt-4 text-xs text-gray-400">
            © 2026 Asana Dictionary by M.glitter
          </p>
        </div>
      </div>
    </footer>
  )
}