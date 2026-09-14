'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DemoHome() {
  const router = useRouter()

  function requireLogin(feature = 'この機能') {
    const ok = window.confirm(
      `🔒 ${feature}は無料登録後に利用できます✨\n\n無料登録すると、自分の辞書やシークエンスを作成・編集・保存できます。\n\n無料登録しますか？`
    )

    if (ok) {
      router.push('/login?mode=signup')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="mx-auto flex max-w-md flex-col items-center pt-10">

        {/* =========================
            TITLE
        ========================= */}
        <div className="mb-6 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800">
            🧘‍♀️ My Dictionary
          </h1>

          <p className="text-sm text-gray-500">
            「身体を整える、自分だけのレッスンとメニューを育てよう」
          </p>
        </div>


        {/* =========================
            GUEST BANNER
        ========================= */}
        <div className="mb-7 w-full rounded-3xl border border-violet-100 bg-gradient-to-r from-sky-50 to-violet-50 p-5 shadow-sm">
          <p className="font-bold text-violet-700">
            👀 ゲスト体験中
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Asana Dictionary の実際の画面を
            登録なしでお試しできます✨
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            閲覧は登録なしでOK。
            追加・編集・保存などの機能には無料登録が必要です。
          </p>
        </div>


        {/* =========================
            MENU
        ========================= */}
        <div className="w-full space-y-4">

         {/* 一覧 */}
<Link href="/asanas">
  <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
    <div className="flex items-center gap-4">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
        📚
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800">
          一覧
        </h2>

        <p className="text-sm text-gray-500">
          ポーズ・エクササイズ・種目を確認
        </p>
      </div>

    </div>
  </div>
</Link>


          {/* 新規登録 */}
          <button
            type="button"
            onClick={() => requireLogin('新しい動きの登録')}
            className="block w-full text-left"
          >
            <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl">
                  ➕
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-800">
                    新規登録
                  </h2>

                  <p className="text-sm text-gray-500">
                    新しい動きを追加
                  </p>
                </div>

                <span className="shrink-0 text-xs text-gray-400">
                  🔒
                </span>

              </div>
            </div>
          </button>


          {/* 今日のおすすめ */}
          <button
            type="button"
            onClick={() => requireLogin('今日のおすすめ')}
            className="block w-full text-left"
          >
            <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
                  🌙
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-800">
                    今日のおすすめ
                  </h2>

                  <p className="text-sm text-gray-500">
                    今日のヒントを受け取る
                  </p>
                </div>

                <span className="shrink-0 text-xs text-gray-400">
                  🔒
                </span>

              </div>
            </div>
          </button>


          {/* シークエンス一覧 */}
          <Link href="/sequences">
            <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-2xl">
                  📝
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-800">
                    シークエンス一覧
                  </h2>

                  <p className="text-sm text-gray-500">
                    レッスン構成・メニューを確認
                  </p>
                </div>

                <span className="shrink-0 text-xs font-bold text-pink-400">
                  体験 →
                </span>

              </div>
            </div>
          </Link>


          {/* シークエンス作成 */}
          <button
            type="button"
            onClick={() => requireLogin('シークエンス作成')}
            className="block w-full text-left"
          >
            <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                  ✨
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-800">
                    シークエンス作成
                  </h2>

                  <p className="text-sm text-gray-500">
                    新しいレッスン・メニューを作る
                  </p>
                </div>

                <span className="shrink-0 text-xs text-gray-400">
                  🔒
                </span>

              </div>
            </div>
          </button>


          {/* テンプレート */}
          <Link href="/presets">
            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                  📦
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-800">
                    テンプレート
                  </h2>

                  <p className="text-sm text-gray-500">
                    シークエンスや拡張パックを見る
                  </p>
                </div>

                <span className="shrink-0 text-xs font-bold text-emerald-500">
                  体験 →
                </span>

              </div>
            </div>
          </Link>

        </div>


        {/* =========================
            SIGN UP
        ========================= */}
        <div className="mt-10 w-full rounded-3xl border border-violet-100 bg-white/90 p-6 text-center shadow-sm">

          <p className="text-lg font-bold text-gray-800">
            🪷 自分のDictionaryを作ろう
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            無料登録すると、ポーズや種目の追加、
            シークエンス作成・編集・保存などが使えます。
          </p>

          <Link
            href="/login?mode=signup"
            className="mt-5 block rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
          >
            無料で始める ✨
          </Link>

          <Link
            href="/login"
            className="mt-3 block text-sm font-medium text-gray-500 hover:text-violet-600"
          >
            すでに登録済みの方はログイン
          </Link>

        </div>


        {/* =========================
            BETA
        ========================= */}
        <div className="mt-6 w-full rounded-3xl border border-violet-100 bg-white/80 p-5 text-center shadow-sm">
          <p className="text-sm leading-7 text-gray-600">
            β版のため、一部機能や保存数を調整しています🌙
            <br />
            ご意見を参考にしながら、少しずつ整えています✨
          </p>
        </div>

      </div>
    </main>
  )
}