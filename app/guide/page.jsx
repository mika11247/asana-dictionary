'use client'

import Link from 'next/link'

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-orange-50 p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <Link href="/" className="text-sm text-orange-600">
            ← ホームへ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-orange-800">
            使い方ガイド
          </h1>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            アーサナ辞書＆シークエンス管理アプリの基本的な使い方です。
            アーサナを登録し、レッスン構成を作りながら、メモや誘導文も一緒に管理できます。
          </p>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            1. アーサナを登録する
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            「アーサナ登録」から、ポーズ名・サンスクリット名・カテゴリ・チャクラなどを登録できます。
            登録したアーサナは一覧ページで確認できます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            2. アーサナを探す
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            アーサナ一覧では、検索・カテゴリ別表示・チャクラフィルターを使ってポーズを探せます。
            レッスンテーマや身体の部位、チャクラに合わせて選びやすくなっています。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            3. シークエンスを作る
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            「シークエンス」からレッスンを作成できます。
            作成したシークエンスを開き、登録済みのアーサナを追加してレッスン構成を作ります。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            4. 並び替える
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            シークエンス内の「☰」をドラッグすると、アーサナやメモの順番を自由に並び替えできます。
            レッスンの流れを考えながら、直感的に構成を調整できます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            5. メモを追加する
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            「メモ追加」から、今日のテーマ・呼吸の誘導・声かけ・シャバーサナ台本などを自由に書けます。
            メモは複数行に対応していて、アーサナと一緒に並び替えることもできます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
  <h2 className="text-lg font-bold text-orange-700">
    6. β版について
  </h2>

  <p className="mt-2 text-sm leading-7 text-gray-600">
    現在はβ版として公開しています。
    一部機能や保存数を調整しながら、使いやすい形へ少しずつ整えています🧘‍♀️
  </p>

  <p className="mt-2 text-sm leading-7 text-gray-600">
    ご意見・ご感想も、今後の改善の参考にさせていただきます✨
  </p>
</section>
      </div>
    </main>
  )
}