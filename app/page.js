// src/app/page.js
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-8">🧘‍♀️ アーサナ辞書アプリ</h1>
      
      <Link href="/asanas">
        <button className="bg-blue-500 text-white px-6 py-3 rounded-xl mb-4">アーサナ一覧を見る</button>
      </Link>

      <Link href="/asana-create">
        <button className="bg-green-500 text-white px-6 py-3 rounded-xl mb-4">アーサナを登録する</button>
      </Link>
    </main>
  );
}
