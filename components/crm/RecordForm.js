"use client"

import { useState } from "react"
import { todayString } from "@/lib/crm"

export default function RecordForm({ initialRecord, locations, services, onSave, onCancel }) {
  const [form, setForm] = useState({ record_date: todayString(), location_id: "", service_id: "", customer_note: "", observation_note: "", ...initialRecord })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError("")
    try { await onSave({ ...form, location_id: Number(form.location_id), service_id: Number(form.service_id) }) }
    catch (err) { setError(err.message || "記録を保存できませんでした。") }
    finally { setSaving(false) }
  }
  const inputClass = "mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-sky-400"
  return <form onSubmit={submit} className="space-y-4">
    {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <label className="block text-sm font-bold">日付<input required type="date" name="record_date" value={form.record_date} onChange={change} className={inputClass} /></label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-bold">担当先<select required name="location_id" value={form.location_id} onChange={change} className={inputClass}><option value="">選択してください</option>{locations.filter((x) => x.is_active || x.id === Number(form.location_id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="block text-sm font-bold">サービス<select required name="service_id" value={form.service_id} onChange={change} className={inputClass}><option value="">選択してください</option>{services.filter((x) => x.is_active || x.id === Number(form.service_id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <label className="block text-sm font-bold">💬 本人から聞いたこと<textarea name="customer_note" value={form.customer_note || ""} onChange={change} rows={4} className={inputClass} /></label>
    <label className="block text-sm font-bold">📝 観察・指導・施術・会話メモ<textarea name="observation_note" value={form.observation_note || ""} onChange={change} rows={5} className={inputClass} /></label>
    <div className="flex gap-3"><button type="button" onClick={onCancel} disabled={saving} className="flex-1 rounded-2xl border border-gray-200 py-3 font-bold text-gray-600">キャンセル</button><button disabled={saving} className="flex-1 rounded-2xl bg-sky-600 py-3 font-bold text-white disabled:opacity-50">{saving ? "保存中..." : "保存"}</button></div>
  </form>
}
