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
        左脚大腿部外側への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/side-leg/01.jpg",
    count: "2往復",
    description:
      "パームプレスを脚の付け根から始め、膝で折り返して元の位置に戻ります。",
  },
  {
    title: (
      <>
        左脚大腿部外側への <TechLink code="TC" />
      </>
    ),
    image: "/images/thai/flow/side-leg/02.jpg",
    count: "2往復",
    description:
      "サムサークルで、大腿部の外側にある3つのラインをほぐします。",
  },
  {
    title: (
      <>
        左脚大腿部外側への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/side-leg/03.jpg",
    count: "2往復",
    description:
      "パームプレスを脚の付け根から始め、膝で折り返して元の位置に戻ります。",
  },
  {
    title: (
      <>
        左脚大腿部外側への <TechLink code="PC" />
      </>
    ),
    image: "/images/thai/flow/side-leg/04.jpg",
    count: "1往復",
    description:
      "同じ箇所に、パームサークルを行います。円を描くようにほぐします。",
  },
  {
    title: (
      <>
        左脚下腿部外側への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/side-leg/05.jpg",
    count: "2往復",
    description:
      "パームプレスで、左脚下腿部に圧を加えます。",
  },
  {
    title: (
      <>
        臀部への <TechLink code="EP" />
      </>
    ),
    image: "/images/thai/flow/side-leg/06.jpg",
    count: "1回",
    description:
      "エルボープレスで、臀部に圧を加えます。",
  },
  {
    title: (
      <>
        右脚大腿部内側への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/side-leg/07.jpg",
    count: "2往復",
    description:
      "パームプレスで、右脚の付け根から膝裏の上までと、膝裏の下から足首までにそれぞれ圧を加えます。",
    point: "膝裏を直接押さないように注意しましょう。",
  },
];

export default function SideLegFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          下腿部・大腿部への施術
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          SECTION.2 横向き
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
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}