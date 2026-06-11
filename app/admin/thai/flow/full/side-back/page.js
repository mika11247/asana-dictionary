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
        左脚大腿部後側への <TechLink code="FP" />
      </>
    ),
    image: "/images/thai/flow/side-back/01.jpg",
    count: "1回",
    description:
      "左足首を持ち、フットプレスで臀部から膝裏の上まで圧を加えます。",
  },
  {
    title: (
      <>
        左脚のストレッチと臀部への <TechLink code="PC" />
      </>
    ),
    image: "/images/thai/flow/side-back/02.jpg",
    count: "数回",
    description:
      "フットプレスを行ったままクライアントの膝を曲げ、両手でももを引き寄せて脚のストレッチを行います。その後、臀部へのパームサークルを行います。",
  },
  {
    title: (
      <>
        左脚への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/side-back/03.jpg",
    count: "1回",
    description:
      "パームプレスで足首から臀部まで圧を加えながら、クライアントの後ろに移動します。",
  },
  {
    title: (
      <>
        臀部への <TechLink code="PP" />・<TechLink code="PC" />
      </>
    ),
    image: "/images/thai/flow/side-back/04.jpg",
    count: "数回",
    description:
      "クライアントの臀部に、右手でパームサークルを行い、同時に左手でパームプレスを行います。",
    point:
      "圧を加えるときは、指先ではなく手根部を使いましょう。",
  },
  {
    title: (
      <>
        背部への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/side-back/05.jpg",
    count: "2往復",
    description:
      "両手の手根部を背中に添え、背骨の左側にある筋肉にパームプレスで圧を加えます。腰から肩まで行います。",
  },
  {
    title: (
      <>
        背部への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/side-back/06.jpg",
    count: "1往復ずつ",
    description:
      "親指をそろえ、背部のライン1とライン2にサムプレスで圧を加えます。",
  },
  {
    title: (
      <>
        腰部・脇への <TechLink code="EP" />
      </>
    ),
    image: "/images/thai/flow/side-back/07.jpg",
    count: "1回",
    description:
      "クライアントの左腕を頭側へ伸ばします。脇の下に右肘、腰部に左肘を置き、エルボープレスで圧を加えます。",
  },
  {
    title: "腰背部のストレッチ",
    image: "/images/thai/flow/side-back/08.jpg",
    count: "1回",
    description:
      "左腕を後ろへ回し、左肩と左膝の上を押さえて、腰をひねるようにストレッチします。",
  },
  {
    title: (
      <>
        腰部への <TechLink code="KP" />
      </>
    ),
    image: "/images/thai/flow/side-back/09.jpg",
    count: "1回",
    description:
      "クライアントの左腕を前へ移します。左膝を持ち、左足底部を施術者の脚の付け根に当てて固定します。右手で左肩を押さえ、腰にニープレスを行います。",
  },
  {
    title: (
      <>
        左脚大腿部前側への <TechLink code="TAP" />
      </>
    ),
    image: "/images/thai/flow/side-back/10.jpg",
    count: "数回",
    description:
      "クライアントの体勢はそのまま、左脚大腿部前側へ数回タップします。",
  },
  {
    title: "肩と腕のストレッチ",
    image: "/images/thai/flow/side-back/11.jpg",
    count: "1回",
    description:
      "クライアントの体勢を戻し、左手首を持って立ち上がります。そのまま上に引っ張り、今度は右手首を持って同様に上に引っ張ります。",
  },
];

export default function SideBackFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          臀部・腰部・背部への施術
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