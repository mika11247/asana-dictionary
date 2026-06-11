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
        下腿部後側への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/lower-leg/01.jpg",
    count: "2往復",
    description:
      "足首から下腿部に向けて、パームプレスで圧を加えます。",
    point: "膝の裏は押さないように注意しましょう。",
  },
  {
    title: (
      <>
        下腿部後側への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/lower-leg/02.jpg",
    count: "2往復",
    description:
      "3つのラインに、サムプレスを行います。脚の内側と外側に行うときは、圧を加えない方の手で足裏を固定しましょう。",
    point:
      "中央のラインは両手親指、内側は左手親指、外側は右手親指を使いましょう。",
  },
  {
    title: (
      <>
        下腿部後側への <TechLink code="TC" />
      </>
    ),
    image: "/images/thai/flow/lower-leg/03.jpg",
    count: "2往復",
    description:
      "3つのラインを、サムサークルでほぐしていきます。それぞれのラインを2往復ずつ行います。",
    point:
      "クライアントの状態に合わせ、一つのラインに対して2往復行ってから、次のラインに施術しても構いません。",
  },
  {
    title: (
      <>
        下腿部後側への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/lower-leg/04.jpg",
    count: "2往復",
    description:
      "最後に、足首から下腿部へパームプレスで圧を加えます。",
  },
];

export default function LowerLegFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link
          href="/admin/thai/flow/full"
          className="text-sm text-gray-500"
        >
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          下腿部への施術
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          SECTION.1 うつ伏せ
        </p>

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

              {step.description && (
                <div className="mt-4 rounded-2xl bg-sky-50 p-3">
                  <p className="mb-1 text-xs font-bold text-sky-700">
                    施術内容
                  </p>
                  <p className="text-sm leading-7 text-sky-900">
                    {step.description}
                  </p>
                </div>
              )}

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

              {step.memo && (
                <div className="mt-3 rounded-2xl bg-gray-50 p-3">
                  <p className="mb-1 text-xs font-bold text-gray-500">
                    美香メモ
                  </p>
                  <p className="text-sm leading-7 text-gray-700">
                    {step.memo}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}