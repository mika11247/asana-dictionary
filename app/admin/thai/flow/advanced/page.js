import Link from "next/link";

const steps = [
  {
    title: "骨盤まわりストレッチ①",
    image: "/images/thai/flow/advanced/01.jpg",
    count: "左右",
    description:
      "クライアントの左膝を曲げます。左手で左足首を持ち、右手のパームプレスで臀部に圧を加えます。反対側も同様に行います。",
  },

  {
    title: "骨盤まわりストレッチ②",
    image: "/images/thai/flow/advanced/02.jpg",
    count: "左右",
    description:
      "クライアントの左脚を右脚にクロスさせてまたぎ、施術者は両足ではさみます。両手のパームプレスで臀部と臀部の下部に数回圧を加えます。反対側も同様に行います。",
  },

  {
    title: "肩・胸部・大腿四頭筋のストレッチ",
    image: "/images/thai/flow/advanced/03.jpg",
    count: "1回",
    description:
      "クライアントの脚を曲げ、施術者が足底に座って脚を固定します。施術者はクライアントの両腕を膝の上に乗せ、両肩を持ってストレッチを行います。",
    point:
      "体が硬い場合は、膝を伸ばしたまま臀部に座って行います。",
  },

  {
    title: "胸部・肩甲骨まわり・股関節のストレッチ①",
    image: "/images/thai/flow/advanced/04.jpg",
    count: "1回",
    description:
      "うつ伏せのクライアントの大腿部に座り、互いに両手首を持ちます。施術者は体を後ろに倒し、クライアントの体を反らすようにストレッチします。",
  },

  {
    title: "胸部・肩甲骨まわり・股関節のストレッチ②",
    image: "/images/thai/flow/advanced/05.jpg",
    count: "左右",
    description:
      "ゆっくり体勢を戻し、右脚を持ち上げて施術者の大腿部に乗せます。左手のパームプレスで腰背部に圧を加えます。",
  },

  {
    title: "胸部・肩甲骨まわり・股関節のストレッチ③",
    image: "/images/thai/flow/advanced/06.jpg",
    count: "左右",
    description:
      "同じ箇所に左足のフットプレスで圧を加えます。体勢を戻しながら脚を揺らしてポジションを調整します。反対側も同様に行います。",
  },

  {
    title: "胸椎・腰椎の調整",
    image: "/images/thai/flow/advanced/07.jpg",
    count: "1回",
    description:
      "クライアントの両腕を胸の前でクロスさせ、後方から引っ張ります。さらにフットプレスを行い、肩甲骨まわりと腰背部全体をほぐします。",
  },
];

export default function AdvancedStretchPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link
          href="/admin/thai/flow"
          className="text-sm text-gray-500"
        >
          ← 施術の流れへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          応用ストレッチ
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          中級〜上級向けの追加ストレッチ
        </p>

        <div className="mt-6 rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-purple-700">
            応用の活用方法
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            大きい動作でクライアントの体をストレッチします。
            バランス感覚に優れた施術者、もしくは施術に慣れた施術者が行うとよいでしょう。
            SECTION.1の最後や、SECTION.4「調整とストレッチ」の最初に追加できます。
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {steps.map((step, index) => (
            <article
              key={index}
              className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 text-3xl font-bold leading-none text-green-600">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-relaxed text-gray-800">
                    {step.title}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    回数：{step.count}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-sky-50 p-3">
                <p className="mb-1 text-xs font-bold text-sky-700">
                  施術内容
                </p>

                <p className="text-sm leading-7 text-sky-900">
                  {step.description}
                </p>
              </div>

              {step.point && (
                <div className="mt-3 rounded-2xl bg-amber-50 p-3">
                  <p className="mb-1 text-xs font-bold text-amber-700">
                    POINT
                  </p>

                  <p className="text-sm leading-7 text-amber-900">
                    {step.point}
                  </p>
                </div>
              )}

              {step.image && (
                <img
                  src={step.image}
                  alt=""
                  className="mt-4 w-full rounded-2xl shadow-sm"
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}