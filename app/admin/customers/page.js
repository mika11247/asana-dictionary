"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import CustomerForm from "@/components/crm/CustomerForm"
import PhotoPermissionBadge from "@/components/crm/PhotoPermissionBadge"
import { formatDate } from "@/lib/crm"

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [serviceFilter, setServiceFilter] = useState("")
  const [archived, setArchived] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    setLoading(true)
    setError("")
    const [customerResult, locationResult, serviceResult] = await Promise.all([
      supabase.from("crm_customers").select("*, crm_customer_services(id, location_id, service_id, crm_locations(id, name, is_active), crm_services(id, name, is_active)), crm_records(record_date)").eq("archived", archived).order("name"),
      supabase.from("crm_locations").select("*").order("sort_order").order("name"),
      supabase.from("crm_services").select("*").order("sort_order").order("name"),
    ])
    const firstError = customerResult.error || locationResult.error || serviceResult.error
    if (firstError) {
      console.error("CRM一覧の取得に失敗しました", firstError)
      setError("顧客情報を読み込めませんでした。時間をおいて再度お試しください。")
    } else {
      setCustomers(customerResult.data || [])
      setLocations(locationResult.data || [])
      setServices(serviceResult.data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [archived])

  const filtered = useMemo(() => {
    const word = query.trim().toLocaleLowerCase("ja")
    return customers.filter((customer) => {
      const textMatch = !word || [customer.name, customer.nickname, customer.name_yomi].some((value) => (value || "").toLocaleLowerCase("ja").includes(word))
      const locationMatch = !locationFilter || customer.crm_customer_services?.some((item) => String(item.location_id) === locationFilter)
      const serviceMatch = !serviceFilter || customer.crm_customer_services?.some((item) => String(item.service_id) === serviceFilter)
      return textMatch && locationMatch && serviceMatch
    })
  }, [customers, query, locationFilter, serviceFilter])

  async function createCustomer(values, relations) {
    const { data, error: customerError } = await supabase.from("crm_customers").insert(values).select().single()
    if (customerError) throw new Error("顧客を登録できませんでした。")
    if (relations.length) {
      const rows = relations.map((item) => ({ customer_id: data.id, ...item }))
      const { error: relationError } = await supabase.from("crm_customer_services").insert(rows)
      if (relationError) {
        const { error: rollbackError } = await supabase.from("crm_customers").delete().eq("id", data.id)
        console.error("担当先・サービスの登録に失敗しました", relationError, rollbackError)
        throw new Error(rollbackError ? "顧客は登録されましたが、担当先・サービスを登録できませんでした。カルテから修正してください。" : "担当先・サービスを登録できなかったため、顧客登録を取り消しました。")
      }
    }
    setShowCreate(false)
    router.push(`/admin/customers/${data.id}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><Link href="/admin" className="text-sm text-sky-700">← 管理メニュー</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">👥 顧客管理</h1></div>
          <Link href="/admin/customers/settings" className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm">設定</Link>
        </div>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・ニックネーム・よみがなで検索" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-sky-400" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm"><option value="">すべての担当先</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm"><option value="">すべてのサービス</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </div>
          <div className="mt-3 flex rounded-2xl bg-gray-100 p-1">
            {[false, true].map((value) => <button key={String(value)} onClick={() => setArchived(value)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${archived === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{value ? "アーカイブ" : "通常"}</button>)}
          </div>
        </section>

        <button onClick={() => setShowCreate(true)} className="mb-4 w-full rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white shadow-sm">＋ 新規顧客</button>
        {error && <p className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading ? <p className="py-10 text-center text-gray-500">読み込み中...</p> : (
          <div className="space-y-3">
            {filtered.length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">該当する顧客はいません。</p>}
            {filtered.map((customer) => {
              const lastDate = (customer.crm_records || []).reduce((max, item) => !max || item.record_date > max ? item.record_date : max, null)
              return <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="block rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-sky-200">
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>{customer.nickname && <p className="text-sm text-gray-500">{customer.nickname}</p>}</div><PhotoPermissionBadge value={customer.photo_permission} /></div>
                <div className="mt-3 flex flex-wrap gap-2">{customer.crm_customer_services?.map((item) => <span key={item.id} className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-800">{item.crm_locations?.name} × {item.crm_services?.name}</span>)}</div>
                <p className="mt-3 text-sm text-gray-500">最終参加日：<span className="font-semibold text-gray-700">{formatDate(lastDate)}</span></p>
              </Link>
            })}
          </div>
        )}
      </div>
      {showCreate && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"><div className="mx-auto my-4 max-w-xl rounded-3xl bg-white p-5 shadow-xl"><h2 className="mb-5 text-xl font-bold">新規顧客</h2><CustomerForm locations={locations} services={services} onSave={createCustomer} onCancel={() => setShowCreate(false)} submitLabel="顧客を登録" /></div></div>}
    </main>
  )
}
