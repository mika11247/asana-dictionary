"use client";

import { useState } from "react";
import Link from "next/link";

const groups = [
    {
        title: "親指",
        items: [
          {
            code: "TP",
            name: "サムプレス",
            image: "/images/thai/techniques/tp.jpg",
            description: "親指で圧を加える",
            memo: [
              "体重移動を使う",
              "肩に力を入れない"
            ]
          },
          {
            code: "TC",
            name: "サムサークル",
            image: "/images/thai/techniques/tc.jpg",
            description: "親指で円を描く",
            memo: [
              "小さな円を意識",
              "圧を抜かない"
            ]
          },
          {
            code: "TS",
            name: "サムスライド",
            image: "/images/thai/techniques/ts.jpg",
            description: "親指ですべらせる",
            memo: [
              "センに沿って行う"
            ]
          }
        ]
      },

      {
        title: "手掌",
        items: [
          {
            code: "PP",
            name: "パームプレス",
            image: "/images/thai/techniques/pp.jpg",
            description: "手のひらで圧を加える",
            memo: ["手首だけで押さず、体重移動を使う"]
          },
          {
            code: "BF",
            name: "バタフライ",
            image: "/images/thai/techniques/bf.jpg",
            description: "両手を近づけるように手のひら全体で圧を加える",
            memo: ["左右の手の圧をそろえる"]
          },
          {
            code: "PC",
            name: "パームサークル",
            image: "/images/thai/techniques/pc.jpg",
            description: "手のひらで円を描く",
            memo: ["大きく雑に回さず、相手の反応を見る"]
          },
          {
            code: "PS",
            name: "パームスライド",
            image: "/images/thai/techniques/ps.jpg",
            description: "手のひらですべらせる",
            memo: ["圧を抜きすぎず、なめらかに動かす"]
          },
        ],
      },
      {
        title: "肘",
        items: [
          {
            code: "EC",
            name: "エルボーサークル",
            image: "/images/thai/techniques/ec.jpg",
            description: "肘で円を描くように圧を加える",
            memo: ["圧が強くなりやすいので慎重に"]
          },
          {
            code: "EP",
            name: "エルボープレス",
            image: "/images/thai/techniques/ep.jpg",
            description: "肘で圧を加える",
            memo: ["骨に当てないように注意"]
          },
          {
            code: "ER",
            name: "エルボーローリング",
            image: "/images/thai/techniques/er.jpg",
            description: "肘をつけて前腕を回すように圧を加える",
            memo: ["強さを確認しながら行う"]
          },
        ],
      },
      {
        title: "指・拳",
        items: [
          {
            code: "FC",
            name: "フィンガーサークル",
            image: "/images/thai/techniques/fc.jpg",
            description: "指先で円を描くように圧を加える",
            memo: ["細かい部分に使いやすい"]
          },
          {
            code: "FS",
            name: "フィンガースライド",
            image: "/images/thai/techniques/fs.jpg",
            description: "指先または指で挟んですべらせる",
            memo: ["圧をかけすぎない"]
          },
          {
            code: "NC",
            name: "ナックルサークル",
            image: "/images/thai/techniques/nc.jpg",
            description: "拳や指の関節で円を描く",
            memo: ["当たり方が硬くなりすぎないように"]
          },
          {
            code: "NS",
            name: "ナックルスライド",
            image: "/images/thai/techniques/ns.jpg",
            description: "拳や指の関節ですべらせる",
            memo: ["痛みが出ない圧で行う"]
          },
        ],
      },
      {
        title: "下肢",
        items: [
          {
            code: "KP",
            name: "ニープレス",
            image: "/images/thai/techniques/kp.jpg",
            description: "膝で圧を加える",
            memo: ["体重が乗りすぎないように注意"]
          },
          {
            code: "HP",
            name: "ヒールプレス",
            image: "/images/thai/techniques/hp.jpg",
            description: "かかとで圧を加える",
            memo: ["足元を安定させて行う"]
          },
          {
            code: "FP",
            name: "フットプレス",
            image: "/images/thai/techniques/fp.jpg",
            description: "足裏全体で圧を加える",
            memo: ["踏み込みすぎない"]
          },
        ],
      },
      {
        title: "仕上げ",
        items: [
          {
            code: "CHOP",
            name: "チョップ",
            image: "/images/thai/techniques/chop.jpg",
            description: "手のひらを開き、小指側でたたく",
            memo: ["リズムよく軽めに"]
          },
          {
            code: "TAP",
            name: "タップ",
            image: "/images/thai/techniques/tap.jpg",
            description: "拳を軽く握り、小指側でたたく",
            memo: ["強く叩きすぎない"]
          },
        ],
      },
    ];

export default function ThaiBasicPage() {
  const [open, setOpen] = useState(null);

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link
          href="/admin/thai"
          className="text-sm text-gray-500"
        >
          ← タイ古式へ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          📖 基本手技
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          タイ古式ボディケアの基本手技一覧
        </p>

        <div className="mt-6 space-y-4">
          {groups.map((group, index) => (
            <div
              key={group.title}
              className="overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm"
            >
              <button
                onClick={() =>
                  setOpen(open === index ? null : index)
                }
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div>
  <h2 className="text-lg font-bold text-gray-800">
    {group.title}
  </h2>

  <div className="mt-2 flex flex-wrap gap-2">
    {group.items.map((item) => (
      <span
      key={item.code}
      className="rounded-xl border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
    >
      {item.code}
    </span>
    ))}
  </div>
</div>

                <span className="text-2xl">
                  {open === index ? "−" : "+"}
                </span>
              </button>

              {open === index && (
                <div className="border-t border-green-100 bg-green-50 p-4">
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div
                      id={item.code.toLowerCase()}
                      key={item.code}
                      className="rounded-2xl bg-white p-4"
                    >
  <div className="flex items-center gap-3 mb-3">
    <div className="rounded-xl bg-green-100 px-3 py-2 font-bold text-green-700">
      {item.code}
    </div>

    <div>
      <p className="font-semibold text-gray-800">
        {item.name}
      </p>
    </div>
  </div>

  {item.image && (
    <img
      src={item.image}
      alt={item.name}
      className="
mb-3
w-full
rounded-2xl
shadow-sm
"
    />
  )}

{item.description && (
  <p className="text-sm text-gray-600 mb-3">
    {item.description}
  </p>
)}

  {item.memo?.length > 0 && (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="mb-2 text-xs font-bold text-gray-500">
        美香メモ
      </p>

      <ul className="list-disc pl-5 text-sm text-gray-600">
        {item.memo.map((memo, i) => (
          <li key={i}>{memo}</li>
        ))}
      </ul>
    </div>
  )}
</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}