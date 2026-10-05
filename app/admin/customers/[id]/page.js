"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import CustomerForm from "@/components/crm/CustomerForm"
import PhotoPermissionBadge from "@/components/crm/PhotoPermissionBadge"
import RecordForm from "@/components/crm/RecordForm"
import { formatDate, relationKey } from "@/lib/crm"

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [records, setRecords] = useState([])
  const [locations, setLocations] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mode, setMode] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [flagLoading, setFlagLoading] = useState(null)

  async function load() {
    setLoading(true); setError("")
    const [customerResult, recordResult, locationResult, serviceResult] = await Promise.all([
      supabase.from("crm_customers").select("*, crm_customer_services(id, location_id, service_id, membership_type, crm_locations(id, name, is_active), crm_services(id, name, is_active))").eq("id", id).maybeSingle(),
      supabase.from("crm_records").select("*, crm_locations(id, name, is_active), crm_services(id, name, is_active)").eq("customer_id", id).order("record_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("crm_locations").select("*").order("sort_order").order("name"),
      supabase.from("crm_services").select("*").order("sort_order").order("name"),
    ])
    const firstError = customerResult.error || recordResult.error || locationResult.error || serviceResult.error
    if (firstError) { console.error("カルテの取得に失敗しました", firstError); setError("カルテを読み込めませんでした。") }
    else if (!customerResult.data) setError("顧客が見つかりません。")
    else { setCustomer(customerResult.data); setRecords(recordResult.data || []); setLocations(locationResult.data || []); setServices(serviceResult.data || []) }
    setLoading(false)
  }
  useEffect(() => { if (id) load() }, [id])

  async function saveCustomer(values, nextRelations) {
    const { error: updateError } = await supabase.from("crm_customers").update(values).eq("id", id)
    if (updateError) {
      console.error("顧客基本情報の更新に失敗しました", {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      })
      throw new Error("基本情報を保存できませんでした。")
    }
    const oldRelations = customer.crm_customer_services || []
    const oldKeys = new Set(oldRelations.map(relationKey)); const nextKeys = new Set(nextRelations.map(relationKey))
    const additions = nextRelations.filter((item) => !oldKeys.has(relationKey(item))).map((item) => ({ customer_id: Number(id), location_id: item.location_id, service_id: item.service_id, membership_type: item.membership_type || null }))
    const removals = oldRelations.filter((item) => !nextKeys.has(relationKey(item)))
    const membershipChanges = nextRelations.filter((item) => oldKeys.has(relationKey(item))).map((item) => ({ next: item, previous: oldRelations.find((oldItem) => relationKey(oldItem) === relationKey(item)) })).filter(({ next, previous }) => (next.membership_type || null) !== (previous.membership_type || null))
    if (additions.length) {
      const { error: addError } = await supabase.from("crm_customer_services").insert(additions)
      if (addError) { console.error("顧客関連の追加に失敗しました", addError); throw new Error("基本情報は保存されましたが、担当先・サービスの追加に失敗しました。再度お試しください。") }
    }
    if (removals.length) {
      const { error: removeError } = await supabase.from("crm_customer_services").delete().in("id", removals.map((item) => item.id))
      if (removeError) { console.error("顧客関連の削除に失敗しました", removeError); throw new Error("基本情報は保存されましたが、担当先・サービスの削除に失敗しました。再度お試しください。") }
    }
    for (const { next, previous } of membershipChanges) {
      const { error: membershipError } = await supabase.from("crm_customer_services").update({ membership_type: next.membership_type || null }).eq("id", previous.id)
      if (membershipError) { console.error("会員種別の更新に失敗しました", membershipError); throw new Error("基本情報は保存されましたが、会員種別を更新できませんでした。再度お試しください。") }
    }
    setMode(null); await load()
  }

  async function saveRecord(values) {
    const payload = { ...values, customer_id: Number(id) }
    const result = editingRecord ? await supabase.from("crm_records").update(payload).eq("id", editingRecord.id) : await supabase.from("crm_records").insert(payload)
    if (result.error) { console.error("記録の保存に失敗しました", result.error); throw new Error("記録を保存できませんでした。") }
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
  return <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 px-4 py-6 sm:p-8"><div className="mx-auto max-w-3xl">
    <Link href="/admin/customers" className="text-sm text-sky-700">← 顧客一覧</Link>
    {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start gap-1">
        <button type="button" disabled={Boolean(flagLoading)} onClick={() => toggleCustomerFlag("is_favorite")} aria-label={customer.is_favorite ? "お気に入りから解除" : "お気に入りに追加"} className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl transition disabled:opacity-50 ${customer.is_favorite ? "bg-amber-50" : "text-gray-400 hover:bg-gray-50"}`}>{customer.is_favorite ? "⭐️" : "☆"}</button>
        <div className="min-w-0 px-2"><h1 className="break-words text-2xl font-bold leading-snug text-gray-900"><span>{customer.name}</span><span className="whitespace-nowrap"> 様</span></h1>{customer.name_yomi && <p className="mt-1 text-base font-medium text-gray-600">{customer.name_yomi}</p>}{customer.nickname && <p className="mt-0.5 text-sm text-gray-500">{customer.nickname}</p>}</div>
        <button type="button" disabled={Boolean(flagLoading)} onClick={() => toggleCustomerFlag("is_pinned")} aria-label={customer.is_pinned ? "ピックアップから解除" : "ピックアップに追加"} className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl transition disabled:opacity-50 ${customer.is_pinned ? "bg-sky-100 opacity-100" : "opacity-30 hover:bg-gray-50 hover:opacity-60"}`}>📌</button>
      </div>
      <div className="mt-2 flex justify-end"><button onClick={() => setMode("customer")} className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600">編集</button></div>
      <div className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">写真掲載可否</p><PhotoPermissionBadge value={customer.photo_permission} prominent /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-sky-50 p-4"><h2 className="text-sm font-bold text-sky-900">💬 本人から聞いている悩み・希望</h2><p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{customer.customer_request || "記載なし"}</p></div>
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4"><h2 className="text-sm font-bold text-amber-900">⚠️ 継続的な配慮事項</h2><p className="mt-2 whitespace-pre-wrap font-medium text-gray-900">{customer.care_notes || "記載なし"}</p></div>
      </div>
      {customer.private_note?.trim() && <div className="mt-3 rounded-2xl bg-violet-50 p-4"><h2 className="text-sm font-bold text-violet-900">📝 自分用メモ</h2><p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{customer.private_note}</p></div>}
      <div className="mt-5 flex flex-wrap gap-2">{customer.crm_customer_services?.length ? customer.crm_customer_services.map((item) => <span key={item.id} className="rounded-2xl bg-violet-50 px-3 py-2 text-sm text-violet-800"><span>{item.crm_locations?.name} × {item.crm_services?.name}</span>{item.membership_type && <span className="ml-2 font-bold">🎫 {item.membership_type}</span>}</span>) : <span className="text-sm text-gray-500">担当先・サービス未登録</span>}</div>
      <p className="mt-5 text-sm text-gray-500">最終参加日：<strong className="text-gray-900">{formatDate(latest?.record_date)}</strong></p>
    </section>

    <button onClick={() => { setEditingRecord(null); setMode("record") }} className="my-4 w-full rounded-2xl bg-sky-600 px-4 py-4 text-lg font-bold text-white shadow-sm">＋ 今日の記録</button>
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">最新記録</h2>{latest ? <RecordBody record={latest} /> : <p className="mt-3 text-sm text-gray-500">まだ記録がありません。</p>}</section>
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold">過去の記録</h2><div className="space-y-4">{records.map((record) => <article key={record.id} className="rounded-2xl border border-gray-100 p-4"><RecordBody record={record} /><div className="mt-3 flex justify-end gap-3"><button onClick={() => { setEditingRecord(record); setMode("record") }} className="text-sm font-bold text-sky-700">編集</button><button disabled={actionLoading} onClick={() => deleteRecord(record.id)} className="text-sm font-bold text-red-600">削除</button></div></article>)}</div></section>
    <button disabled={actionLoading} onClick={toggleArchive} className={`mt-6 w-full rounded-2xl border px-4 py-3 text-sm font-bold ${customer.archived ? "border-emerald-200 text-emerald-700" : "border-gray-200 text-gray-500"}`}>{customer.archived ? "アーカイブから復元" : "この顧客をアーカイブ"}</button>
  </div>
  {mode && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"><div className="mx-auto my-4 max-w-xl rounded-3xl bg-white p-5 shadow-xl"><h2 className="mb-5 text-xl font-bold">{mode === "customer" ? "顧客情報を編集" : editingRecord ? "記録を編集" : "記録を追加"}</h2>{mode === "customer" ? <CustomerForm initialCustomer={customer} initialRelations={customer.crm_customer_services} locations={locations} services={services} onSave={saveCustomer} onCancel={() => setMode(null)} /> : <RecordForm initialRecord={editingRecord || undefined} locations={locations} services={services} onSave={saveRecord} onCancel={() => { setMode(null); setEditingRecord(null) }} />}</div></div>}
  </main>
}

function RecordBody({ record }) {
  return <div className="mt-3"><div className="flex flex-wrap items-center gap-2"><strong className="text-gray-900">{formatDate(record.record_date)}</strong><span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">{record.crm_locations?.name || "不明"} × {record.crm_services?.name || "不明"}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-sky-50 p-3"><p className="text-xs font-bold text-sky-900">💬 本人から聞いたこと</p><p className="mt-1 whitespace-pre-wrap text-sm">{record.customer_note || "記載なし"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-800">📝 観察・指導・施術・会話メモ</p><p className="mt-1 whitespace-pre-wrap text-sm">{record.observation_note || "記載なし"}</p></div></div></div>
}
