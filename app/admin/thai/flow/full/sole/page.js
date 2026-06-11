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
    memo: "足裏全体をやさしく確認",
  },

  {
    title: (
      <>
        足底部全体への <TechLink code="FP" />
      </>
    ),
    image: "/images/thai/flow/sole/03.jpg",
    count: "2回",
    memo: "圧を少しずつ調整",
  },

  {
    title: (
      <>
        足底部中央への強い <TechLink code="HP" />
      </>
    ),
    image: "/images/thai/flow/sole/04.jpg",
    count: "1回",
    memo: "強くなりすぎないよう注意",
  },

  {
    title: (
      <>
        足底部全体への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/sole/05.jpg",
    count: "2往復ずつ",
    memo: "親指だけで押さず体重移動",
  },

  {
    title: (
      <>
        足底下部から上部への <TechLink code="TS" />
      </>
    ),
    image: "/images/thai/flow/sole/06.jpg",
    count: "5回",
    memo: "なめらかに滑らせる",
    point: "Yを描くようにすべらせる",
  },

  {
    title: (
      <>
        足底上部から下部への <TechLink code="TS" />
      </>
    ),
    image: "/images/thai/flow/sole/07.jpg",
    count: "5回",
    memo: "圧を抜きすぎない",
    point: "Aを描くようにすべらせる",
  },

  {
    title: (
      <>
        母指球・小指球への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/sole/08.jpg",
    count: "2セット",
    memo: "細かく圧を調整",
    point: "外側から内側へ向かって圧を加える",
  },

  {
    title: (
      <>
        足首への <TechLink code="FS" />
      </>
    ),
    image: "/images/thai/flow/sole/09.jpg",
    count: "5回",
    memo: "痛みがないか確認",
  },

  {
    title: (
      <>
        足の甲への <TechLink code="FS" />
      </>
    ),
    image: "/images/thai/flow/sole/10.jpg",
    count: "5回",
    memo: "やさしく流す",
  },

  {
    title: (
      <>
        アキレス腱への <TechLink code="FC" />
      </>
    ),
    image: "/images/thai/flow/sole/11.jpg",
    count: "1回",
    memo: "繊細な部位なので慎重に",
  },

  {
    title: (
      <>
        母指外転筋への <TechLink code="TC" />
      </>
    ),
    image: "/images/thai/flow/sole/12.jpg",
    count: "2往復",
    memo: "小さな円を意識",
    point: "母指外転筋のラインを意識",
  },

  {
    title: "指のけん引",
    image: "/images/thai/flow/sole/13.jpg",
    count: "1回",
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
    memo: "硬く当てすぎない",
  },

  {
    title: (
      <>
        足底部全体への <TechLink code="NS" />
      </>
    ),
    image: "/images/thai/flow/sole/15.jpg",
    count: "5回",
    memo: "痛みが出ない圧で",
  },

  {
    title: (
      <>
        足底部全体への <TechLink code="PP" />
      </>
    ),
    image: "/images/thai/flow/sole/16.jpg",
    count: "2往復",
    memo: "最後に広く整える",
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

        <div className="mt-6 space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="rounded-3xl border border-green-100 bg-white p-4 shadow-sm"
            >
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                  {index + 1}
                </div>

                <div className="flex-1">
                  <h2 className="font-bold text-gray-800">
                    {step.title}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    回数：{step.count}
                  </p>

                  {step.image && (
                    <img
                      src={step.image}
                      alt=""
                      className="mt-3 w-full rounded-2xl shadow-sm"
                    />
                  )}

                  <p className="mt-3 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                    {step.memo}
                  </p>

                  {step.point && (
                    <div className="mt-3 rounded-2xl bg-amber-50 p-3">
                      <p className="text-xs font-bold text-amber-700">
                        POINT
                      </p>

                      <p className="mt-1 text-sm text-amber-800">
                        {step.point}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}