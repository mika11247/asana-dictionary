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
    loadDemoData();
  }, []);

  async function loadDemoData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("initial_sequence_items")
        .select(`
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
        `)
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

        {/* =========================
            INTRO
        ========================= */}

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
                辞書を検索したり、実際のシークエンス・テンプレート画面を
                見てみてください✨
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
              DEMO
            </span>

          </div>

          <div className="mt-5 rounded-2xl bg-sky-50 p-4">
            <p className="text-xs leading-relaxed text-gray-600">
              💡 無料登録すると、自分だけの辞書への追加・保存・編集、
              シークエンス作成、今日のおすすめなどが使えるようになります。
            </p>
          </div>
        </div>


        {/* =========================
            DEMO MENU
        ========================= */}

        <div className="mt-6 grid grid-cols-3 gap-2">

          <a
            href="#dictionary"
            className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-2xl">📚</div>

            <p className="mt-2 text-xs font-bold text-gray-700">
              辞書
            </p>

            <p className="mt-1 hidden text-[10px] text-gray-400 sm:block">
              サンプル検索
            </p>
          </a>


          <button
            type="button"
            onClick={() => router.push("/sequences")}
            className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-2xl">🌙</div>

            <p className="mt-2 text-xs font-bold text-gray-700">
              シークエンス
            </p>

            <p className="mt-1 hidden text-[10px] text-gray-400 sm:block">
              実際の画面へ
            </p>
          </button>


          <button
            type="button"
            onClick={() => router.push("/presets")}
            className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-2xl">📦</div>

            <p className="mt-2 text-xs font-bold text-gray-700">
              テンプレート
            </p>

            <p className="mt-1 hidden text-[10px] text-gray-400 sm:block">
              実際の画面へ
            </p>
          </button>

        </div>


        {/* =========================
            QUICK EXPERIENCE
        ========================= */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">

          <button
            type="button"
            onClick={() => router.push("/sequences")}
            className="rounded-3xl bg-gradient-to-r from-sky-50 to-violet-50 p-5 text-left shadow-sm ring-1 ring-violet-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-bold text-violet-500">
              🌙 SEQUENCE
            </p>

            <h2 className="mt-1 font-bold text-gray-800">
              シークエンスを体験
            </h2>

            <p className="mt-2 text-xs leading-6 text-gray-500">
              初期登録される太陽礼拝Aを、
              実際のシークエンス画面で見ることができます。
            </p>

            <p className="mt-3 text-xs font-bold text-violet-600">
              見てみる →
            </p>
          </button>


          <button
            type="button"
            onClick={() => router.push("/presets")}
            className="rounded-3xl bg-gradient-to-r from-emerald-50 to-sky-50 p-5 text-left shadow-sm ring-1 ring-emerald-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-bold text-emerald-500">
              📦 TEMPLATE
            </p>

            <h2 className="mt-1 font-bold text-gray-800">
              テンプレートを見る
            </h2>

            <p className="mt-2 text-xs leading-6 text-gray-500">
              ヨガ・ピラティス・トレーニングなど、
              実際に用意されているテンプレートを確認できます。
            </p>

            <p className="mt-3 text-xs font-bold text-emerald-600">
              見てみる →
            </p>
          </button>

        </div>


        {/* =========================
            LOADING / ERROR
        ========================= */}

        {loading && (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            読み込み中...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="mt-8 rounded-3xl bg-red-50 p-5 text-sm leading-relaxed text-red-600 ring-1 ring-red-100">
            {errorMessage}
          </div>
        )}


        {/* =========================
            DICTIONARY
        ========================= */}

        {!loading && !errorMessage && (
          <section
            id="dictionary"
            className="scroll-mt-24 pt-10"
          >

            <div>
              <p className="text-xs font-bold tracking-widest text-violet-400">
                DICTIONARY
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-800">
                📚 辞書を体験
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                ヨガ・ピラティス・トレーニングの一部を検索できます。
              </p>
            </div>


            {/* カテゴリ */}

            <div className="mt-5 overflow-x-auto">
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


            <p className="mt-4 text-xs text-gray-400">
              {filteredItems.length}件のサンプル
            </p>


            {filteredItems.length === 0 && (
              <div className="mt-5 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">

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

                      <h3 className="text-lg font-bold text-gray-800">
                        {item.asana_title}
                      </h3>

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

          </section>
        )}


        {/* =========================
            BOTTOM EXPERIENCE LINKS
        ========================= */}

        {!loading && !errorMessage && (
          <div className="mt-12 grid gap-3 sm:grid-cols-2">

            <button
              type="button"
              onClick={() => router.push("/sequences")}
              className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100"
            >
              <p className="font-bold text-gray-700">
                🌙 シークエンスも見てみる
              </p>

              <p className="mt-1 text-xs text-gray-400">
                太陽礼拝Aの構成を体験 →
              </p>
            </button>


            <button
              type="button"
              onClick={() => router.push("/presets")}
              className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100"
            >
              <p className="font-bold text-gray-700">
                📦 テンプレートも見てみる
              </p>

              <p className="mt-1 text-xs text-gray-400">
                実際のテンプレート一覧へ →
              </p>
            </button>

          </div>
        )}


        {/* =========================
            CTA
        ========================= */}

        {!loading && !errorMessage && (
          <div className="mt-8 rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-6 text-white shadow-lg">

            <p className="text-sm font-bold text-white/80">
              気に入ったら無料ではじめよう
            </p>

            <h2 className="mt-1 text-xl font-bold">
              自分だけのMovement Dictionaryへ
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-white/80">
              自分の辞書を作って、アーサナやエクササイズを保存・編集。
              シークエンス作成などにも活用できます。
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


/* =====================================================
   CATEGORY BADGE
===================================================== */

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