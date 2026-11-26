"use client"

import { useState } from "react"
import { todayString } from "@/lib/crm"
import { groupLabels } from "@/lib/crmMemberships"
import { lillyServices } from "@/lib/crmLilly"

const brandServices = {
  third_place: ["ヨガ", "ピラティス"],
  moments: ["ネイル"],
  unite: ["ヒプノ"],
  om_radiance: ["占い"],
}
const inputClass = "mt-1 min-h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base"

export default function RecordForm({ initialRecord, groups, businesses, onSave, onCancel }) {
  const [form, setForm] = useState({
    record_date: todayString(), record_group_code: groups.length === 1 ? groups[0] : "",
    record_brand_code: "", location_label: "", service_label: "", customer_note: "", observation_note: "", ...initialRecord,
  })
  const suggestions = brandServices[form.record_brand_code] || []
  const [customService, setCustomService] = useState(Boolean(form.service_label && !suggestions.includes(form.service_label)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const historical = Boolean(initialRecord && (initialRecord.location_id != null || initialRecord.service_id != null))
  const activeContext = groups.includes(initialRecord?.record_group_code)
  const contextLocked = historical || Boolean(initialRecord && !activeContext)
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const changeGroup = (event) => {
    setCustomService(false)
    setForm((current) => ({ ...current, record_group_code: event.target.value, record_brand_code: "", location_label: "", service_label: "" }))
  }

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    if (!contextLocked && !form.service_label.trim()) return setError("実施内容を入力してください。")
    setSaving(true)
    setError("")
    try {
      await onSave({
        record_date: form.record_date,
        customer_note: form.customer_note,
        observation_note: form.observation_note,
        ...(!contextLocked && {
          record_group_code: form.record_group_code,
          record_brand_code: form.record_group_code === "mglitter" ? form.record_brand_code : null,
          service_label: form.service_label.trim(),
          location_label: form.record_group_code === "lilly" ? (form.location_label || "yoga&pilates Lilly") : (form.location_label?.trim() || null),
        }),
      })
    } catch (err) {
      setError(err.message || "記録を保存できませんでした。")
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <label className="block text-sm font-bold">日付<input required type="date" name="record_date" value={form.record_date} onChange={change} className={inputClass} /></label>
    {contextLocked ? <p className="break-words text-sm">
      {[groupLabels[form.record_group_code], businesses.find(({ code }) => code === form.record_brand_code)?.name,
        form.location_label, form.service_label].filter(Boolean).join("・") || "実施内容未移行"}
    </p> : <>
      <label className="block text-sm font-bold">記録先の所属
        <select required value={form.record_group_code} onChange={changeGroup} className={inputClass}>
          <option value="">選択してください</option>
          {groups.map((code) => <option key={code} value={code}>{groupLabels[code]}</option>)}
        </select>
      </label>
      {!groups.length && <p className="text-sm">記録するには、先に顧客の所属を設定してください。</p>}
      {form.record_group_code === "mglitter" && <>
        <label className="block text-sm font-bold">ブランド
          <select required name="record_brand_code" value={form.record_brand_code || ""} onChange={(event) => {
            setCustomService(false)
            setForm((current) => ({ ...current, record_brand_code: event.target.value, service_label: "" }))
          }} className={inputClass}>
            <option value="">選択してください</option>
            {businesses.filter(({ code }) => code !== "nus").map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        {suggestions.length > 0 && <label className="block text-sm font-bold">実施サービス
          <select required value={customService ? "custom" : form.service_label} onChange={(event) => {
            const selected = event.target.value
            setCustomService(selected === "custom")
            setForm((current) => ({ ...current, service_label: selected === "custom" ? "" : selected }))
          }} className={inputClass}>
            <option value="">選択してください</option>
            {suggestions.map((label) => <option key={label}>{label}</option>)}
            <option value="custom">その他（入力）</option>
          </select>
        </label>}
        {form.record_brand_code && (!suggestions.length || customService) && <label className="block text-sm font-bold">実施したサービス名
          <input required maxLength={200} name="service_label" value={form.service_label || ""} onChange={change} className={inputClass} />
        </label>}
      </>}
      {form.record_group_code === "lilly" && <label className="block text-sm font-bold">担当したサービス
        <select required name="service_label" value={form.service_label || ""} onChange={change} className={inputClass}>
          <option value="">選択してください</option>
          {Object.values(lillyServices).map((label) => <option key={label}>{label}</option>)}
        </select>
      </label>}
      {form.record_group_code === "nus" && <label className="block text-sm font-bold">活動内容
        <input required maxLength={200} name="service_label" value={form.service_label || ""} onChange={change} className={inputClass} />
      </label>}
      {["mglitter", "nus"].includes(form.record_group_code) && <label className="block text-sm font-bold">実施先（任意）
        <input maxLength={200} name="location_label" value={form.location_label || ""} onChange={change} className={inputClass} />
      </label>}
    </>}
    <label className="block text-sm font-bold">本人から聞いたこと<textarea name="customer_note" value={form.customer_note || ""} onChange={change} rows={4} className={inputClass} /></label>
    <label className="block text-sm font-bold">観察・指導・施術・会話メモ<textarea name="observation_note" value={form.observation_note || ""} onChange={change} rows={5} className={inputClass} /></label>
    <div className="flex gap-3">
      <button type="button" onClick={onCancel} disabled={saving} className="flex-1 rounded-2xl border border-gray-200 py-3 font-bold text-gray-600">キャンセル</button>
      <button disabled={saving || (!initialRecord && !groups.length)} className="flex-1 rounded-2xl bg-sky-600 py-3 font-bold text-white disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
    </div>
  </form>
}
