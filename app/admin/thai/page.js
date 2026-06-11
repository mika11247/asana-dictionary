import Link from "next/link";

export default function ThaiPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-emerald-50 p-6">
      <div className="mx-auto max-w-md pt-10">
        <Link href="/admin" className="text-sm text-gray-500">
          ← 管理者ルームへ戻る
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-800">
          🙌 タイ古式
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          タイ古式の学習ノート・手技メモを管理
        </p>

        <div className="mt-6 space-y-4">
          <Link href="/admin/thai/basic">
            <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <h2 className="text-lg font-bold text-gray-800">
                📖 基本手技
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                TP・PP・ECなどの基本手技を確認
              </p>
            </div>
          </Link>

          <Link href="/admin/thai/create">
            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <h2 className="text-lg font-bold text-gray-800">
                ➕ 手技登録
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                新しい手技・学習メモを追加
              </p>
            </div>
          </Link>

          <Link href="/admin/thai/flow">
  <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
    <h2 className="text-lg font-bold text-gray-800">
      📝 施術の流れ
    </h2>
    <p className="mt-1 text-sm text-gray-500">
      フルコース・短縮コースを確認
    </p>
  </div>
</Link>

          <Link href="/admin/thai/safety">
            <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
              <h2 className="text-lg font-bold text-gray-800">
                ⚠️ 禁忌・注意点
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                安全に関する大事なメモ
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}