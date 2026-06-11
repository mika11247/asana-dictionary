import Link from "next/link";

function TechLink({ code }) {
  return (
    <Link
      href={`/admin/thai/basic#${code.toLowerCase()}`}
      className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700"
    >
      {code}
    </Link>
  );
}

const steps = [
  {
    title: (
      <>
        鎖骨下筋への <TechLink code="TC" />
      </>
    ),
    image: "/images/thai/flow/option-chest/01.jpg",
    count: "数回",
    description:
      "鎖骨下筋に対してサムサークルで圧を加えます。",
    point:
      "鎖骨を直接押さないように注意しましょう。",
  },

  {
    title: (
      <>
        鎖骨下筋への <TechLink code="PC" />
      </>
    ),
    image: "/images/thai/flow/option-chest/02.jpg",
    count: "数回",
    description:
      "パームサークルで鎖骨周辺をほぐします。",
    point:
      "圧が強くなりすぎないように注意します。",
  },

  {
    title: (
      <>
        小胸筋への <TechLink code="TP" />・
        <TechLink code="TC" />
      </>
    ),
    image: "/images/thai/flow/option-chest/03.jpg",
    count: "数回",
    description:
      "小胸筋に対してサムプレスとサムサークルを行います。",
    point:
      "クライアントの反応を確認しながら行いましょう。",
  },

  {
    title: (
      <>
        胸部と脇の下への <TechLink code="PC" />・
        <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/option-chest/04.jpg",
    count: "数回",
    description:
      "胸部と脇の下にパームサークルとパームプレスを行います。",
    point:
      "デリケートな部位なので事前確認を行いましょう。",
  },
];

export default function ChestOptionPage() {
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
          胸部オプション
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          肩・首・頭部への施術の前後に追加
        </p>

        <div className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-blue-700">
            オプションの活用方法
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            胸部オプションは胸部や肩まわりの緊張をゆるめるための追加施術です。
            デリケートな部位を含むため、必ず事前にクライアントへ確認を行いましょう。
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