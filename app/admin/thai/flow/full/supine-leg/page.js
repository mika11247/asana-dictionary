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
        両足底部への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/supine-leg/01.jpg",
    count: "1回",
    description:
      "両足底部の内側に、左右の手で同時にサムプレスで圧を加えます。",
    point:
      "土踏まずからつま先、かかとまで全体的に行います。",
  },
  {
    title: (
      <>
        足の甲・指への <TechLink code="TS" />
      </>
    ),
    image: "/images/thai/flow/supine-leg/02.jpg",
    count: "1回",
    description:
      "足の甲と指を、両手のサムスライドでこするようにほぐします。",
  },
  {
    title: (
      <>
        足の甲への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/supine-leg/03.jpg",
    count: "2セット",
    description:
      "足の甲のアーチ部分にある骨と骨の間の9つのポイントに、サムプレスで圧を加えます。",
  },
  {
    title: "足の甲のストレッチ",
    image: "/images/thai/flow/supine-leg/04.jpg",
    count: "1回",
    description:
      "右手の指をクライアントの足の指の間に入れ、左手でかかとを固定します。足を前後に反らせて、ストレッチを行います。",
  },
  {
    title: "足首の回転",
    image: "/images/thai/flow/supine-leg/05.jpg",
    count: "外側2回・内側2回",
    description:
      "足首を外側に2回、内側に2回大きく回します。",
  },
  {
    title: (
      <>
        足の甲への <TechLink code="TC" /> と指のけん引
      </>
    ),
    image: "/images/thai/flow/supine-leg/06.jpg",
    count: "1回",
    description:
      "足の甲のアーチ部分を、サムサークルで指先に向かってほぐします。その後、それぞれの指を引っぱります。",
  },
  {
    title: (
      <>
        下腿部外側への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/supine-leg/07.jpg",
    count: "2往復",
    description:
      "足首を内側にひねり、足の付け根から膝下までの脛骨の外側に、パームプレスで圧を加えます。",
  },
  {
    title: (
      <>
        下腿部外側への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/supine-leg/08.jpg",
    count: "2往復ずつ",
    description:
      "足を固定し、下腿部外側の3つのラインに、サムプレスで圧を加えます。",
  },
  {
    title: (
      <>
        下腿部外側への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/supine-leg/09.jpg",
    count: "2往復",
    description:
      "足首から膝下まで、パームプレスで圧を加えます。",
  },
];

export default function SupineLegFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          つま先から足首・下腿部への施術
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          SECTION.3 仰向け
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