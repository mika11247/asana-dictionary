import Link from "next/link";

const courses = [
  {
    title: "フルコース",
    description: "うつ伏せ・横向き・仰向け・座位・仕上げ",
    href: "/admin/thai/flow/full",
  },
];

export default function ThaiFlowPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-8">
        <Link href="/admin/thai" className="text-sm text-gray-500">
          ← タイ古式へ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          📝 施術の流れ
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          フルコース・短縮コースの流れを確認
        </p>

        <div className="mt-6 space-y-4">
          {courses.map((course) => (
            <Link key={course.href} href={course.href}>
              <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
                <h2 className="text-lg font-bold text-gray-800">
                  {course.title}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {course.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}