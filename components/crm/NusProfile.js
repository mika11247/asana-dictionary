"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { emptyNusProfile, interestLabels, listNusRelationshipTypes, progressFields, progressLabels, tokyoDatetime } from "@/lib/crmNus"

const inputClass = "mt-1 block w-full rounded-xl border border-slate-300 p-2 text-base"

function Options({ labels }) {
  return Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)
}

export default function NusProfile({ customerId, archived }) {
  const [state, setState] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([
      supabase.from("crm_nus_profiles").select(Object.keys(emptyNusProfile).join(",")).eq("customer_id", customerId).maybeSingle(),
      supabase.from("crm_nus_customer_relationships").select("type_code, other_label").eq("customer_id", customerId).is("archived_at", null),
      listNusRelationshipTypes(supabase),
    ]).then(([profile, roles, types]) => {
      if (!mounted) return
      if (profile.error || roles.error || types.error) setError("NUS情報を読み込めませんでした。")
      else setState({ profile: { ...emptyNusProfile, ...profile.data }, roles: roles.data, types: types.data })
    })
    return () => { mounted = false }
  }, [customerId])

  function updateProfile(values) {
    setState((current) => ({ ...current, profile: { ...current.profile, ...values } }))
  }

  async function save(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError("")
    try {
      const { error } = await supabase.rpc("crm_save_nus_profile", {
        target_customer_id: customerId, details: state.profile, relationship_types: state.roles,
      })
      if (error) throw new Error("NUS情報を保存できませんでした。入力内容を確認してください。")
      setEditing(false)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm" aria-label="NUS情報">
      <h2 className="text-lg font-bold">NUS情報</h2>
      {archived && <p className="mt-1 text-sm text-slate-600">NUS事業を復元すると編集できます。</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {state && !editing && (
        <div className="mt-3 space-y-3 text-sm">
          <p>関係性：{state.roles.map(({ type_code, other_label }) =>
            type_code === "other" ? `その他（${other_label}）` : state.types.find(({ code }) => code === type_code)?.label,
          ).join("・") || "未設定"}</p>
          {[["product", "商品"], ["business", "ビジネス"]].map(([key, label]) => <div key={key}>
            <p>{label}への関心：{interestLabels[state.profile[`${key}_interest`]]}</p>
            {state.profile[`${key}_note`] && <p className="whitespace-pre-wrap break-words text-slate-600">{state.profile[`${key}_note`]}</p>}
          </div>)}
          {progressFields.map(([key, label]) => <p key={key}>{label}：{progressLabels[state.profile[`${key}_status`]]}
            {state.profile[`${key}_on`] && `（初回 ${state.profile[`${key}_on`]}）`}
          </p>)}
          {!archived && <button type="button" className="min-h-11 font-semibold text-sky-800" onClick={() => { setSnapshot(state); setEditing(true) }}>NUS情報を編集</button>}
        </div>
      )}
      {state && editing && (
        <form className="mt-3" onSubmit={save}>
          <fieldset disabled={saving} className="space-y-4">
            <div>
              <p className="text-sm font-semibold">関係性（複数選択可）</p>
              {state.types.filter(({ is_active, code }) => is_active || state.roles.some((role) => role.type_code === code)).map(({ code, label, is_active }) => (
                <label key={code} className="flex min-h-10 items-center gap-2 text-sm">
                  <input type="checkbox" disabled={!is_active} checked={state.roles.some((role) => role.type_code === code)} onChange={(event) => {
                    const checked = event.target.checked
                    setState((current) => ({ ...current, roles: checked
                      ? [...current.roles, { type_code: code, other_label: null }]
                      : current.roles.filter((role) => role.type_code !== code) }))
                  }} />
                  {label}
                </label>
              ))}
              {state.roles.some((role) => role.type_code === "other") && <label className="block text-sm">その他の関係性
                <input className={inputClass} required maxLength={200} value={state.roles.find((role) => role.type_code === "other").other_label || ""} onChange={(event) => {
                  const other_label = event.target.value
                  setState((current) => ({ ...current, roles: current.roles.map((role) => role.type_code === "other" ? { ...role, other_label } : role) }))
                }} />
              </label>}
            </div>
            {[["product", "商品"], ["business", "ビジネス"]].map(([key, label]) => <div className="space-y-2" key={key}>
              <label className="block text-sm">{label}への関心
                <select className={inputClass} value={state.profile[`${key}_interest`]} onChange={(event) => updateProfile({ [`${key}_interest`]: event.target.value })}>
                  <Options labels={interestLabels} />
                </select>
              </label>
              <label className="block text-sm">{label}への関心メモ（任意）
                <textarea className={inputClass} rows={2} value={state.profile[`${key}_note`] || ""} onChange={(event) => updateProfile({ [`${key}_note`]: event.target.value })} />
              </label>
            </div>)}
            {progressFields.map(([key, label]) => <div className="space-y-2" key={key}>
              <label className="block text-sm">{label}
                <select className={inputClass} value={state.profile[`${key}_status`]} onChange={(event) => updateProfile({
                  [`${key}_status`]: event.target.value,
                  [`${key}_on`]: event.target.value === "done" ? state.profile[`${key}_on`] : null,
                })}><Options labels={progressLabels} /></select>
              </label>
              {state.profile[`${key}_status`] === "done" && <label className="block text-sm">{label}の初回実施日（任意）
                <input className={inputClass} type="date" max={tokyoDatetime(new Date()).slice(0, 10)} value={state.profile[`${key}_on`] || ""}
                  onChange={(event) => updateProfile({ [`${key}_on`]: event.target.value || null })} />
              </label>}
            </div>)}
            <div className="flex gap-3">
              <button type="submit" className="min-h-11 rounded-xl bg-sky-700 px-4 font-bold text-white">NUS情報を保存</button>
              <button type="button" className="min-h-11 px-3" onClick={() => { setState(snapshot); setEditing(false); setError("") }}>キャンセル</button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  )
}
