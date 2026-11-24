'use client'

import { useEffect, useState } from 'react'

export function isIosStandalone() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const isAppleMobile =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  return isAppleMobile && isStandalone
}

async function copyCurrentUrl() {
  const url = window.location.href

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) throw new Error('URL copy failed')
}

export default function NativePrintHelpDialog({ open, onClose }) {
  const [copyStatus, setCopyStatus] = useState('idle')

  useEffect(() => {
    if (!open) {
      setCopyStatus('idle')
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  async function handleCopy() {
    setCopyStatus('copying')

    try {
      await copyCurrentUrl()
      setCopyStatus('copied')
    } catch (error) {
      console.error('ページURLをコピーできませんでした。', error)
      setCopyStatus('error')
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="native-print-help-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <h2 id="native-print-help-title" className="text-xl font-bold text-gray-800">
          Safariで印刷してください
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600">
          <p>
            ホーム画面から開いたアプリでは、iPhone・iPadの印刷画面が開かない場合があります。
          </p>
          <p>
            下のボタンでこのページのURLをコピーし、通常のSafariで開くと、印刷画面からPDFの保存・共有ができます。
          </p>
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-800">
            Safariで開いた際は、もう一度ログインが必要になる場合があります。
          </p>
        </div>

        {copyStatus === 'copied' && (
          <p className="mt-3 text-sm font-medium text-green-600" role="status">
            URLをコピーしました。Safariのアドレス欄に貼り付けてください。
          </p>
        )}
        {copyStatus === 'error' && (
          <p className="mt-3 text-sm font-medium text-red-600" role="alert">
            URLをコピーできませんでした。共有メニューなどからSafariで開いてください。
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600"
          >
            閉じる
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={copyStatus === 'copying'}
            className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            {copyStatus === 'copying' ? 'コピー中…' : 'このページのURLをコピー'}
          </button>
        </div>
      </div>
    </div>
  )
}
