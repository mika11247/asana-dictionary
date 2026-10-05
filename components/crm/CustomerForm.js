"use client"

import { useMemo, useState } from "react"
import { PHOTO_PERMISSION_OPTIONS, relationKey } from "@/lib/crm"

const emptyCustomer = {
  name: "", nickname: "", name_yomi: "", photo_permission: "unknown", customer_request: "", care_notes: "",
}

export default function CustomerForm({ initialCustomer, initialRelations = [], locations, services, onSave, onCancel, submitLabel = "保存" }) {
  const [form, setForm] = useState({ ...emptyCustomer, ...initialCustomer })
  const [relations, setRelations] = useState(initialRelations.map((item) => ({ location_id: item.location_id, service_id: item.service_id })))
  const [locationId, setLocationId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const activeLocations = useMemo(() => locations.filter((item) => item.is_active), [locations])
  const activeServices = useMemo(() => services.filter((item) => item.is_active), [services])

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function addRelation() {
    if (!locationId || !serviceId) return
    const next = { location_id: Number(locationId), service_id: Number(serviceId) }
    if (!relations.some((item) => relationKey(item) === relationKey(next))) setRelations((current) => [...current, next])
    setLocationId("")
    setServiceId("")
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return setError("名前を入力してください。")
    setSaving(true)
    setError("")
    try {
      await onSave({ ...form, name: form.name.trim(), nickname: form.nickname.trim(), name_yomi: form.name_yomi.trim() }, relations)
    } catch (err) {
      setError(err.message || "保存できませんでした。")
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-sky-400"
  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="block text-sm font-semibold text-gray-700">名前 <span className="text-red-500">*</span><input name="name" value={form.name} onChange={change} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-700">ニックネーム<input name="nickname" value={form.nickname || ""} onChange={change} className={inputClass} /></label>
        <label className="block text-sm font-semibold text-gray-700">よみがな<input name="name_yomi" value={form.name_yomi || ""} onChange={change} className={inputClass} /></label>
      </div>
      <label className="block text-sm font-semibold text-gray-700">写真掲載可否<select name="photo_permission" value={form.photo_permission} onChange={change} className={inputClass}>{PHOTO_PERMISSION_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="block text-sm font-semibold text-gray-700">本人から聞いている悩み・希望<textarea name="customer_request" value={form.customer_request || ""} onChange={change} rows={3} className={inputClass} /></label>
      <label className="block text-sm font-semibold text-gray-700">継続的な配慮事項<textarea name="care_notes" value={form.care_notes || ""} onChange={change} rows={3} className={inputClass} /></label>
      <fieldset className="rounded-2xl bg-slate-50 p-4">
        <legend className="px-1 text-sm font-bold text-gray-800">担当先 × サービス</legend>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}><option value="">担当先を選択</option>{activeLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputClass}><option value="">サービスを選択</option>{activeServices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button type="button" onClick={addRelation} className="mt-1 rounded-2xl bg-slate-700 px-4 py-3 text-sm font-bold text-white">追加</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {relations.length === 0 && <span className="text-sm text-gray-500">未登録</span>}
          {relations.map((relation) => {
            const label = `${locations.find((x) => x.id === relation.location_id)?.name || "不明"} × ${services.find((x) => x.id === relation.service_id)?.name || "不明"}`
            return <button type="button" key={relationKey(relation)} onClick={() => setRelations((items) => items.filter((x) => relationKey(x) !== relationKey(relation)))} className="rounded-full bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">{label} <span className="text-gray-400">×</span></button>
          })}
        </div>
      </fieldset>
      <div className="flex gap-3">
        {onCancel && <button type="button" onClick={onCancel} disabled={saving} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 font-bold text-gray-600">キャンセル</button>}
        <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? "保存中..." : submitLabel}</button>
      </div>
    </form>
  )
}
