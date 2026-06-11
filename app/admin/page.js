export default function AdminPage() {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 p-6">
        <div className="mx-auto max-w-md">
  
          <h1 className="mb-6 text-3xl font-bold text-gray-800">
            🔒 管理者ルーム
          </h1>
  
          <p className="mb-6 text-sm text-gray-500">
            管理者専用ページ
          </p>
  
          <a
            href="/admin/thai"
            className="block rounded-3xl border border-green-100 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl">
                🙌
              </div>
  
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  タイ古式
                </h2>
  
                <p className="text-sm text-gray-500">
                  学習ノート・手技メモ
                </p>
              </div>
            </div>
          </a>
  
        </div>
      </main>
    );
  }