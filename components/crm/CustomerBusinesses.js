"use client"

import { useState } from "react"

const stageLabels = { unconfirmed: "未確認", customer: "顧客", prospect: "見込み客" }

export default function CustomerBusinesses({ businesses, relationships, onSave }) {
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function open(relation) {
    setError("")
    setDraft({ code: relation.business_code, stage: relation.stage, note: relation.business_note || "" })
  }

  async function save(code, values, existing) {
    setError("")
    setSaving(true)
    try {
      await onSave(code, values, existing)
      setDraft(null)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm" aria-label="顧客の事業情報">
      <h2 className="text-lg font-bold">事業情報</h2>
      {!relationships.some((relation) => !relation.archived_at) && <p className="mt-2 text-sm text-gray-500">事業未設定</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <ul className="mt-3 space-y-2">
        {relationships.map((relation) => {
          const code = relation.business_code
          const business = businesses.find((item) => item.code === code)
          return (
            <li key={code} className="rounded-2xl bg-slate-50 p-3">
              <p className="font-semibold">{business?.name || code}</p>
              <p className="text-sm text-slate-600">{stageLabels[relation.stage]}{relation.archived_at ? "・アーカイブ済み" : ""}</p>
              {relation.business_note && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{relation.business_note}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 text-sm font-semibold text-sky-800">
                <button type="button" className="min-h-11" disabled={saving} onClick={() => open(relation)}>事業情報を編集</button>
                <button type="button" className="min-h-11" disabled={saving || Boolean(draft)} onClick={() => save(code, { archived_at: relation.archived_at ? null : new Date().toISOString() }, true)}>
                  {relation.archived_at ? "事業を復元" : "事業をアーカイブ"}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {draft && (
        <form className="mt-4 space-y-3" onSubmit={(event) => {
          event.preventDefault()
          if (!saving) void save(draft.code, { stage: draft.stage, business_note: draft.note.trim() || null }, true)
        }}>
          <fieldset disabled={saving} className="space-y-3">
            <p className="text-sm font-bold">{businesses.find(({ code }) => code === draft.code)?.name || draft.code}の事業情報</p>
            <label className="block text-sm">顧客区分
              <select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value })} className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-base">
                {Object.entries(stageLabels).filter(([key]) => key !== "prospect" || draft.code === "nus").map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm">事業別メモ
              <textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} rows={3} className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-base" />
            </label>
            <div className="flex gap-3">
              <button type="submit" className="min-h-11 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white">事業情報を保存</button>
              <button type="button" onClick={() => { setDraft(null); setError("") }} className="min-h-11 px-3 text-sm">キャンセル</button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  )
}
