"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { PHOTO_PERMISSION_OPTIONS, relationKey } from "@/lib/crm"
import { groupLabels } from "@/lib/crmMemberships"

const emptyCustomer = {
  name: "", nickname: "", name_yomi: "", photo_permission: "unknown", customer_request: "", care_notes: "", private_note: "",
}

const membershipOptions = ["通い放題", "回数券", "月謝", "体験"]

function editableCustomerValues(customer = {}) {
  return {
    name: customer.name ?? "",
    nickname: customer.nickname ?? "",
    name_yomi: customer.name_yomi ?? "",
    photo_permission: customer.photo_permission ?? "unknown",
    customer_request: customer.customer_request ?? "",
    care_notes: customer.care_notes ?? "",
    private_note: customer.private_note ?? "",
  }
}

export default function CustomerForm({ initialCustomer, initialRelations = [], locations, services, businesses, initialGroups = [], initialBrands = [], findCandidates, onSave, onCancel, submitLabel = "保存" }) {
  const [form, setForm] = useState({ ...emptyCustomer, ...editableCustomerValues(initialCustomer) })
  const [relations, setRelations] = useState(initialRelations.map((item) => ({ id: item.id, location_id: item.location_id, service_id: item.service_id, membership_type: item.membership_type || null })))
  const [locationId, setLocationId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [membershipType, setMembershipType] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [groups, setGroups] = useState(initialGroups)
  const [brands, setBrands] = useState(initialBrands)
  const [candidates, setCandidates] = useState(null)
  const [differentPerson, setDifferentPerson] = useState(false)
  const activeLocations = useMemo(() => locations.filter((item) => item.is_active), [locations])
  const activeServices = useMemo(() => services.filter((item) => item.is_active), [services])

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    if (["name", "nickname", "name_yomi"].includes(event.target.name)) {
      setCandidates(null)
      setDifferentPerson(false)
    }
  }

  function addRelation() {
    if (!locationId || !serviceId) return
    const next = { location_id: Number(locationId), service_id: Number(serviceId), membership_type: membershipType || null }
    if (!relations.some((item) => relationKey(item) === relationKey(next))) setRelations((current) => [...current, next])
    setLocationId("")
    setServiceId("")
    setMembershipType("")
  }

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    if (!form.name.trim()) return setError("名前を入力してください。")
    setSaving(true)
    setError("")
    try {
      if (findCandidates && !differentPerson) {
        const matches = await findCandidates(form)
        setCandidates(matches)
        if (matches.length) return
      }
      await onSave({
        name: form.name.trim(),
        nickname: form.nickname.trim(),
        name_yomi: form.name_yomi.trim(),
        photo_permission: form.photo_permission,
        customer_request: form.customer_request,
        care_notes: form.care_notes,
        private_note: form.private_note,
      }, relations, { groups, brands: groups.includes("mglitter") ? brands : [] })
    } catch (err) {
      setError(err.message || "保存できませんでした。")
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-sky-400"
  return (
    <form onSubmit={submit}>
      {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <fieldset disabled={saving} className="space-y-5">
      <label className="block text-sm font-semibold text-gray-700">名前 <span className="text-red-500">*</span><input name="name" value={form.name} onChange={change} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-gray-700">ニックネーム<input name="nickname" value={form.nickname || ""} onChange={change} className={inputClass} /></label>
        <label className="block text-sm font-semibold text-gray-700">よみがな<input name="name_yomi" value={form.name_yomi || ""} onChange={change} className={inputClass} /></label>
      </div>
      {findCandidates && candidates?.length > 0 && (
        <section aria-label="既存顧客の候補" className="rounded-2xl bg-amber-50 p-4 text-sm">
          <p className="font-bold">同じ方が登録されている場合は、既存のカルテを開いてください。</p>
          <ul className="mt-2">
            {candidates.map(({ id, name, name_yomi, nickname, archived }) => <li key={id}>
              <Link href={`/admin/customers/${id}`} onClick={onCancel} className="inline-flex min-h-11 items-center text-sky-800 underline">
                {[name, name_yomi, nickname, archived && "アーカイブ済み"].filter(Boolean).join(" / ")}
              </Link>
            </li>)}
          </ul>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={differentPerson} onChange={(event) => setDifferentPerson(event.target.checked)} />別の方として新規登録する</label>
        </section>
      )}
      <fieldset className="rounded-2xl bg-sky-50 p-4">
        <legend className="px-1 text-sm font-bold">所属（複数選択可）</legend>
        {Object.entries(groupLabels).map(([code, label]) => (
          <label key={code} className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={groups.includes(code)} onChange={(event) =>
              setGroups(event.target.checked ? [...groups, code] : groups.filter((value) => value !== code))} />
            {label}
          </label>
        ))}
        {groups.includes("mglitter") && (
          <fieldset className="mt-3 border-t border-sky-200 pt-2">
            <legend className="text-sm font-semibold">M.glitterのブランド</legend>
            {businesses.filter(({ code, is_active }) => code !== "nus" && (is_active || brands.includes(code))).map(({ code, name }) => (
              <label key={code} className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" checked={brands.includes(code)} onChange={(event) =>
                  setBrands(event.target.checked ? [...brands, code] : brands.filter((value) => value !== code))} />
                {name}
              </label>
            ))}
          </fieldset>
        )}
      </fieldset>
      <label className="block text-sm font-semibold text-gray-700">写真掲載可否<select name="photo_permission" value={form.photo_permission} onChange={change} className={inputClass}>{PHOTO_PERMISSION_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="block text-sm font-semibold text-gray-700">本人から聞いている悩み・希望<textarea name="customer_request" value={form.customer_request || ""} onChange={change} rows={3} className={inputClass} /></label>
      <label className="block text-sm font-semibold text-gray-700">継続的な配慮事項<textarea name="care_notes" value={form.care_notes || ""} onChange={change} rows={3} className={inputClass} /></label>
      <label className="block text-sm font-semibold text-gray-700">📝 自分用メモ<textarea name="private_note" value={form.private_note || ""} onChange={change} rows={3} placeholder="外見・持ち物・仕事・以前話した内容など" className={inputClass} /></label>
      <fieldset className="rounded-2xl bg-slate-50 p-4">
        <legend className="px-1 text-sm font-bold text-gray-800">担当先 × サービス</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}><option value="">担当先を選択</option>{activeLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputClass}><option value="">サービスを選択</option>{activeServices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={membershipType} onChange={(e) => setMembershipType(e.target.value)} className={inputClass}><option value="">会員種別：未設定</option>{membershipOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" onClick={addRelation} className="mt-1 rounded-2xl bg-slate-700 px-4 py-3 text-sm font-bold text-white">組み合わせを追加</button>
        </div>
        <div className="mt-3 space-y-2">
          {relations.length === 0 && <span className="text-sm text-gray-500">未登録</span>}
          {relations.map((relation) => {
            const label = `${locations.find((x) => x.id === relation.location_id)?.name || "不明"} × ${services.find((x) => x.id === relation.service_id)?.name || "不明"}`
            return <div key={relationKey(relation)} className="rounded-2xl bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><button type="button" aria-label={`${label}を削除`} onClick={() => setRelations((items) => items.filter((x) => relationKey(x) !== relationKey(relation)))} className="shrink-0 px-2 text-gray-400">×</button></div><select value={relation.membership_type || ""} onChange={(e) => setRelations((items) => items.map((item) => relationKey(item) === relationKey(relation) ? { ...item, membership_type: e.target.value || null } : item))} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"><option value="">会員種別：未設定</option>{membershipOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          })}
        </div>
      </fieldset>
      </fieldset>
      <div className="sticky bottom-0 mt-4 flex gap-3 bg-white py-2">
        {onCancel && <button type="button" onClick={onCancel} disabled={saving} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 font-bold text-gray-600">キャンセル</button>}
        <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? "保存中..." : submitLabel}</button>
      </div>
    </form>
  )
}
