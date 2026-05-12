'use client'

export default function ContactPage() {
  return (
    <>

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
              不具合報告・ご要望・使い方についてのお問い合わせは、
              M.glitter のお問い合わせフォームよりお願いいたします。
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

            <a
              href="https://mglitter.net/contact/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-sky-600"
            >
              お問い合わせフォームへ
            </a>
          </section>
        </div>
      </main>
    </>
  )
}