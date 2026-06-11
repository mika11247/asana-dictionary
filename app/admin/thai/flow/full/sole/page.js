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
    title: "ワーイ",
    image: "/images/thai/flow/sole/01.jpg",
    count: "ー",
    description:
      "シワカ・コマラパ師への感謝と、クライアントの健康と幸せを祈ります。神に祈りをささげるため、施術を行う前に胸の前で手を合わせます。",
    memo: "開始前の声かけ・準備",
  },
  {
    title: (
      <>
        両足底部全体への <TechLink code="FP" />
      </>
    ),
    image: "/images/thai/flow/sole/02.jpg",
    count: "1回",
    description: "フットプレスで、両足底部をほぐします。",
  },
  {
    title: (
      <>
        足底部全体への <TechLink code="FP" />
      </>
    ),
    image: "/images/thai/flow/sole/03.jpg",
    count: "2回",
    description:
      "フットプレスで、左足底部全体をほぐします。これを2回行います。",
  },
  {
    title: (
      <>
        足底部中央への強い <TechLink code="HP" />
      </>
    ),
    image: "/images/thai/flow/sole/04.jpg",
    count: "1回",
    description:
      "強いヒールプレスで、足底部中央へ体重をかけるように圧を加えます。",
  },
  {
    title: (
      <>
        足底部全体への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/sole/05.jpg",
    count: "2往復",
    description:
      "サムプレスで、中央、内側、外側の順に親指で圧を加えます。",
  },
  {
    title: (
      <>
        足底下部から上部への <TechLink code="TS" />
      </>
    ),
    image: "/images/thai/flow/sole/06.jpg",
    count: "5回",
    description:
      "両手のサムスライドで、足底部を足先の方からこすってほぐします。",
    point: "サムスライドをする際には、Yを描くようにこすりましょう。",
  },
  {
    title: (
      <>
        足底上部から下部への <TechLink code="TS" />
      </>
    ),
    image: "/images/thai/flow/sole/07.jpg",
    count: "5回",
    description:
      "同様に、両手のサムスライドで、足底部をかかとの方からこすってほぐします。",
    point: "サムスライドをする際には、Aを描くようにこすりましょう。",
  },
  {
    title: (
      <>
        母指球・小指球への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/sole/08.jpg",
    count: "2セット",
    description:
      "両手のサムプレスで、母指球と小指球から中央にかけて圧を加えます。",
    point: "足底部の外側から内側に向けて、圧を加えましょう。",
  },
  {
    title: (
      <>
        足首への <TechLink code="FS" />
      </>
    ),
    image: "/images/thai/flow/sole/09.jpg",
    count: "5回",
    description: "フィンガースライドで、左足首をこすります。",
  },
  {
    title: (
      <>
        足の甲への <TechLink code="FS" />
      </>
    ),
    image: "/images/thai/flow/sole/10.jpg",
    count: "5回",
    description: "フィンガースライドで、左足の甲をこすります。",
  },
  {
    title: (
      <>
        アキレス腱への <TechLink code="FC" />
      </>
    ),
    image: "/images/thai/flow/sole/11.jpg",
    count: "1回",
    description:
      "アキレス腱を親指と人差し指で挟み、フィンガーサークルで円を描くように圧を加えます。",
  },
  {
    title: (
      <>
        母指外転筋への <TechLink code="TC" />
      </>
    ),
    image: "/images/thai/flow/sole/12.jpg",
    count: "2往復",
    description:
      "土踏まずの内側に、左手親指のサムサークルで圧を加えます。さらに、かかとから指の付け根に向けて円を描くようにこすります。",
    point: "圧を加えるのは、母指外転筋のラインです。",
  },
  {
    title: "指のけん引",
    image: "/images/thai/flow/sole/13.jpg",
    count: "1回",
    description:
      "足の指を人差し指と中指で挟み、1本ずつ引っ張ります。",
    memo: "無理に引っ張らない",
  },
  {
    title: (
      <>
        足底部全体への <TechLink code="NC" />
      </>
    ),
    image: "/images/thai/flow/sole/14.jpg",
    count: "2往復",
    description:
      "片方の手で足先を固定し、ナックルサークルで円を描くように足底部全体をこすります。",
  },
  {
    title: (
      <>
        足底部全体への <TechLink code="NS" />
      </>
    ),
    image: "/images/thai/flow/sole/15.jpg",
    count: "5回",
    description:
      "足先を固定したまま、ナックルスライドでかかとから指先に向けて、縦方向に圧を加えます。",
  },
  {
    title: (
      <>
        足底部全体への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/sole/16.jpg",
    count: "2往復",
    description:
      "パームプレスで、かかとからつま先の順に圧を加えます。",
  },
];

export default function SoleFlowPage() {
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
          足底部への施術
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