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
    title: "腰のストレッチ",
    image: "/images/thai/flow/seated-back/01.jpg",
    count: "1回",
    description:
      "クライアントの両脚を持ち、膝を曲げます。膝を胸に近づけるように押し、腰を伸ばします。",
    point:
      "膝を胸に近づけることで、腰が伸びます。体が硬い場合は、無理に押さないようにしましょう。",
  },
  {
    title: "臀部・腰のストレッチ",
    image: "/images/thai/flow/seated-back/02.jpg",
    count: "1回",
    description:
      "膝を曲げたまま腰部をクロスさせ、胸に近づけて臀部と腰をストレッチします。終えたら脚を逆に組み替えて、同様に伸ばします。",
    point:
      "膝が痛い、または硬い場合は行わないようにしましょう。",
  },
  {
    title: "全身のストレッチ",
    image: "/images/thai/flow/seated-back/03.jpg",
    count: "2回",
    description:
      "脚を交差させたまま施術者の膝で固定し、クライアントの両腕を持ちます。腕を引き上げ、全身をストレッチします。最後に、腕を持ったまま後ろに下がり、クライアントを起き上がらせます。",
    point:
      "膝が痛い、または硬い場合は、クライアントの脚をクロスさせずに施術者の大腿部にセットし、ゆっくりと引き上げましょう。",
  },
  {
    title: (
      <>
        肩への <TechLink code="ER" />①
      </>
    ),
    image: "/images/thai/flow/seated-back/04.jpg",
    count: "1回",
    description:
      "施術者の左前腕をクライアントの右側頭部に軽く添えて固定します。右前腕を右肩に置き、外側に回すようにエルボーローリングで圧を加えます。",
    point:
      "こり具合に合わせて回数を調整します。また、鎖骨を押さないように注意しましょう。",
  },
  {
    title: (
      <>
        肩への <TechLink code="ER" />②
      </>
    ),
    image: "/images/thai/flow/seated-back/05.jpg",
    count: "1回",
    description:
      "反対側も同様に行います。",
    point:
      "どちらの側で行う場合も、クライアントが坐骨に対して真っすぐ座れない場合は、肩甲骨の内側のきわ付近に膝を当てて体を支えましょう。",
  },
  {
    title: (
      <>
        肩甲骨への <TechLink code="EP" />①
      </>
    ),
    image: "/images/thai/flow/seated-back/06.jpg",
    count: "2往復",
    description:
      "左手でクライアントの右手を持ち、肩甲骨の内側のふちに左肘でエルボープレスで圧を加えます。",
    point:
      "肩甲骨のきわがわかりにくい場合は、クライアントの肘を軽く後ろに引くとよいでしょう。",
  },
  {
    title: (
      <>
        肩甲骨への <TechLink code="EP" />②
      </>
    ),
    image: "/images/thai/flow/seated-back/07.jpg",
    count: "2往復",
    description:
      "反対側も同様に行います。",
  },
];

export default function SeatedBackFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          首・肩・背部への施術
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