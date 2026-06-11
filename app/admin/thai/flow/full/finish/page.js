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
        肩への <TechLink code="TAP" />
      </>
    ),
    image: "/images/thai/flow/finish/01.jpg",
    count: "数回",
    description:
      "指を開いて両手を合わせて組み、小指側で左右の肩をたたきます。",
  },
  {
    title: (
      <>
        背部への <TechLink code="TAP" />
      </>
    ),
    image: "/images/thai/flow/finish/02.jpg",
    count: "2往復",
    description:
      "手を離し、肩から背中にかけて左右の拳でたたきます。",
  },
  {
    title: (
      <>
        背部への <TechLink code="CHOP" />①
      </>
    ),
    image: "/images/thai/flow/finish/03.jpg",
    count: "左右それぞれ2往復",
    description:
      "両手を軽く組み、肩から背中にかけてチョップでたたきます。",
  },
  {
    title: (
      <>
        背部への <TechLink code="CHOP" />②
      </>
    ),
    image: "/images/thai/flow/finish/04.jpg",
    count: "左右それぞれ2往復",
    description:
      "両手を組んだまま、手の甲で同じ箇所をたたきます。",
  },
  {
    title: (
      <>
        背部への <TechLink code="PS" />
      </>
    ),
    image: "/images/thai/flow/finish/05.jpg",
    count: "1回",
    description:
      "パームスライドで、背中全体をなでるようにほぐします。",
  },
  {
    title: (
      <>
        肩への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/finish/06.jpg",
    count: "1回",
    description:
      "パームプレスで、両肩に圧を加えます。",
  },
  {
    title: "腕・肩のもみほぐし",
    image: "/images/thai/flow/finish/07.jpg",
    count: "1回",
    description:
      "肩から手首にかけて、腕全体をほぐします。",
  },
  {
    title: (
      <>
        肩への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/finish/08.jpg",
    count: "1回",
    description:
      "最後に、両肩にパームプレスを行います。",
  },
];

export default function FinishFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          仕上げの施術
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          SECTION.5 仕上げ
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