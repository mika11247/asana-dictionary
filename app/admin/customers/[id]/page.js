"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import LillyProfile from "@/components/crm/LillyProfile"
import { customerDisplayName, customerFormalName, usesLillyDisplay } from "@/lib/crmLilly"
import CustomerForm from "@/components/crm/CustomerForm"
import CustomerBusinesses from "@/components/crm/CustomerBusinesses"
import ContactPreferences from "@/components/crm/ContactPreferences"
import NusProfile from "@/components/crm/NusProfile"
import PhotoPermissionBadge from "@/components/crm/PhotoPermissionBadge"
import RecordForm from "@/components/crm/RecordForm"
import { formatDate, listCrmBusinesses, saveCrmBusinessRelationship, saveCrmRecord } from "@/lib/crm"
import { groupLabels, saveCrmCustomerMemberships } from "@/lib/crmMemberships"
import { emptyNusProfile } from "@/lib/crmNus"

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [records, setRecords] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mode, setMode] = useState(null)
  const [dedicated, setDedicated] = useState(null)
  const [openingCustomer, setOpeningCustomer] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [flagLoading, setFlagLoading] = useState(null)

  async function load() {
    setLoading(true); setError("")
    const [customerResult, recordResult, businessResult] = await Promise.all([
      supabase.from("crm_customers").select("*, crm_customer_businesses(business_code, stage, business_note, archived_at), crm_customer_groups(group_code, archived_at), crm_customer_group_brands(business_code, archived_at), crm_lilly_profiles(membership, service_codes)").eq("id", id).maybeSingle(),
      supabase.from("crm_records").select("*").eq("customer_id", id).order("record_date", { ascending: false }).order("created_at", { ascending: false }),
      listCrmBusinesses(supabase),
    ])
    const firstError = customerResult.error || recordResult.error || businessResult.error
    if (firstError) { console.error("カルテの取得に失敗しました", firstError); setError("カルテを読み込めませんでした。") }
    else if (!customerResult.data) setError("顧客が見つかりません。")
    else { setCustomer(customerResult.data); setRecords(recordResult.data || []); setBusinesses(businessResult.data || []) }
    setLoading(false)
  }
  useEffect(() => { if (id) load() }, [id])

  async function openCustomerForm() {
    if (openingCustomer) return
    setOpeningCustomer(true)
    setError("")
    try {
      const [profile, category] = await Promise.all([
        supabase.from("crm_nus_profiles").select(Object.keys(emptyNusProfile).join(",")).eq("customer_id", id).maybeSingle(),
        supabase.from("crm_nus_categories").select("category, other_label").eq("customer_id", id).maybeSingle(),
      ])
      if (profile.error || category.error) throw new Error()
      setDedicated({ profile: { ...emptyNusProfile, ...profile.data }, category: category.data })
      setMode("customer")
    } catch {
      setError("所属別の情報を読み込めませんでした。再度お試しください。")
    } finally {
      setOpeningCustomer(false)
    }
  }

  async function saveCustomer(values, selection) {
    await saveCrmCustomerMemberships(supabase, id, values, selection)
    setMode(null); await load()
  }

  async function saveRecord(values) {
    await saveCrmRecord(supabase, id, values, editingRecord?.id)
    setMode(null); setEditingRecord(null); await load()
  }

  async function deleteRecord(recordId) {
    if (!window.confirm("この記録を削除しますか？この操作は元に戻せません。")) return
    setActionLoading(true)
    const { error: deleteError } = await supabase.from("crm_records").delete().eq("id", recordId)
    if (deleteError) { console.error("記録の削除に失敗しました", deleteError); setError("記録を削除できませんでした。") } else await load()
    setActionLoading(false)
  }

  async function toggleArchive() {
    const next = !customer.archived
    if (next && !window.confirm("この顧客をアーカイブしますか？")) return
    setActionLoading(true); setError("")
    const { error: archiveError } = await supabase.from("crm_customers").update({ archived: next, archived_at: next ? new Date().toISOString() : null }).eq("id", id)
    if (archiveError) { console.error("アーカイブ更新に失敗しました", archiveError); setError("状態を変更できませんでした。") } else if (next) router.push("/admin/customers")
    else await load()
    setActionLoading(false)
  }

  async function toggleCustomerFlag(field) {
    if (flagLoading) return
    const previousValue = Boolean(customer[field])
    const nextValue = !previousValue
    setFlagLoading(field); setError("")
    setCustomer((current) => ({ ...current, [field]: nextValue }))
    const { error: updateError } = await supabase.from("crm_customers").update({ [field]: nextValue }).eq("id", id)
    if (updateError) {
      console.error("顧客フラグの更新に失敗しました", { code: updateError.code, message: updateError.message, details: updateError.details, hint: updateError.hint })
      setCustomer((current) => ({ ...current, [field]: previousValue }))
      setError(field === "is_favorite" ? "お気に入りを変更できませんでした。" : "ピックアップを変更できませんでした。")
    }
    setFlagLoading(null)
  }

  if (loading) return <main className="min-h-screen bg-sky-50 p-8 text-center text-gray-500">読み込み中...</main>
  if (!customer) return <main className="min-h-screen bg-sky-50 p-6"><div className="mx-auto max-w-3xl"><Link href="/admin/customers" className="text-sky-700">← 顧客一覧</Link><p className="mt-5 rounded-3xl bg-red-50 p-5 text-red-700">{error || "顧客が見つかりません。"}</p></div></main>
  const latest = records[0]
  const nus = customer.crm_customer_businesses.find((item) => item.business_code === "nus")
  const groups = Object.keys(groupLabels).filter((code) =>
    customer.crm_customer_groups.some((item) => item.group_code === code && !item.archived_at)
    || (code === "nus" && nus && !nus.archived_at))
  const lillyView = usesLillyDisplay(customer) || new URLSearchParams(window.location.search).get("view") === "lilly"
  const displayName = customerDisplayName(customer)
  const formalName = customerFormalName(customer)
  const brands = customer.crm_customer_group_brands.filter((item) => !item.archived_at).map((item) => item.business_code)
  return <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 px-4 py-6 sm:p-8"><div className="mx-auto max-w-3xl">
    <Link href="/admin/customers" className="text-sm text-sky-700">← 顧客一覧</Link>
    {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start gap-1">
        <button type="button" disabled={Boolean(flagLoading)} onClick={() => toggleCustomerFlag("is_favorite")} aria-label={customer.is_favorite ? "お気に入りから解除" : "お気に入りに追加"} className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl transition disabled:opacity-50 ${customer.is_favorite ? "bg-amber-50" : "text-gray-400 hover:bg-gray-50"}`}>{customer.is_favorite ? "⭐️" : "☆"}</button>
        <div className="min-w-0 px-2"><h1 className="break-words text-2xl font-bold leading-snug text-gray-900"><span>{displayName}</span></h1>{formalName && <p className="mt-1 break-words text-sm text-gray-600">{formalName}</p>}</div>
        <button type="button" disabled={Boolean(flagLoading)} onClick={() => toggleCustomerFlag("is_pinned")} aria-label={customer.is_pinned ? "ピックアップから解除" : "ピックアップに追加"} className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl transition disabled:opacity-50 ${customer.is_pinned ? "bg-sky-100 opacity-100" : "opacity-30 hover:bg-gray-50 hover:opacity-60"}`}>📌</button>
      </div>
      <div className="mt-2 flex justify-end"><button disabled={openingCustomer} onClick={openCustomerForm} className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600">編集</button></div>
      <section className="mt-4 rounded-2xl bg-sky-50 p-4" aria-label="現在の所属">
        <h2 className="font-bold">所属</h2>
        <p className="mt-1 text-sm">{groups.map((code) => groupLabels[code]).join("・") || "所属未設定"}</p>
        {brands.length > 0 && <p className="mt-1 text-sm">M.glitterのブランド：{businesses.filter(({ code }) => brands.includes(code)).map(({ name }) => name).join("・")}</p>}
        <button type="button" disabled={openingCustomer} onClick={openCustomerForm} className="mt-1 min-h-11 text-sm font-bold text-sky-800">所属を編集</button>
      </section>
      <div className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">写真掲載可否</p><PhotoPermissionBadge value={customer.photo_permission} prominent /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-sky-50 p-4"><h2 className="text-sm font-bold text-sky-900">💬 本人から聞いている悩み・希望</h2><p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{customer.customer_request || "記載なし"}</p></div>
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4"><h2 className="text-sm font-bold text-amber-900">⚠️ 継続的な配慮事項</h2><p className="mt-2 whitespace-pre-wrap font-medium text-gray-900">{customer.care_notes || "記載なし"}</p></div>
      </div>
      {groups.includes("lilly") && <LillyProfile key={customer.id} customer={customer} onSaved={load} />}
      {!lillyView && customer.private_note?.trim() && <div className="mt-3 rounded-2xl bg-violet-50 p-4"><h2 className="text-sm font-bold text-violet-900">📝 自分用メモ</h2><p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{customer.private_note}</p></div>}
      <p className="mt-5 text-sm text-gray-500">最終参加日：<strong className="text-gray-900">{formatDate(records.find(({ record_group_code }) => record_group_code !== "nus")?.record_date)}</strong></p>
    </section>

    <CustomerBusinesses businesses={businesses} relationships={customer.crm_customer_businesses} onSave={async (code, values, existing) => {
      await saveCrmBusinessRelationship(supabase, id, code, values, existing)
      await load()
    }} />
    {nus && <NusProfile customerId={id} archived={Boolean(nus.archived_at)} legacyStage={nus.stage} />}
    <ContactPreferences customerId={id} hasNus={Boolean(nus)} activeNus={Boolean(nus && !nus.archived_at)} />
    <button onClick={() => { setEditingRecord(null); setMode("record") }} className="my-4 w-full rounded-2xl bg-sky-600 px-4 py-4 text-lg font-bold text-white shadow-sm">＋ 今日の記録</button>
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">最新記録</h2>{latest ? <RecordBody record={latest} businesses={businesses} /> : <p className="mt-3 text-sm text-gray-500">まだ記録がありません。</p>}</section>
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold">過去の記録</h2><div className="space-y-4">{records.map((record) => <article key={record.id} className="rounded-2xl border border-gray-100 p-4"><RecordBody record={record} businesses={businesses} /><div className="mt-3 flex justify-end gap-3"><button onClick={() => { setEditingRecord(record); setMode("record") }} className="text-sm font-bold text-sky-700">編集</button><button disabled={actionLoading} onClick={() => deleteRecord(record.id)} className="text-sm font-bold text-red-600">削除</button></div></article>)}</div></section>
    <button disabled={actionLoading} onClick={toggleArchive} className={`mt-6 w-full rounded-2xl border px-4 py-3 text-sm font-bold ${customer.archived ? "border-emerald-200 text-emerald-700" : "border-gray-200 text-gray-500"}`}>{customer.archived ? "アーカイブから復元" : "この顧客をアーカイブ"}</button>
  </div>
  {mode && <div role="dialog" aria-modal="true" aria-label={mode === "customer" ? "顧客情報と所属を編集" : "カルテの記録"} className="crm-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"><div className="mx-auto my-4 max-w-xl rounded-3xl bg-white p-5 shadow-xl"><h2 className="mb-5 text-xl font-bold">{mode === "customer" ? "顧客情報と所属を編集" : editingRecord ? "記録を編集" : "記録を追加"}</h2>{mode === "customer" ? <CustomerForm initialCustomer={customer} initialDedicated={dedicated} initialGroups={groups} initialBrands={brands} lillyView={lillyView} businesses={businesses} onSave={saveCustomer} onCancel={() => setMode(null)} /> : <RecordForm initialRecord={editingRecord || undefined} groups={groups} businesses={businesses} onSave={saveRecord} onCancel={() => { setMode(null); setEditingRecord(null) }} />}</div></div>}
  </main>
}

function RecordBody({ record, businesses }) {
  const brand = businesses.find(({ code }) => code === record.record_brand_code)?.name
  return <div className="mt-3"><div className="flex flex-wrap items-center gap-2"><strong className="text-gray-900">{formatDate(record.record_date)}</strong><span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">{[groupLabels[record.record_group_code], brand, record.location_label === brand ? null : record.location_label, record.service_label].filter(Boolean).join("・") || "実施内容未移行"}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-sky-50 p-3"><p className="text-xs font-bold text-sky-900">💬 本人から聞いたこと</p><p className="mt-1 whitespace-pre-wrap text-sm">{record.customer_note || "記載なし"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-800">📝 観察・指導・施術・会話メモ</p><p className="mt-1 whitespace-pre-wrap text-sm">{record.observation_note || "記載なし"}</p></div></div></div>
}
