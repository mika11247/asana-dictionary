"use client"

import { useState } from "react"
import LillyFields from "@/components/crm/LillyFields"
import { lillyMemberships, lillyServices } from "@/lib/crmLilly"
import { supabase } from "@/lib/supabaseClient"

export default function LillyProfile({ customer, onSaved }) {
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const profile = customer.crm_lilly_profiles
  const membership = profile?.membership || "unknown"
  const services = profile?.service_codes || []

  async function save(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError("")
    try {
      const result = await supabase.rpc("crm_save_lilly_profile", {
        target_customer_id: customer.id,
        membership_code: draft.membership,
        selected_services: draft.services,
        nickname_value: draft.nickname,
      })
      if (result.error) throw result.error
      setDraft(null)
      await onSaved()
    } catch {
      setError("Lilly情報を保存できませんでした。")
    } finally {
      setSaving(false)
    }
  }

  return <section aria-label="Lilly専用情報" className="mt-5 rounded-2xl border border-sky-100 p-4">
    <h2 className="font-bold">Lilly専用情報</h2>
    {draft ? <form onSubmit={save}>
      <fieldset disabled={saving} className="mt-3 space-y-3">
        <label className="block text-sm font-semibold">呼び名（共通のニックネーム）
          <input value={draft.nickname} required={!customer.name} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })}
            className="mt-1 block min-h-11 w-full rounded-xl border border-gray-200 px-3 text-base" />
        </label>
        <LillyFields value={draft} onChange={setDraft} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="min-h-11 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white">Lilly情報を保存</button>
          <button type="button" onClick={() => setDraft(null)} className="min-h-11 text-sm">キャンセル</button>
        </div>
      </fieldset>
    </form> : <>
      <p className="mt-2 text-sm">会員種別：{lillyMemberships[membership]}</p>
      <p className="mt-1 text-sm">サービス：{services.length ? services.map((code) => lillyServices[code]).join("・") : "未選択"}</p>
      <button type="button" className="min-h-11 text-sm font-semibold text-sky-800"
        onClick={() => setDraft({ membership, services, nickname: customer.nickname || "" })}>Lilly情報を編集</button>
    </>}
  </section>
}
