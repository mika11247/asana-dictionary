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
    title: "仙腸関節の調整①",
    image: "/images/thai/flow/pelvis/01.jpg",
    count: "1回",
    description:
      "仙腸関節は、骨盤にある関節です。まず、クライアントに正座になってもらいます。",
  },
  {
    title: "仙腸関節の調整②",
    image: "/images/thai/flow/pelvis/02.jpg",
    count: "1回",
    description:
      "クライアントの背中を両手で押して、前方に倒します。額を地面につけ、両腕を前方に伸ばしてもらいます。",
  },
  {
    title: (
      <>
        仙腸関節の調整③ <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/pelvis/03.jpg",
    count: "1回",
    description:
      "両手のパームプレスで、仙骨を押し下げます。",
  },
  {
    title: (
      <>
        仙腸関節の調整④ <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/pelvis/04.jpg",
    count: "1回",
    description:
      "腰部から背中の中央にかけて、パームプレスで往復します。",
    point: "直接背骨を押さないように注意しましょう。",
  },
];

export default function PelvisFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          仙腸関節の調整
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
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}