import Link from "next/link";

const categories = [
  {
    title: "📖 施術の流れ",
    items: [
      {
        title: "フルコース",
        description:
          "うつ伏せ・横向き・仰向け・座位・仕上げ",
        href: "/admin/thai/flow/full",
      },
      {
        title: "スタンダード",
        description:
          "90分版（作成予定）",
        href: "/admin/thai/flow/standard",
      },
      {
        title: "ショート",
        description:
          "60分版（作成予定）",
        href: "/admin/thai/flow/short",
      },
    ],
  },

  {
    title: "➕ オプション",
    items: [
      {
        title: "腹部オプション",
        description:
          "腹部への施術",
        href: "/admin/thai/flow/option-belly",
      },
      {
        title: "胸部オプション",
        description:
          "胸部への施術",
        href: "/admin/thai/flow/option-chest",
      },
    ],
  },

  {
    title: "🔥 応用",
    items: [
      {
        title: "応用ストレッチ",
        description:
          "応用手技・ストレッチ",
        href: "/admin/thai/advanced",
      },
    ],
  },
];

export default function ThaiFlowPage() {
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
          📝 施術の流れ
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          コース・オプション・応用手技
        </p>

        <div className="mt-6 space-y-6">
          {categories.map((category) => (
            <section
              key={category.title}
              className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-800">
                {category.title}
              </h2>

              <div className="mt-4 space-y-3">
                {category.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                  >
                    <div className="rounded-2xl bg-green-50 p-4 transition hover:bg-green-100">
                      <div className="flex items-center">
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {item.title}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {item.description}
                          </p>
                        </div>

                        <span className="ml-auto text-gray-400">
                          ›
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}