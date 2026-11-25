"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { contactRestrictions, decisionLabels, preferenceLabels, tokyoDatetime } from "@/lib/crmNus"

const inputClass = "mt-1 block w-full rounded-xl border border-slate-300 p-2 text-base"
const coverageLabels = { outreach: "営業・勧誘・案内", all_contact: "事務連絡を含むすべて" }

async function readPreferences(customerId, hasNus) {
  let history = supabase.from("crm_contact_preference_events")
    .select("id, scope, decision, coverage, confirmed_at, reason").eq("customer_id", customerId)
    .order("confirmed_at", { ascending: false }).order("id", { ascending: false })
  let current = supabase.from("crm_contact_preferences_current")
    .select("scope, decision, coverage").eq("customer_id", customerId)
  if (!hasNus) {
    history = history.eq("scope", "global")
    current = current.eq("scope", "global")
  }
  const [events, effective] = await Promise.all([history, current])
  if (events.error || effective.error) throw new Error("連絡意思の履歴を読み込めませんでした。")
  return { history: events.data, effective: effective.data }
}

export default function ContactPreferences({ customerId, hasNus, activeNus }) {
  const [data, setData] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    readPreferences(customerId, hasNus).then((result) => {
      if (mounted) setData(result)
    }).catch((failure) => { if (mounted) setError(failure.message) })
    return () => { mounted = false }
  }, [customerId, hasNus])

  const history = data?.history
  const current = new Map(data?.effective.map((item) => [item.scope, item]))
  const restrictions = contactRestrictions(data?.effective || [])

  function change(values) {
    setDraft({ ...draft, ...values, confirmed: false, requestId: crypto.randomUUID() })
  }

  async function save(event) {
    event.preventDefault()
    if (!draft.confirmed || saving) return
    setSaving(true)
    setError("")
    try {
      const { error } = await supabase.rpc("crm_record_contact_preference", {
        target_customer_id: customerId,
        requested_scope: draft.scope,
        requested_decision: draft.decision,
        requested_coverage: draft.coverage,
        effective_at: `${draft.confirmedAt}+09:00`,
        optional_reason: draft.reason,
        dedup_id: draft.requestId,
        expressly_confirmed: draft.confirmed,
      })
      if (error) throw new Error(error.code === "23505"
        ? "同じ対象範囲・確認日時の記録が既にあります。確認日時を確認してください。"
        : "連絡意思を保存できませんでした。日時と対象範囲を確認してください。")
      setData(await readPreferences(customerId, hasNus))
      setDraft(null)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm" aria-label="連絡意思">
      <h2 className="text-lg font-bold">連絡意思</h2>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {history && (
        <>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(preferenceLabels).filter(([scope]) => hasNus || scope === "global").map(([scope, label]) => {
              const event = current.get(scope)
              return <li key={scope}>{label}：{event && event.decision !== "withdraw"
                ? `${decisionLabels[event.decision]}（${coverageLabels[event.coverage]}）` : "未確認"}</li>
            })}
          </ul>
          {hasNus && (restrictions.business || restrictions.product || restrictions.administrative) &&
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              NUSの停止対象：{[
                restrictions.business && "ビジネス案内",
                restrictions.product && "商品案内",
                restrictions.administrative && "事務連絡",
              ].filter(Boolean).join("・")}
            </p>}
          {!draft && <button type="button" className="mt-2 min-h-11 font-semibold text-sky-800" onClick={() => {
            setError("")
            setDraft({
              scope: activeNus ? "nus_all" : "global", decision: "refuse", coverage: "outreach",
              confirmedAt: tokyoDatetime(new Date(), true), confirmed: false, reason: "", requestId: crypto.randomUUID(),
            })
          }}>連絡意思を記録</button>}
        </>
      )}
      {draft && (
        <form className="mt-3" onSubmit={save}>
          <fieldset disabled={saving} className="space-y-3">
            <label className="block text-sm">対象範囲
              <select className={inputClass} value={draft.scope} onChange={(event) => change({ scope: event.target.value, coverage: "outreach" })}>
                {Object.entries(preferenceLabels).filter(([scope]) => activeNus || scope === "global").map(([scope, label]) => <option key={scope} value={scope}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm">本人の意思
              <select className={inputClass} value={draft.decision} onChange={(event) => change({ decision: event.target.value })}>
                {Object.entries(decisionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            {(draft.scope === "global" || draft.scope === "nus_all") && <label className="block text-sm">対象となる連絡
              <select className={inputClass} value={draft.coverage} onChange={(event) => change({ coverage: event.target.value })}>
                {Object.entries(coverageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>}
            <label className="block text-sm">本人に確認した日時（日本時間）
              <input className={inputClass} type="datetime-local" step="1" required max={tokyoDatetime(new Date(), true)}
                value={draft.confirmedAt} onChange={(event) => change({ confirmedAt: event.target.value })} />
            </label>
            <label className="block text-sm">本人が伝えた理由（任意）
              <textarea className={inputClass} rows={2} value={draft.reason} onChange={(event) => change({ reason: event.target.value })} />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" required checked={draft.confirmed} onChange={(event) => setDraft({ ...draft, confirmed: event.target.checked })} />
              本人がこの対象範囲と内容を明示したことを確認しました
            </label>
            <div className="flex gap-3">
              <button className="min-h-11 rounded-xl bg-sky-700 px-4 font-bold text-white" type="submit">連絡意思を保存</button>
              <button className="min-h-11 px-3" type="button" onClick={() => { setDraft(null); setError("") }}>キャンセル</button>
            </div>
          </fieldset>
        </form>
      )}
      {history?.length > 0 && <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold">変更履歴（{history.length}件）</summary>
        <ul className="mt-2 space-y-2">
          {history.map((item) => <li key={item.id} className="rounded-xl bg-slate-50 p-3">
            {tokyoDatetime(item.confirmed_at).replace("T", " ")}　{preferenceLabels[item.scope]}：{decisionLabels[item.decision]}（{coverageLabels[item.coverage]}）
            {item.reason && <p className="whitespace-pre-wrap break-words">{item.reason}</p>}
          </li>)}
        </ul>
      </details>}
    </section>
  )
}
