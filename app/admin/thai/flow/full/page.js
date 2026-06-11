import Link from "next/link";

const sections = [
  {
    title: "SECTION.1 うつ伏せ",
    items: [
      {
        title: "足底部への施術",
        href: "/admin/thai/flow/full/sole",
        count: "16手順",
        status: "completed",
      },
      {
        title: "下腿部への施術",
        href: "/admin/thai/flow/full/lower-leg",
        count: "未作成",
      },
      {
        title: "大腿部・臀部への施術",
        href: "/admin/thai/flow/full/thigh",
        count: "未作成",
      },
      {
        title: "仙腸関節の調整",
        href: "/admin/thai/flow/full/pelvis",
        count: "未作成",
      },
      {
        title: "背部への施術",
        href: "/admin/thai/flow/full/back",
        count: "未作成",
      },
    ],
  },

  {
    title: "SECTION.2 横向き",
    items: [
      {
        title: "下腿部・大腿部への施術",
        href: "/admin/thai/flow/full/side-leg",
        count: "未作成",
      },
      {
        title: "臀部・腰部・背部への施術",
        href: "/admin/thai/flow/full/side-back",
        count: "未作成",
      },
    ],
  },

  {
    title: "SECTION.3 仰向け",
    items: [
      {
        title: "つま先から足首・下腿部への施術",
        href: "/admin/thai/flow/full/supine-leg",
        count: "未作成",
      },
      {
        title: "脚・腰への施術",
        href: "/admin/thai/flow/full/supine-hip",
        count: "未作成",
      },
      {
        title: "手・腕への施術",
        href: "/admin/thai/flow/full/arm",
        count: "未作成",
      },
      {
        title: "肩・首・頭部への施術",
        href: "/admin/thai/flow/full/head",
        count: "未作成",
      },
    ],
  },

  {
    title: "SECTION.4 座位",
    items: [
      {
        title: "首・肩・背部への施術",
        href: "/admin/thai/flow/full/seated-back",
        count: "未作成",
      },
      {
        title: "調整とストレッチ",
        href: "/admin/thai/flow/full/stretch",
        count: "未作成",
      },
    ],
  },

  {
    title: "SECTION.5 仕上げ",
    items: [
      {
        title: "仕上げの施術",
        href: "/admin/thai/flow/full/finish",
        count: "未作成",
      },
    ],
  },
];

export default function ThaiFullCoursePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link
          href="/admin/thai/flow"
          className="text-sm text-gray-500"
        >
          ← 施術の流れへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          📖 フルコース
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          基本の施術順を確認
        </p>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-800">
                {section.title}
              </h2>

              <ol className="mt-4 space-y-3">
                {section.items.map((item, index) => (
                  <li
                    key={`${section.title}-${index}`}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-2xl bg-green-50 p-3 text-sm transition hover:bg-green-100"
                    >
                      <span className="font-bold text-green-700">
                        {index + 1}
                      </span>

                      <span className="flex-1 text-gray-700">
                        {item.title}
                      </span>

                      {item.status === "completed" && (
                        <span className="text-green-600">
                          ✓
                        </span>
                      )}

                      <span className="text-xs text-gray-400">
                        {item.count}
                      </span>

                      <span className="text-gray-400">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}