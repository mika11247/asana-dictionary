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
            アーサナやピラティス、コンディショニングの動きを記録しながら、
            レッスン構成・メモ・誘導文・PDF資料作成までまとめて管理できます。
          </p>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
  <h2 className="text-lg font-bold text-orange-700">
    はじめに
  </h2>

  <p className="mt-2 text-sm leading-7 text-gray-600">
    初回登録時には、太陽礼拝や基本的なシークエンスなどのサンプルデータがあらかじめ追加されています。
    まずは実際に触りながら、自由に編集・追加してご利用ください🧘‍♀️
  </p>
</section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            1. アーサナや動きを登録する
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
  「アーサナ登録」から、ポーズ名・サンスクリット名・分類・チャクラ・画像・誘導文などを登録できます。

  必要な項目だけ入力して保存できるため、
  最初は名前だけの簡単登録でも大丈夫です✨

  「検索ワード」には、ひらがな・略称・関連ワードなどを自由に登録できます。
後から検索しやすいよう、自分なりのキーワードを追加するのがおすすめです✨

  ヨガのアーサナだけでなく、ピラティスやモビリティ、
  軽い筋力メニューの記録にも活用できます。
</p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            2. 一覧から探す・整理する
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            アーサナ一覧では、検索・分類フィルター・チャクラフィルター・お気に入りを使って、
            登録した内容を探せます。
            表示モードは「詳細」「管理」「検索」から選べるため、確認したい内容に合わせて使い分けできます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            3. 今日のアーサナを引く
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            「今日のアーサナ」では、登録してあるアーサナの中から1つをランダムで選び、
            今日のメッセージと一緒に表示します。
            レッスンテーマやセルフプラクティスのヒントとしてご利用ください。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            4. シークエンスを作る
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            「シークエンス」からレッスン構成を作成できます。
            登録済みのアーサナや動きを追加しながら、ヨガ・ピラティス・コンディショニングなどの流れを組み立てられます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            5. セクション・メモを追加する
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            シークエンス内では、アーサナだけでなく「セクション」や「メモ」も追加できます。
            ウォームアップ・メイン・クールダウンなどに分けたり、
            今日のテーマ・呼吸の誘導・声かけ・シャバーサナ台本などを自由に残せます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            6. 並び替えてレッスンの流れを整える
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            シークエンス内の「☰」をドラッグすると、アーサナ・セクション・メモの順番を自由に並び替えできます。
            レッスンの流れを考えながら、直感的に構成を調整できます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            7. PDFとして保存・印刷する
          </h2>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            アーサナ詳細やシークエンスは、PDF保存や印刷に対応しています。
            GoodNotesに読み込んで手書きで追記したり、レッスン準備用の資料として活用できます。
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-bold text-orange-700">
            8. β版について
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