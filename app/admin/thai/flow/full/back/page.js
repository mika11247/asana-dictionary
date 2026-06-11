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
    title: <>下半身への <TechLink code="PP" /></>,
    image: "/images/thai/flow/back/01.jpg",
    count: "1回",
    description: "パームプレスで両足首から臀部まで圧を加えます。",
    point: "このとき、クライアントにまたがるような体勢になります。",
  },
  {
    title: "背部へのバタフライ",
    image: "/images/thai/flow/back/02.jpg",
    count: "2往復",
    description: "バタフライで、腰から背部にかけて圧を加えていきます。",
    point: "直接背骨を押さないように注意しましょう。",
  },
  {
    title: <>背部への <TechLink code="PP" /></>,
    image: "/images/thai/flow/back/03.jpg",
    count: "1往復ずつ",
    description:
      "パームプレスで、腰から背部にかけて圧を加えます。右半身は右手で、左半身は左手で行います。",
    point: "ライン1とライン2を同時に押さえながら行います。",
  },
  {
    title: <>背部への <TechLink code="TP" /></>,
    image: "/images/thai/flow/back/04.jpg",
    count: "2往復",
    description:
      "背骨近くにあるラインと外側のライン2をそれぞれ、サムプレスで圧を加えます。",
  },
  {
    title: <>背部への <TechLink code="EP" /></>,
    image: "/images/thai/flow/back/05.jpg",
    count: "2往復",
    description:
      "エルボープレスで背中の左側と右側に圧を加えます。左側は右肘で、右側は左肘で行ってください。",
  },
  {
    title: "背部へのバタフライ",
    image: "/images/thai/flow/back/06.jpg",
    count: "2往復",
    description: "バタフライで、腰から背部にかけて圧を加えます。",
  },
  {
    title: "肩甲骨へのバタフライ",
    image: "/images/thai/flow/back/07.jpg",
    count: "2回",
    description: "バタフライで、肩甲骨に圧を加えます。",
  },
  {
    title: <>肩甲骨内側のふちへの <TechLink code="TP" /></>,
    image: "/images/thai/flow/back/08.jpg",
    count: "2往復",
    description:
      "サムプレスで肩甲骨の内側のふちを、下から上へ圧を加え、同様に戻ります。",
  },
  {
    title: <>肩甲骨内側のふちへの <TechLink code="EP" /></>,
    image: "/images/thai/flow/back/09.jpg",
    count: "2往復",
    description:
      "エルボープレスで同じ箇所の下から上へ圧を加え、同様に戻ります。",
    point: "左肩甲骨は右肘で、右肩甲骨は左肘で圧を加えましょう。",
  },
  {
    title: "肩甲骨へのバタフライ",
    image: "/images/thai/flow/back/10.jpg",
    count: "2回",
    description: "バタフライで、肩甲骨に圧を加えます。",
  },
  {
    title: <>左肩甲骨外側への <TechLink code="TC" /></>,
    image: "/images/thai/flow/back/11.jpg",
    count: "1回",
    description:
      "左肩甲骨の外側のくぼみを、右親指によるサムサークルで回すようにほぐします。",
  },
  {
    title: <>左肩甲骨外側への <TechLink code="EC" /></>,
    image: "/images/thai/flow/back/12.jpg",
    count: "1回",
    description: "同じ箇所に、エルボーサークルで圧を加えます。",
  },
  {
    title: <>右肩甲骨外側への <TechLink code="TC" /></>,
    image: "/images/thai/flow/back/13.jpg",
    count: "1回",
    description:
      "右肩甲骨の外側のくぼみを、左親指によるサムサークルで回すようにほぐします。",
  },
  {
    title: <>右肩甲骨外側への <TechLink code="EC" /></>,
    image: "/images/thai/flow/back/14.jpg",
    count: "1回",
    description: "同じ箇所に、エルボーサークルで圧を加えます。",
  },
  {
    title: <>肩甲骨外側への <TechLink code="PP" /></>,
    image: "/images/thai/flow/back/15.jpg",
    count: "2回",
    description: "パームプレスで、肩甲骨の外側に圧を加えます。",
  },
  {
    title: <>背部への <TechLink code="PP" /></>,
    image: "/images/thai/flow/back/16.jpg",
    count: "2往復",
    description:
      "同様に、パームプレスで腰から背部に圧を加えます。最後にパームプレスを足首まで行います。",
  },
];

export default function BackFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          背部への施術
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