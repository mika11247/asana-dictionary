"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetSending, setResetSending] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!email || !password) {
      setMessage("メールアドレスとパスワードを入力してください");
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMessage("確認メールを送信しました✨ メール内のリンクを確認してください。");
        setMode("login");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.replace("/");
      router.refresh();
    } catch (error) {
      setMessage(error.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  async function sendPasswordResetEmail() {
    const targetEmail = resetEmail.trim();

    if (!targetEmail) {
      setMessage("再設定メールを送るメールアドレスを入力してください");
      return;
    }

    setResetSending(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage("パスワード再設定メールを送信しました✨");
      setResetEmail("");
    } catch (error) {
      setMessage(`送信エラー: ${error.message || "原因不明のエラー"}`);
    } finally {
      setResetSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <p className="mb-2 text-sm font-medium text-violet-500">
          Asana Dictionary
        </p>

        <h1 className="text-3xl font-bold text-gray-800">
          {isSignup ? "新規登録" : "ログイン"}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          {isSignup
            ? "アカウントを作成して、あなただけのアーサナ辞書を育てよう"
            : "ログインして、アーサナ辞書とシークエンスを管理しよう"}
        </p>

        {message && (
          <div className="mt-5 rounded-2xl bg-green-100 p-3 text-sm leading-relaxed text-green-700">
            {message}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              !isSignup ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"
            }`}
          >
            ログイン
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              isSignup ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:border-sky-300"
          />

          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:border-sky-300"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {loading
              ? "読み込み中..."
              : isSignup
                ? "アカウントを作成"
                : "ログイン"}
          </button>
        </form>

        {!isSignup && (
          <div className="mt-5 rounded-2xl bg-sky-50 p-4">
            <p className="text-sm font-bold text-sky-700">
              パスワードを忘れた方
            </p>

            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              登録したメールアドレスに、再設定用リンクを送信します。
            </p>

            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="登録メールアドレス"
              className="mt-3 w-full rounded-2xl border border-sky-100 px-4 py-3 text-base text-gray-800 outline-none focus:border-sky-300"
            />

            <button
              type="button"
              onClick={sendPasswordResetEmail}
              disabled={resetSending}
              className="mt-3 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
            >
              {resetSending ? "送信中..." : "再設定メールを送る"}
            </button>
          </div>
        )}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">または</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-bold text-gray-700 transition hover:bg-gray-50"
        >
          Googleで続ける
        </button>

        {isSignup && (
          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            登録後、確認メールが届く場合があります。メール内のリンクを開いてからログインしてください。
          </p>
        )}
      </div>
    </main>
  );
}