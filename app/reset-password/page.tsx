"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log("auth event", event);

      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setMessage("新しいパスワードを設定できます。");
      }
    });

    const timer = setTimeout(() => {
      setReady(true);
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function updatePassword() {
    console.log("updatePassword clicked");

    if (!password || password.length < 6) {
      setMessage("6文字以上のパスワードを入力してください");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const updatePromise = supabase.auth.updateUser({
        password,
      });
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error("処理がタイムアウトしました。もう一度メールリンクから開き直してください。"));
        }, 10000)
      );
      
      const result = await Promise.race([
        updatePromise,
        timeoutPromise,
      ]);
      
      const { data, error } = result as Awaited<
        ReturnType<typeof supabase.auth.updateUser>
      >;

      console.log("update password data", data);
      console.log("update password error", error);

      if (error) throw error;

      await supabase.auth.signOut({ scope: "local" });

setMessage("パスワードを更新しました✨ 新しいパスワードでログインしてください。");

setTimeout(() => {
  router.push("/login");
}, 1500);

    } catch (error: any) {
      console.error("password update error", error);
      setMessage(`パスワード更新エラー: ${error.message || "原因不明"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-sky-50 p-4">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-2xl font-bold text-sky-700">
          パスワード再設定
        </h1>

        <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-sky-100">
          <label className="mb-2 block text-sm text-gray-600">
            新しいパスワード
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-sky-200 px-3 py-2 text-base text-gray-800 outline-none focus:border-sky-500"
          />

          <button
            type="button"
            onClick={updatePassword}
            disabled={!ready || saving}
            className="mt-4 w-full rounded-full bg-sky-500 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "更新中..." : "パスワードを更新"}
          </button>

          {message && (
            <p className="mt-3 whitespace-pre-wrap text-xs text-gray-500">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}