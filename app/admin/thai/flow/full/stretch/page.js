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
        背部への <TechLink code="FP" />
      </>
    ),
    image: "/images/thai/flow/stretch/01.jpg",
    count: "1回",
    description:
      "クライアントの後ろに座り、両腕を後ろに回して持ち、フットプレスで背中に圧を加えます。",
    point:
      "腰から順に圧を加え、背中の上部で強く圧を加えます。",
  },
  {
    title: (
      <>
        背部への <TechLink code="KP" />
      </>
    ),
    image: "/images/thai/flow/stretch/02.jpg",
    count: "1回",
    description:
      "クライアントの両手を後頭部で組み、そこに施術者の腕を通して前腕部を持ちます。背中に両膝を当て、上体を後ろに倒しながらニープレスで圧を加えます。",
  },
  {
    title: "体側・肩・腕のストレッチ①",
    image: "/images/thai/flow/stretch/03.jpg",
    count: "1回",
    description:
      "クライアントの右手のひらを右耳に当て、クライアントの右側に立ちます。右手でクライアントの左腕を引っ張りながら、左手でクライアントの右肘を押し、体側・肩・腕を伸ばします。",
    point:
      "施術者の左膝を、クライアントの右脚の付け根に当てると、より安定します。",
  },
  {
    title: "体側・肩・腕のストレッチ②",
    image: "/images/thai/flow/stretch/04.jpg",
    count: "1回",
    description:
      "反対側も同様に行います。",
  },
  {
    title: "脊柱の回旋①",
    image: "/images/thai/flow/stretch/05.jpg",
    count: "1回",
    description:
      "クライアントの手を後頭部で組み、腕の間に施術者の腕を通して前腕部を持ちます。クライアントを前屈させ、右脚でクライアントの右膝を固定しながら、体を左にひねります。",
  },
  {
    title: "脊柱の回旋②",
    image: "/images/thai/flow/stretch/06.jpg",
    count: "1回",
    description:
      "反対側も同様に行います。",
  },
  {
    title: (
      <>
        脊柱の調整① <TechLink code="KP" />
      </>
    ),
    image: "/images/thai/flow/stretch/07.jpg",
    count: "1回",
    description:
      "クライアントの体勢はそのまま、背中に膝を当て、ニープレスで圧を加えながら、後方にクライアントを倒します。",
  },
  {
    title: "脊柱の調整②",
    image: "/images/thai/flow/stretch/08.jpg",
    count: "1回",
    description:
      "クライアントに、腕と脚を伸ばしてもらいます。",
  },
  {
    title: "肩関節の外内旋・外内転",
    image: "/images/thai/flow/stretch/09.jpg",
    count: "外側・内側 各2回",
    description:
      "両手を持ち、円を描くように回します。外側、内側へそれぞれ2回ずつ行います。",
  },
  {
    title: (
      <>
        肩への <TechLink code="TP" />・<TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/stretch/10.jpg",
    count: "1回",
    description:
      "軽くサムプレスで右肩をほぐしてから、クライアントの頭を左に倒します。右肩にパームプレスを行い、さらにサムプレスで右肩をほぐします。左肩も同様に行います。",
  },
  {
    title: "腰背部・腹部のストレッチ",
    image: "/images/thai/flow/stretch/11.jpg",
    count: "数回",
    description:
      "クライアントの背中を反らすように、背中にニープレスで圧を加えながら数回体を持ち上げます。",
  },
  {
    title: "前屈",
    image: "/images/thai/flow/stretch/12.jpg",
    count: "1往復",
    description:
      "クライアントの上体を起こし、パームプレスで背中に圧を加えます。前屈がつらい場合は、クライアントの膝を曲げて行いましょう。",
  },
];

export default function StretchFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          調整とストレッチ
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          SECTION.4 座位
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