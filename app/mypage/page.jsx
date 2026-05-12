"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

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
  const { refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [plan, setPlan] = useState("free");
  const [status, setStatus] = useState("active");

  const [deletedAt, setDeletedAt] = useState(null);

  const [asanaCount, setAsanaCount] = useState(0);
  const [sequenceCount, setSequenceCount] = useState(0);

  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState("");

  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

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

      if (userError || !user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, plan, status, deleted_at")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(profile?.display_name || "");
      setPlan(profile?.plan || "free");
      setStatus(profile?.status || "active");
      setDeletedAt(profile?.deleted_at || null);

      const { count: asanasCount } = await supabase
        .from("asanas")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: sequencesCount } = await supabase
        .from("sequences")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      setAsanaCount(asanasCount || 0);
      setSequenceCount(sequencesCount || 0);
    } catch (error) {
      console.error("fetchMyPage error", error);
      setMessage("マイページの読み込みでエラーが出ました");
    } finally {
      setLoading(false);
    }
  }

  async function saveDisplayName() {
    if (!user) return;

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile(user);
      setMessage("表示名を保存しました✨");
    } catch (error) {
      console.error("表示名保存エラー:", error);
      setMessage(`表示名の保存に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function changeEmail() {
    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail) {
      setMessage("新しいメールアドレスを入力してください");
      return;
    }

    if (trimmedEmail === user?.email) {
      setMessage("現在のメールアドレスと同じです");
      return;
    }

    setEmailSaving(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        email: trimmedEmail,
      });

      if (error) throw error;

      setMessage(
        "確認メールを送信しました✨ メール内のリンクを開くと、メールアドレス変更が完了します。"
      );
      setNewEmail("");
    } catch (error) {
      console.error("メール変更エラー:", error);
      setMessage(`メール変更エラー: ${error.message || "原因不明のエラー"}`);
    } finally {
      setEmailSaving(false);
    }
  }

  async function sendPasswordResetEmail() {
    if (!user?.email) {
      setMessage("メールアドレスを取得できませんでした");
      return;
    }

    setPasswordSaving(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage("パスワード再設定メールを送信しました✨");
    } catch (error) {
      console.error("パスワード再設定エラー:", error);
      setMessage(`パスワード再設定エラー: ${error.message}`);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function deleteAccount() {
    const ok = window.confirm(
      "退会申請をしますか？\n\nアカウントは14日間の削除予約状態になります。\n14日以内なら退会申請を取り消せます。"
    );

    if (!ok || !user) return;

    setDeleteSaving(true);
    setMessage("");

    try {
      const now = new Date().toISOString();

const { error } = await supabase
  .from("profiles")
  .update({
    status: "scheduled_deletion",
    deleted_at: now,
  })
  .eq("id", user.id);

if (error) throw error;

setStatus("scheduled_deletion");
setDeletedAt(now);

setMessage("退会申請を受け付けました。14日以内なら取り消せます。");
    } catch (error) {
      console.error("退会エラー:", error);
      setMessage(`退会エラー: ${error.message}`);
    } finally {
      setDeleteSaving(false);
    }
  }

  async function cancelDeletion() {
    if (!user) return;

    setDeleteSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "active",
          deleted_at: null,
        })
        .eq("id", user.id);

      if (error) throw error;

      setStatus("active");
setDeletedAt(null);

setMessage("退会申請を取り消しました✨");
    } catch (error) {
      console.error("復旧エラー:", error);
      setMessage(`復旧エラー: ${error.message}`);
    } finally {
      setDeleteSaving(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  }

  const isGoogleUser = user?.app_metadata?.provider === "google";
  const limits = planLimits[plan] || planLimits.free;

  const deletionDate = deletedAt ? new Date(deletedAt) : null;
const scheduledDeleteDate = deletionDate
  ? new Date(deletionDate.getTime() + 14 * 24 * 60 * 60 * 1000)
  : null;

const remainingDays = scheduledDeleteDate
  ? Math.max(
      0,
      Math.ceil(
        (scheduledDeleteDate.getTime() - new Date().getTime()) /
          (24 * 60 * 60 * 1000)
      )
    )
  : null;

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
        {message && (
          <div className="rounded-2xl bg-green-100 p-3 text-sm leading-relaxed text-green-700">
            {message}
          </div>
        )}

        {status === "scheduled_deletion" && (
  <div className="rounded-2xl bg-red-50 p-4 text-sm leading-relaxed text-red-600 ring-1 ring-red-100">
    <p className="font-bold">このアカウントは退会申請中です。</p>

    <div className="mt-3 space-y-1 text-xs text-red-500">
      {deletionDate && (
        <p>退会申請日：{deletionDate.toLocaleDateString("ja-JP")}</p>
      )}

      {scheduledDeleteDate && (
        <p>
          完全削除予定日：
          {scheduledDeleteDate.toLocaleDateString("ja-JP")}
        </p>
      )}

      {remainingDays !== null && (
        <p className="font-bold">残り日数：{remainingDays}日</p>
      )}
    </div>

    <p className="mt-3">
      14日以内なら退会申請を取り消せます。
    </p>
  </div>
)}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sky-700">My page</h1>
            <p className="mt-1 text-sm text-gray-500">
              アカウント情報と使用状況を確認できます。
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-white px-3 py-1 text-xs text-gray-600 shadow ring-1 ring-sky-100"
          >
            戻る
          </button>
        </div>

        {status !== "scheduled_deletion" && (
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
              type="button"
              onClick={saveDisplayName}
              disabled={saving || status === "scheduled_deletion"}
              className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
            >
              {saving ? "保存中..." : "表示名を保存"}
            </button>
          </div>
        </section>
        )}

        {status !== "scheduled_deletion" && (
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
                  Googleアカウントでログイン中です。
                  <br />
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
                    type="button"
                    onClick={changeEmail}
                    disabled={emailSaving || status === "scheduled_deletion"}
                    className="mt-3 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
                  >
                    {emailSaving ? "送信中..." : "メールアドレスを変更"}
                  </button>
                </div>

                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-xs font-bold text-gray-500">
                    パスワード変更
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    パスワード変更用のメールを送信します。
                  </p>

                  <button
                    type="button"
                    onClick={sendPasswordResetEmail}
                    disabled={passwordSaving || status === "scheduled_deletion"}
                    className="mt-3 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
                  >
                    {passwordSaving
                      ? "送信中..."
                      : "パスワード再設定メールを送る"}
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
)}

{status !== "scheduled_deletion" && (
  <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-sky-100">
    <h2 className="text-sm font-bold text-sky-700">使用量</h2>

          <div className="mt-4 space-y-3">
            <UsageCard label="アーサナ" count={asanaCount} limit={limits.asanas} />
            <UsageCard
              label="シークエンス"
              count={sequenceCount}
              limit={limits.sequences}
            />
          </div>
        </section>
      )}

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-red-100">
          <div className="space-y-3">
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-600"
            >
              ログアウト
            </button>

            {status === "scheduled_deletion" && (
              <button
                type="button"
                onClick={cancelDeletion}
                disabled={deleteSaving}
                className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
              >
                {deleteSaving ? "取り消し中..." : "退会申請を取り消す"}
              </button>
            )}

            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleteSaving || status === "scheduled_deletion"}
              className="w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
            >
              {status === "scheduled_deletion"
                ? "退会申請中"
                : deleteSaving
                  ? "退会処理中..."
                  : "退会する"}
            </button>

            <p className="text-xs leading-relaxed text-red-400">
              ※退会後、アカウントは14日間の削除予約状態になります。完全削除は後日対応予定です。
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