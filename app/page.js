// src/app/page.js
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="mx-auto flex max-w-md flex-col items-center pt-16">

        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800">
            🧘‍♀️ My Dictionary
          </h1>

          <p className="text-sm text-gray-500">
            「身体を整える、自分だけのレッスンとメニューを育てよう」
          </p>
        </div>

        <div className="w-full space-y-4">

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

          <Link href="/asana-create">
            <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl">
                  ➕
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    新規登録
                  </h2>

                  <p className="text-sm text-gray-500">
                    新しい動きを追加
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/today-asana">
            <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
                  🌙
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    今日のおすすめ
                  </h2>

                  <p className="text-sm text-gray-500">
                    今日のヒントを受け取る
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/sequences">
            <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-2xl">
                  📝
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    シークエンス一覧
                  </h2>

                  <p className="text-sm text-gray-500">
                    レッスン構成・メニューを管理
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/sequences/create">
            <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                  ✨
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    シークエンス作成
                  </h2>

                  <p className="text-sm text-gray-500">
                    新しいレッスン・メニューを作る
                  </p>
                </div>
              </div>
            </div>
          </Link>

        </div>

        <div className="mt-10 rounded-3xl border border-violet-100 bg-white/80 p-5 text-center shadow-sm">
          <p className="text-sm leading-7 text-gray-600">
            β版のため、一部機能や保存数を調整しています🌙
            <br />
            ご意見を参考にしながら、少しずつ整えています✨
          </p>
        </div>

      </div>
    </main>
  );
}