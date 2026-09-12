"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const CATEGORY_TABS = [
  { key: "all", label: "すべて" },
  { key: "yoga", label: "☀️ YOGA" },
  { key: "pilates", label: "🧘 PILATES" },
  { key: "training", label: "🏋️ TRAINING" },
];

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

export default function DemoPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadDemoItems();
  }, []);

  async function loadDemoItems() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("initial_sequence_items")
        .select(
          `
          id,
          asana_title,
          asana_sanskrit,
          yomi,
          main_category,
          types,
          strength,
          flexibility,
          memo,
          preset_key
        `
        )
        .eq("is_demo", true)
        .order("asana_title", { ascending: true });

      if (error) throw error;

      setItems(data || []);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "デモデータを読み込めませんでした。しばらくしてからもう一度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    const keyword = normalizeText(search.trim());

    return items.filter((item) => {
      const matchesCategory =
        category === "all" || item.main_category === category;

      if (!matchesCategory) return false;

      if (!keyword) return true;

      const searchTarget = [
        item.asana_title,
        item.asana_sanskrit,
        item.yomi,
        item.memo,
        ...(item.types || []),
      ]
        .map(normalizeText)
        .join(" ");

      return searchTarget.includes(keyword);
    });
  }, [items, category, search]);

  function goToSignup() {
    router.push("/login?mode=signup");
  }

  function goToLogin() {
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        {/* ヘッダー */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-500">
                🪷 Asana Dictionary
              </p>

              <h1 className="mt-2 text-2xl font-bold text-gray-800 sm:text-3xl">
                登録なしで体験
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                会員登録をしなくても、
                Asana Dictionaryの一部をお試しいただけます。
                <br />
                ヨガ・ピラティス・トレーニングなどを検索してみてください✨
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
              DEMO
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-sky-50 p-4">
            <p className="text-xs leading-relaxed text-gray-600">
              💡 無料登録すると、自分だけの辞書への追加・保存・
              シークエンス作成などが使えるようになります。
            </p>
          </div>
        </div>

        {/* カテゴリ */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategory(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  category === tab.key
                    ? "bg-gray-800 text-white shadow"
                    : "bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 検索 */}
        <div className="mt-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・読み方・種類から検索"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none placeholder:text-gray-400 focus:border-violet-300"
          />
        </div>

        {/* 件数 */}
        {!loading && !errorMessage && (
          <p className="mt-4 text-xs text-gray-400">
            {filteredItems.length}件のサンプル
          </p>
        )}

        {/* 読み込み */}
        {loading && (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            読み込み中...
          </div>
        )}

        {/* エラー */}
        {!loading && errorMessage && (
          <div className="mt-8 rounded-3xl bg-red-50 p-5 text-sm leading-relaxed text-red-600 ring-1 ring-red-100">
            {errorMessage}
          </div>
        )}

        {/* データなし */}
        {!loading &&
          !errorMessage &&
          filteredItems.length === 0 && (
            <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <p className="font-bold text-gray-700">
                該当する項目がありません
              </p>
              <p className="mt-2 text-sm text-gray-400">
                検索ワードやカテゴリを変えてみてください。
              </p>
            </div>
          )}

        {/* 辞書カード */}
        <div className="mt-5 space-y-4">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-800">
                    {item.asana_title}
                  </h2>

                  {item.asana_sanskrit && (
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                      {item.asana_sanskrit}
                    </p>
                  )}
                </div>

                <CategoryBadge category={item.main_category} />
              </div>

              {item.types?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.types.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-100"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}

              {item.memo && (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  {item.memo}
                </p>
              )}

              {(item.strength || item.flexibility) && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {item.strength && (
                    <div className="rounded-2xl bg-orange-50 p-3">
                      <p className="text-xs font-bold text-orange-600">
                        💪 筋力
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        {item.strength}
                      </p>
                    </div>
                  )}

                  {item.flexibility && (
                    <div className="rounded-2xl bg-sky-50 p-3">
                      <p className="text-xs font-bold text-sky-600">
                        🫧 柔軟性
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        {item.flexibility}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={goToSignup}
                className="mt-5 w-full rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-600 transition hover:bg-violet-100"
              >
                ＋ 自分の辞書で使う
              </button>
            </article>
          ))}
        </div>

        {/* 下部CTA */}
        {!loading && !errorMessage && (
          <div className="mt-8 rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-6 text-white shadow-lg">
            <p className="text-sm font-bold text-white/80">
              気に入ったら無料ではじめよう
            </p>

            <h2 className="mt-1 text-xl font-bold">
              自分だけのMovement Dictionaryへ
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-white/80">
              アーサナやエクササイズを追加して、
              シークエンス作成にも活用できます。
            </p>

            <button
              type="button"
              onClick={goToSignup}
              className="mt-5 w-full rounded-2xl bg-white px-4 py-3 font-bold text-violet-600 shadow"
            >
              無料で新規登録
            </button>

            <button
              type="button"
              onClick={goToLogin}
              className="mt-2 w-full px-4 py-2 text-sm font-bold text-white/90"
            >
              すでにアカウントをお持ちの方
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          className="mx-auto mt-6 block px-4 py-2 text-sm text-gray-400"
        >
          ← 戻る
        </button>
      </div>
    </main>
  );
}

function CategoryBadge({ category }) {
  if (category === "pilates") {
    return (
      <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
        PILATES
      </span>
    );
  }

  if (category === "training") {
    return (
      <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
        TRAINING
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
      YOGA
    </span>
  );
}