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
    title: "大腿部後側へのバタフライ",
    image: "/images/thai/flow/thigh/01.jpg",
    count: "2往復",
    description: "膝裏の上から大腿部に、バタフライで圧を加えます。",
  },
  {
    title: (
      <>
        大腿部後側への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/thigh/02.jpg",
    count: "2往復",
    description: "サムプレスで、大腿部の3つのラインに圧を加えます。",
    point: "中央は両手親指、内側は左手親指、外側は右手親指を使います。",
  },
  {
    title: "大腿部後側へのバタフライ",
    image: "/images/thai/flow/thigh/03.jpg",
    count: "2往復",
    description: "膝裏の上から大腿部に、バタフライで圧を加えます。",
  },
  {
    title: (
      <>
        大腿部後側への <TechLink code="EP" />
      </>
    ),
    image: "/images/thai/flow/thigh/04.jpg",
    count: "2往復",
    description: "膝裏の上から大腿部に、右肘のエルボープレスで圧を加えます。",
  },
  {
    title: (
      <>
        大腿部後側・臀部への <TechLink code="EP" />
      </>
    ),
    image: "/images/thai/flow/thigh/05.jpg",
    count: "2往復",
    description: "大腿部から臀部に、右肘のエルボープレスで圧を加えます。",
  },
  {
    title: (
      <>
        臀部への <TechLink code="EP" />
      </>
    ),
    image: "/images/thai/flow/thigh/06.jpg",
    count: "2往復",
    description: "膝裏の上から右肘のエルボープレスを始め、そのまま臀部まで圧を加えます。",
  },
  {
    title: (
      <>
        腰部への <TechLink code="EP" />
      </>
    ),
    image: "/images/thai/flow/thigh/07.jpg",
    count: "2往復",
    description: "臀部から腰に向かい、エルボープレスで圧を加えます。",
    point: "圧は分けて加えても、1回をじっくり加えてもOK。",
  },
  {
    title: (
      <>
        臀部・大腿部後側への <TechLink code="EP" />
      </>
    ),
    image: "/images/thai/flow/thigh/08.jpg",
    count: "1回",
    description: "臀部から膝裏の上まで圧を加えてから、左足首を持って立ち上がります。",
  },
  {
    title: (
      <>
        大腿部後側への <TechLink code="FP" />
      </>
    ),
    image: "/images/thai/flow/thigh/09.jpg",
    count: "1回",
    description: "左足首を引き上げながら、フットプレスで膝裏の上から脚の付け根にかけて圧を加えます。",
    point: "曲げた脚は強く引きすぎないようにします。",
  },
  {
    title: "左脚のストレッチ",
    image: "/images/thai/flow/thigh/10.jpg",
    count: "1回",
    description: "大腿部にフットプレスで圧を加えながら、膝を折り曲げてストレッチします。最後に軽く揺らし、足のポジションを調整します。",
  },
];

export default function ThighFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          大腿部・臀部への施術
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          SECTION.1 うつ伏せ
        </p>

        <div className="mt-6 space-y-5">
          {steps.map((step, index) => (
            <article key={index} className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="shrink-0 text-3xl font-bold leading-none text-green-600">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-relaxed text-gray-800">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">回数：{step.count}</p>
                </div>
              </div>

              {step.description && (
                <div className="mt-4 rounded-2xl bg-sky-50 p-3">
                  <p className="mb-1 text-xs font-bold text-sky-700">施術内容</p>
                  <p className="text-sm leading-7 text-sky-900">{step.description}</p>
                </div>
              )}

              {step.point && (
                <div className="mt-3 rounded-2xl bg-amber-50 p-3">
                  <p className="mb-1 text-xs font-bold text-amber-700">POINT</p>
                  <p className="text-sm leading-7 text-amber-900">{step.point}</p>
                </div>
              )}

              {step.image && (
                <img src={step.image} alt="" className="mt-4 w-full rounded-2xl shadow-sm" />
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}