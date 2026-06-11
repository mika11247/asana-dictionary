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
        手のひらへの <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/arm/01.jpg",
    count: "1回",
    description:
      "クライアントの手のひらを反らすようにして持ち、外側から内側へ向かうように、両手でサムプレスを行います。左右交互に親指を動かして、圧を加えましょう。",
  },
  {
    title: (
      <>
        手のひらへの <TechLink code="TC" /> と指のけん引
      </>
    ),
    image: "/images/thai/flow/arm/02.jpg",
    count: "1回",
    description:
      "サムサークルで手のひらをほぐし、さらに指を1本ずつ伸ばします。親指から順に、小指までひっぱります。",
  },
  {
    title: (
      <>
        手のひらへの <TechLink code="TS" />
      </>
    ),
    image: "/images/thai/flow/arm/03.jpg",
    count: "1回",
    description:
      "上に向けたクライアントの左手のひらを両手で持ち、サムスライドで左右に伸ばします。これは、パームサークルで行ってもよいでしょう。",
  },
  {
    title: (
      <>
        手のひらへの <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/arm/04.jpg",
    count: "1回",
    description:
      "手のひら全体を、サムプレスでほぐします。",
  },
  {
    title: (
      <>
        前腕への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/arm/05.jpg",
    count: "2往復",
    description:
      "手首から肘下まで、パームプレスで圧を加えます。",
    point:
      "手が動かないように、手のひらを固定しましょう。",
  },
  {
    title: (
      <>
        前腕への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/arm/06.jpg",
    count: "1往復ずつ",
    description:
      "手首から肘下までの3つのラインに、サムプレスで圧を加えます。",
    point:
      "腕などの細い部位の3つのラインにサムプレスやサムサークルを行うときは、内側→センター→外側の順に行うと施術しやすくなります。",
  },
  {
    title: (
      <>
        前腕への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/arm/07.jpg",
    count: "1往復",
    description:
      "パームプレスで、手首から肘下に圧を加えます。",
  },
  {
    title: (
      <>
        腕への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/arm/08.jpg",
    count: "数回",
    description:
      "パームプレスで、手首から肩、肩から肘に数回圧を加えます。",
  },
  {
    title: (
      <>
        上腕への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/arm/09.jpg",
    count: "1往復ずつ",
    description:
      "肘から上の3つのラインに、サムプレスで圧を加えます。",
  },
  {
    title: (
      <>
        上腕への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/arm/10.jpg",
    count: "数回",
    description:
      "パームプレスで、肘から肩に数回圧を加えます。",
  },
  {
    title: (
      <>
        鎖骨下筋への <TechLink code="TC" />
      </>
    ),
    image: "/images/thai/flow/arm/11.jpg",
    count: "数回",
    description:
      "鎖骨下筋を、サムサークルで数回ほぐします。",
    point:
      "このとき、親指以外の指で肩の周辺をほぐします。",
  },
  {
    title: "動脈・リンパの圧迫と解放",
    image: "/images/thai/flow/arm/12.jpg",
    count: "20〜30秒",
    description:
      "鎖骨付近にある動脈とリンパに、20〜30秒程度圧を加え、解放します。",
    point:
      "動脈を止めてしまうので、30秒以上は押さないようにしましょう。",
  },
  {
    title: (
      <>
        腕全体への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/arm/13.jpg",
    count: "1回",
    description:
      "肩から指先まで、腕全体をパームプレスで刺激します。",
  },
];

export default function ArmFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          手・腕への施術
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