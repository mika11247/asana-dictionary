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
    title: "頭部のほぐし",
    image: "/images/thai/flow/head/01.jpg",
    count: "1回",
    description:
      "クライアントの頭側に座り、両手の指で頭部全体をほぐします。",
  },
  {
    title: (
      <>
        こめかみへの <TechLink code="FC" />
      </>
    ),
    image: "/images/thai/flow/head/02.jpg",
    count: "1回",
    description:
      "こめかみを、フィンガーサークルでほぐします。",
  },
  {
    title: "耳のほぐし",
    image: "/images/thai/flow/head/03.jpg",
    count: "数回",
    description:
      "両手の人差し指、中指でクライアントの耳を挟み、数回こすります。",
  },
  {
    title: "頭蓋骨下のけん引",
    image: "/images/thai/flow/head/04.jpg",
    count: "20〜30秒",
    description:
      "両手でクライアントの頭を支え、頭蓋骨下に手をかけるようにして手前に引きます。20〜30秒手前に引き、解放します。",
  },
  {
    title: (
      <>
        首への <TechLink code="TC" />①
      </>
    ),
    image: "/images/thai/flow/head/05.jpg",
    count: "1往復",
    description:
      "枕を取り、クライアントの頭を左側に倒して固定します。右耳の下から鎖骨上までの胸鎖乳突筋の内側と外側にある2つのラインを、サムサークルでほぐします。",
    point:
      "首が硬い場合は、無理に引っぱったり倒したりしないように注意しましょう。また反動で動かさないようにしましょう。",
  },
  {
    title: (
      <>
        首への <TechLink code="TC" />②
      </>
    ),
    image: "/images/thai/flow/head/06.jpg",
    count: "1回",
    description:
      "左側も同様に行います。",
  },
  {
    title: (
      <>
        肩への <TechLink code="HP" />
      </>
    ),
    image: "/images/thai/flow/head/07.jpg",
    count: "1回",
    description:
      "クライアントの右手首を両手で持ち、右足を右肩に当て、ヒールプレスで肩に圧を加えます。",
  },
  {
    title: (
      <>
        肩への <TechLink code="PC" />
      </>
    ),
    image: "/images/thai/flow/head/08.jpg",
    count: "1回",
    description:
      "クライアントの右腕をマットに下ろし、ヒールプレスを行った箇所を、パームサークルでほぐします。",
  },
  {
    title: (
      <>
        肩への <TechLink code="HP" />
      </>
    ),
    image: "/images/thai/flow/head/09.jpg",
    count: "1回",
    description:
      "左側も同様に行います。クライアントの左手首を両手で持ち、左足を左肩に当て、ヒールプレスで肩に圧を加えます。",
  },
  {
    title: (
      <>
        肩への <TechLink code="PC" />
      </>
    ),
    image: "/images/thai/flow/head/10.jpg",
    count: "1回",
    description:
      "クライアントの左腕をマットに下ろし、ヒールプレスを行った箇所を、パームサークルでほぐします。",
  },
  {
    title: "肩のストレッチ",
    image: "/images/thai/flow/head/11.jpg",
    count: "1回",
    description:
      "両手首を持ち、体を後ろに倒しながら腕を引っ張ります。",
  },
];

export default function HeadFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          肩・首・頭部への施術
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