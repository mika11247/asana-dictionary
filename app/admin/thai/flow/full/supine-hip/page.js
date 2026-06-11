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
        足への <TechLink code="TP" />
      </>
    ),
    image: "/images/thai/flow/supine-hip/01.jpg",
    count: "1回",
    description: "左右それぞれの足の内側を、サムプレスで同時に圧を加えます。",
  },
  {
    title: "足首・脛骨外側のストレッチ",
    image: "/images/thai/flow/supine-hip/02.jpg",
    count: "1回",
    description: "両足のつま先を内側に向け、足の甲に圧を加えて伸ばします。",
  },
  {
    title: "下腿部後側への掌圧",
    image: "/images/thai/flow/supine-hip/03.jpg",
    count: "2往復",
    description:
      "クライアントの左脚を立てて両脚で挟むように座り、下腿部を引っ張るように圧を加えます。",
  },
  {
    title: "腰部への掌圧",
    image: "/images/thai/flow/supine-hip/04.jpg",
    count: "2往復",
    description:
      "腰部を包むように手を組み、膝下から腰部まで圧を加えます。",
  },
  {
    title: "大腿部への掌圧",
    image: "/images/thai/flow/supine-hip/05.jpg",
    count: "2往復",
    description:
      "腰部に続いて、大腿部から膝上まで圧を加えます。",
  },
  {
    title: (
      <>
        大腿部後側への3段階の <TechLink code="FP" />①
      </>
    ),
    image: "/images/thai/flow/supine-hip/06.jpg",
    count: "1回",
    description:
      "左足首を両手で持ち、臀部の下に片足をセットします。体を後ろに倒しながら、つま先によるフットプレスで圧を加えます。",
    point:
      "施術者は背中を床に近づけ、体を完全に倒してフットプレスを行います。",
  },
  {
    title: (
      <>
        大腿部後側への3段階の <TechLink code="FP" />②
      </>
    ),
    image: "/images/thai/flow/supine-hip/07.jpg",
    count: "1回",
    description:
      "一度体を起こし、もう片方の足をセットしてある足の上に乗せてから、体を後ろに倒しながら圧を加えます。",
    point:
      "ここでの施術者は、体を完全に倒さないままフットプレスを行います。",
  },
  {
    title: (
      <>
        大腿部後側への3段階の <TechLink code="FP" />③
      </>
    ),
    image: "/images/thai/flow/supine-hip/08.jpg",
    count: "1回",
    description:
      "再び体を起こし、上に乗せた足のつま先をクライアントの膝裏に移動させ、体を後ろに倒しながら圧を加えます。この後、7、6の順でもう一度行います。",
    point:
      "ここでの施術者は、体を完全に倒さないままフットプレスを行います。",
  },
  {
    title: (
      <>
        大腿部内側への <TechLink code="HP" />
      </>
    ),
    image: "/images/thai/flow/supine-hip/09.jpg",
    count: "数回",
    description:
      "クライアントの左脚を外側に倒し、大腿部の内側にヒールプレスで数回圧を加えます。",
  },
  {
    title: "骨盤のストレッチ",
    image: "/images/thai/flow/supine-hip/10.jpg",
    count: "1回",
    description:
      "脚は外側に倒したまま、右手でクライアントの左膝の上を、左手で右の股関節をゆっくり押さえ、体重をかけてストレッチします。",
  },
  {
    title: "臀部と股関節のストレッチ",
    image: "/images/thai/flow/supine-hip/11.jpg",
    count: "1回",
    description:
      "左脚を持ち上げ、左足底部を施術者の右脚の付け根で固定し、ゆっくり前に体重をかけます。",
  },
  {
    title: "腰背部のストレッチ①",
    image: "/images/thai/flow/supine-hip/12.jpg",
    count: "1回",
    description:
      "左膝を内側に曲げて、ゆっくりと体重をかけます。臀部がマットから浮かないように、手で押さえましょう。",
  },
  {
    title: "腰背部のストレッチ②",
    image: "/images/thai/flow/supine-hip/13.jpg",
    count: "1回",
    description:
      "膝を内側に向けたままマットに下ろし、あまり体重をかけないように、左膝の上を両手で軽く押さえます。",
  },
  {
    title: "腰背部のツイスト①",
    image: "/images/thai/flow/supine-hip/14.jpg",
    count: "数回",
    description:
      "クライアントの左脚を右脚にクロスさせ、左脚の膝を左手で、左肩を右手で固定し、腰を伸ばすようにしてストレッチします。徐々に脚を上へ移動させながら、数回行います。",
    point:
      "脚の柔軟性に応じて、どこまで膝を胸の位置に近づけるかを決めます。",
  },
  {
    title: "腰背部のツイスト②",
    image: "/images/thai/flow/supine-hip/15.jpg",
    count: "1回",
    description:
      "クライアントの左膝の裏に、施術者の膝下を当てて、ゆっくりストレッチを行います。",
    point:
      "股関節が柔らかい場合は、強めに体を伸ばすようにしましょう。",
  },
  {
    title: (
      <>
        大腿部後側への <TechLink code="PP" />（4の字ストレッチ）
      </>
    ),
    image: "/images/thai/flow/supine-hip/16.jpg",
    count: "2往復",
    description:
      "左脚は右脚にクロスさせたまま、クライアントの右脚を持ち上げて施術者の体で支えます。さらに、左大腿部の後側を、右手のパームプレスで圧を加えます。",
    point:
      "クライアントの様子を見ながら、余裕があれば行いましょう。",
  },
  {
    title: "足首とふくらはぎのストレッチ",
    image: "/images/thai/flow/supine-hip/17.jpg",
    count: "1回",
    description:
      "クライアントの脚を伸ばしたまま、右足かかとを持ち、膝を押さえて、足首とふくらはぎのストレッチを行います。",
    point:
      "クライアントの様子を見ながら、余裕があれば行いましょう。",
  },
  {
    title: "脚のポジション調整",
    image: "/images/thai/flow/supine-hip/18.jpg",
    count: "1回",
    description:
      "脚全体を軽く揺らし、脚のポジションを調整します。",
  },
];

export default function SupineHipFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai/flow/full" className="text-sm text-gray-500">
          ← フルコースへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          脚・腰部への施術
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