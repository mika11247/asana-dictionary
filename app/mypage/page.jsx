"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const planLabels = {
  free: "Free",
  special: "Special",
  pro: "Pro",
};

const planLimits = {
  free: { asanas: 30, sequences: 3 },
  special: { asanas: 50, sequences: 10 },
  pro: { asanas: null, sequences: null },
};

export default function MyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [plan, setPlan] = useState("free");

  const [asanaCount, setAsanaCount] = useState(0);
  const [sequenceCount, setSequenceCount] = useState(0);

  const [newEmail, setNewEmail] = useState("");
const [newPassword, setNewPassword] = useState("");
const [accountSaving, setAccountSaving] = useState(false);

  useEffect(() => {
    fetchMyPage();
  }, []);

  async function fetchMyPage() {
    try {
      setLoading(true);
  
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
  
      console.log("user", user);
      console.log("userError", userError);
  
      if (userError || !user) {
        router.push("/login");
        return;
      }
  
      setUser(user);
  
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, plan")
        .eq("id", user.id)
        .maybeSingle();
  
      console.log("profile", profile);
      console.log("profileError", profileError);
  
      setDisplayName(profile?.display_name || "");
      setPlan(profile?.plan || "free");
  
      const { count: asanasCount, error: asanasError } = await supabase
        .from("asanas")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
  
      console.log("asanasCount", asanasCount);
      console.log("asanasError", asanasError);
  
      const { count: sequencesCount, error: sequencesError } = await supabase
        .from("sequences")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
  
      console.log("sequencesCount", sequencesCount);
      console.log("sequencesError", sequencesError);
  
      setAsanaCount(asanasCount || 0);
      setSequenceCount(sequencesCount || 0);
    } catch (error) {
      console.error("fetchMyPage error", error);
      alert("マイページの読み込みでエラーが出ました");
    } finally {
      setLoading(false);
    }
  }

  async function saveDisplayName() {
    if (!user) return;
  
    setSaving(true);
  
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          
        })
        .eq("id", user.id);
  
      if (error) throw error;
  
      alert("表示名を保存しました✨");
    } catch (error) {
      console.error("表示名保存エラー:", error);
      alert(`表示名の保存に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function changeEmail() {
    if (!newEmail) {
      alert("新しいメールアドレスを入力してください");
      return;
    }
  
    setAccountSaving(true);
  
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });
  
      if (error) throw error;
  
      alert(
        "確認メールを送信しました✨\nメール内のリンクを開くと、メールアドレス変更が完了します。"
      );
  
      setNewEmail("");
    } catch (error) {
      console.error("メール変更エラー:", error);
      alert(`メール変更エラー: ${error.message}`);
    } finally {
      setAccountSaving(false);
    }
  }
  
  async function changePassword() {
    if (!newPassword || newPassword.length < 6) {
      alert("パスワードは6文字以上で入力してください");
      return;
    }
  
    setAccountSaving(true);
  
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
  
    setAccountSaving(false);
  
    if (error) {
      alert(`パスワード変更エラー: ${error.message}`);
      return;
    }
  
    alert("パスワードを変更しました。");
    setNewPassword("");
  }
  
  async function deleteAccount() {
    const ok = window.confirm(
      "本当に退会しますか？\nアーサナ・シークエンス・プロフィール情報を削除します。"
    );
  
    if (!ok || !user) return;
  
    setAccountSaving(true);
  
    try {
      await supabase.from("sequence_items").delete().eq("user_id", user.id);
      await supabase.from("sequences").delete().eq("user_id", user.id);
      await supabase.from("asanas").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
  
      await supabase.auth.signOut();
  
      alert("退会処理をしました。");
      router.push("/login");
    } catch (error) {
      alert(`退会エラー: ${error.message}`);
    } finally {
      setAccountSaving(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isGoogleUser =
  user?.app_metadata?.provider === "google";

  const limits = planLimits[plan] || planLimits.free;

  if (loading) {
    return (
      <main className="min-h-screen bg-sky-50 p-4">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sky-50 p-4">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sky-700">My page</h1>
            <p className="mt-1 text-sm text-gray-500">
              アカウント情報と使用状況を確認できます。
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="rounded-full bg-white px-3 py-1 text-xs text-gray-600 shadow ring-1 ring-sky-100"
          >
            戻る
          </button>
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
          <h2 className="text-sm font-bold text-sky-700">プロフィール</h2>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500">表示名</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名を入力"
                className="mt-1 w-full rounded-2xl border border-sky-100 px-4 py-3 text-base text-gray-800 outline-none focus:border-sky-300"
              />
            </div>

            <button
              onClick={saveDisplayName}
              disabled={saving}
              className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
            >
              {saving ? "保存中..." : "表示名を保存"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
          <h2 className="text-sm font-bold text-sky-700">アカウント</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-bold text-gray-500">メールアドレス</p>
              <p className="mt-1 text-gray-800">{user?.email}</p>
            </div>

            {isGoogleUser ? (
  <div className="rounded-2xl bg-sky-50 p-4">
    <p className="text-xs font-bold text-gray-500">
      Googleログイン
    </p>

    <p className="mt-2 text-sm leading-relaxed text-gray-600">
      Googleアカウントでログイン中です。<br />
      メールアドレスやパスワードはGoogle側で管理されています。
    </p>
  </div>
) : (
  <>
    <div className="rounded-2xl bg-sky-50 p-4">
      <p className="text-xs font-bold text-gray-500">
        メールアドレス変更
      </p>

      <input
        type="email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        placeholder="新しいメールアドレス"
        className="mt-2 w-full rounded-2xl border border-sky-100 px-4 py-3 text-base text-gray-800 outline-none focus:border-sky-300"
      />

      <button
        onClick={changeEmail}
        disabled={accountSaving}
        className="mt-3 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
      >
        メールアドレスを変更
      </button>
    </div>

    <div className="rounded-2xl bg-sky-50 p-4">
      <p className="text-xs font-bold text-gray-500">
        パスワード変更
      </p>

      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="新しいパスワード"
        className="mt-2 w-full rounded-2xl border border-sky-100 px-4 py-3 text-base text-gray-800 outline-none focus:border-sky-300"
      />

      <button
        onClick={changePassword}
        disabled={accountSaving}
        className="mt-3 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
      >
        パスワードを変更
      </button>
    </div>
  </>
)}

            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-bold text-gray-500">現在のプラン</p>
              <p className="mt-1 text-lg font-bold text-sky-700">
                {planLabels[plan] || "Free"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
          <h2 className="text-sm font-bold text-sky-700">使用量</h2>

          <div className="mt-4 space-y-3">
            <UsageCard
              label="アーサナ"
              count={asanaCount}
              limit={limits.asanas}
            />

            <UsageCard
              label="シークエンス"
              count={sequenceCount}
              limit={limits.sequences}
            />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-red-100">
  <div className="space-y-3">
    <button
      onClick={logout}
      className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-600"
    >
      ログアウト
    </button>

    <button
      onClick={deleteAccount}
      disabled={accountSaving}
      className="w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
    >
      退会する
    </button>

    <p className="text-xs leading-relaxed text-red-400">
      ※現在の退会はアプリ内データ削除＋ログアウトです。Authユーザー完全削除は後でEdge Functionで対応予定。
    </p>
  </div>
</section>

      </div>
    </main>
  );
}

function UsageCard({ label, count, limit }) {
  const isUnlimited = limit === null;
  const percent = isUnlimited ? 0 : Math.min((count / limit) * 100, 100);

  return (
    <div className="rounded-2xl bg-sky-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700">{label}</p>
        <p className="text-sm font-bold text-sky-700">
          {isUnlimited ? `${count} / 無制限` : `${count} / ${limit}`}
        </p>
      </div>

      {!isUnlimited && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-sky-400"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {isUnlimited && (
        <p className="mt-2 text-xs text-gray-500">Proプランは無制限です。</p>
      )}
    </div>
  );
}