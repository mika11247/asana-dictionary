"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import CustomerForm from "@/components/crm/CustomerForm"
import PhotoPermissionBadge from "@/components/crm/PhotoPermissionBadge"
import { formatDate, listCrmBusinesses } from "@/lib/crm"
import { findCrmCustomerCandidates, groupLabels, saveCrmCustomerMemberships } from "@/lib/crmMemberships"
import { contactRestrictions, interestLabels, listNusRelationshipTypes, progressFields, progressLabels } from "@/lib/crmNus"

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [services, setServices] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [groupFilter, setGroupFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [nusFilter, setNusFilter] = useState({})
  const [nusData, setNusData] = useState(null)
  const [nusError, setNusError] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [serviceFilter, setServiceFilter] = useState("")
  const [membershipFilter, setMembershipFilter] = useState("")
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [archived, setArchived] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [updatingFlags, setUpdatingFlags] = useState({})

  async function load() {
    setLoading(true)
    setError("")
    const [customerResult, locationResult, serviceResult, businessResult] = await Promise.all([
      supabase.from("crm_customers").select("*, crm_customer_services(id, location_id, service_id, membership_type, crm_locations(id, name, is_active), crm_services(id, name, is_active)), crm_records(record_date), crm_customer_businesses(business_code, stage, archived_at), crm_customer_groups(group_code, archived_at), crm_customer_group_brands(business_code, archived_at)").eq("archived", archived).order("name"),
      supabase.from("crm_locations").select("*").order("sort_order").order("name"),
      supabase.from("crm_services").select("*").order("sort_order").order("name"),
      listCrmBusinesses(supabase),
    ])
    const firstError = customerResult.error || locationResult.error || serviceResult.error || businessResult.error
    if (firstError) {
      console.error("CRM一覧の取得に失敗しました", firstError)
      setError("顧客情報を読み込めませんでした。時間をおいて再度お試しください。")
    } else {
      setCustomers(customerResult.data || [])
      setLocations(locationResult.data || [])
      setServices(serviceResult.data || [])
      setBusinesses(businessResult.data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [archived])

  useEffect(() => {
    if (groupFilter !== "nus") return
    let mounted = true
    Promise.all([
      supabase.from("crm_nus_profiles").select("customer_id, product_interest, business_interest, disclosure_status, product_proposal_status, business_proposal_status"),
      supabase.from("crm_nus_customer_relationships").select("customer_id, type_code").is("archived_at", null),
      supabase.from("crm_contact_preferences_current").select("customer_id, scope, decision, coverage").eq("decision", "refuse"),
      listNusRelationshipTypes(supabase),
    ]).then(([profiles, roles, preferences, types]) => {
      if (!mounted) return
      if (profiles.error || roles.error || preferences.error || types.error) setNusError("NUS情報を読み込めませんでした。")
      else setNusData({ profiles: profiles.data, roles: roles.data, preferences: preferences.data, types: types.data })
    })
    return () => { mounted = false }
  }, [groupFilter])

  function changeGroup(value) {
    setGroupFilter(value)
    setBrandFilter("")
    setNusFilter({})
    setNusData(null)
    setNusError("")
    setLocationFilter("")
    setServiceFilter("")
    setMembershipFilter("")
  }

  const brands = businesses.filter(({ code }) => code !== "nus")
  const nusOptions = nusData ? [
    ["stage", "NUS顧客区分", { prospect: "見込み客", customer: "顧客", unconfirmed: "未確認" }],
    ["role", "関係性", Object.fromEntries(nusData.types.map(({ code, label }) => [code, label]))],
    ["product_interest", "商品への関心", interestLabels],
    ["business_interest", "ビジネスへの関心", interestLabels],
    ...progressFields.map(([key, label]) => [`${key}_status`, label, progressLabels]),
    ["restriction", "連絡制限", { business: "ビジネス案内停止", product: "商品案内停止", administrative: "事務連絡も停止" }],
  ] : []
  // Stage A uses the existing Lilly location ID for service links.
  const lillyLocationId = "1"
  const appliedDetails = [
    locations.find(({ id }) => String(id) === locationFilter)?.name,
    services.find(({ id }) => String(id) === serviceFilter)?.name,
    membershipFilter,
    ...nusOptions.map(([key, label, options]) => nusFilter[key] && `${label}：${options[nusFilter[key]]}`),
  ].filter(Boolean)

  const filtered = useMemo(() => {
    const word = query.trim().toLocaleLowerCase("ja")
    return customers.filter((customer) => {
      const textMatch = !word || [customer.name, customer.nickname, customer.name_yomi, customer.private_note].some((value) => (value || "").toLocaleLowerCase("ja").includes(word))
      const serviceLinks = customer.crm_customer_services
      const detailMatch = groupFilter === "lilly"
        ? !(serviceFilter || membershipFilter) || serviceLinks.some((item) =>
          String(item.location_id) === lillyLocationId &&
          (!serviceFilter || String(item.service_id) === serviceFilter) &&
          (!membershipFilter || item.membership_type === membershipFilter))
        : (!locationFilter || serviceLinks.some((item) => String(item.location_id) === locationFilter)) &&
          (!serviceFilter || serviceLinks.some((item) => String(item.service_id) === serviceFilter)) &&
          (!membershipFilter || serviceLinks.some((item) => item.membership_type === membershipFilter))
      const favoriteMatch = !favoriteOnly || customer.is_favorite
      const pinnedMatch = !pinnedOnly || customer.is_pinned
      const activeBusinesses = customer.crm_customer_businesses.filter((item) => !item.archived_at)
      const groups = customer.crm_customer_groups.filter((item) => !item.archived_at)
      const groupMatch = !groupFilter || (groupFilter === "unassigned"
        ? groups.length === 0
        : groups.some((item) => item.group_code === groupFilter))
      const brandMatch = !brandFilter || customer.crm_customer_group_brands.some((item) => item.business_code === brandFilter && !item.archived_at)
      if (!(textMatch && detailMatch && favoriteMatch && pinnedMatch && groupMatch && brandMatch)) return false
      if (groupFilter !== "nus" || !Object.values(nusFilter).some(Boolean)) return true
      if (!nusData) return false
      const profile = nusData.profiles.find((item) => item.customer_id === customer.id)
      const stage = activeBusinesses.find((item) => item.business_code === "nus")?.stage || "unconfirmed"
      const restrictions = contactRestrictions(nusData.preferences.filter((item) => item.customer_id === customer.id))
      return Object.entries(nusFilter).every(([key, value]) => {
        if (!value) return true
        if (key === "stage") return stage === value
        if (key === "role") return nusData.roles.some((item) => item.customer_id === customer.id && item.type_code === value)
        if (key === "restriction") return restrictions[value]
        return (profile?.[key] || "unknown") === value
      })
    })
  }, [customers, query, locationFilter, serviceFilter, membershipFilter, favoriteOnly, pinnedOnly, groupFilter, brandFilter, nusFilter, nusData])

  async function toggleCustomerFlag(customer, field) {
    const key = `${customer.id}:${field}`
    if (updatingFlags[key]) return
    const nextValue = !customer[field]
    setUpdatingFlags((current) => ({ ...current, [key]: true }))
    setError("")
    setCustomers((current) => current.map((item) => item.id === customer.id ? { ...item, [field]: nextValue } : item))
    const { error: updateError } = await supabase.from("crm_customers").update({ [field]: nextValue }).eq("id", customer.id)
    if (updateError) {
      console.error("顧客フラグの更新に失敗しました", { code: updateError.code, message: updateError.message, details: updateError.details, hint: updateError.hint })
      setCustomers((current) => current.map((item) => item.id === customer.id ? { ...item, [field]: customer[field] } : item))
      setError(field === "is_favorite" ? "お気に入りを変更できませんでした。" : "ピックアップを変更できませんでした。")
    }
    setUpdatingFlags((current) => ({ ...current, [key]: false }))
  }

  async function createCustomer(values, relations, selection) {
    const customerId = await saveCrmCustomerMemberships(supabase, null, values, relations, selection)
    setShowCreate(false)
    router.push(`/admin/customers/${customerId}`)
  }

  const filterClass = "mt-2 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base"

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><Link href="/admin" className="text-sm text-sky-700">← 管理メニュー</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">👥 顧客管理</h1></div>
          <Link href="/admin/customers/settings" className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm">設定</Link>
        </div>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・よみがな・ニックネーム・メモで検索" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-sky-400" />
          <select aria-label="所属で絞り込み" value={groupFilter} onChange={(e) => changeGroup(e.target.value)} className={filterClass}>
            <option value="">全顧客</option>
            {Object.entries(groupLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            <option value="unassigned">所属未設定</option>
          </select>
          {groupFilter === "mglitter" && <select aria-label="ブランドで絞り込み" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className={filterClass}>
            <option value="">すべてのブランド</option>
            {brands.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
          </select>}
          {groupFilter === "unassigned" && <p className="mt-2 text-sm text-gray-600">所属未設定の顧客も、詳細条件から既存の担当先やサービスで検索できます。</p>}
          <details key={groupFilter} className="mt-2 rounded-xl border border-gray-200 px-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">詳細条件{appliedDetails.length ? `（${appliedDetails.length}件適用中）` : ""}</summary>
            <div className="grid gap-2 pb-3 sm:grid-cols-2">
              {groupFilter !== "lilly" && <select aria-label="担当先で絞り込み" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={filterClass}><option value="">すべての担当先</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
              <select aria-label="サービスで絞り込み" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={filterClass}><option value="">{groupFilter === "lilly" ? "Lillyの全サービス" : "すべてのサービス"}</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select aria-label="既存の会員種別で絞り込み" value={membershipFilter} onChange={(e) => setMembershipFilter(e.target.value)} className={filterClass}><option value="">すべての既存会員種別</option>{["通い放題", "回数券", "月謝", "体験"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
              {nusOptions.map(([key, label, options]) => (
                <label key={key} className="text-sm">{label}
                  <select value={nusFilter[key] || ""} onChange={(event) => setNusFilter({ ...nusFilter, [key]: event.target.value })} className={filterClass}>
                    <option value="">すべて</option>
                    {Object.entries(options).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </details>
          {appliedDetails.length > 0 && <p className="mt-2 break-words text-sm text-gray-700">適用中：{appliedDetails.join("・")}</p>}
          <div className="mt-3 flex rounded-2xl bg-gray-100 p-1">
            {[false, true].map((value) => <button key={String(value)} onClick={() => setArchived(value)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${archived === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{value ? "アーカイブ" : "通常"}</button>)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-xs font-bold text-gray-500">絞り込み</span>
            <button type="button" aria-pressed={favoriteOnly} onClick={() => setFavoriteOnly((value) => !value)} className={`rounded-full border px-3 py-2 text-sm font-bold ${favoriteOnly ? "border-amber-300 bg-amber-50 text-amber-800" : "border-gray-200 bg-white text-gray-500"}`}>⭐️ お気に入り</button>
            <button type="button" aria-pressed={pinnedOnly} onClick={() => setPinnedOnly((value) => !value)} className={`rounded-full border px-3 py-2 text-sm font-bold ${pinnedOnly ? "border-sky-300 bg-sky-50 text-sky-800" : "border-gray-200 bg-white text-gray-500"}`}>📌 ピックアップ</button>
          </div>
        </section>

        <button onClick={() => setShowCreate(true)} className="mb-4 w-full rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white shadow-sm">＋ 新規顧客</button>
        {error && <p className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {groupFilter === "nus" && nusError && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{nusError}</p>}
        {loading || (groupFilter === "nus" && !nusData && !nusError) ? <p className="py-10 text-center text-gray-500">読み込み中...</p> : (
          <div className="space-y-3">
            {filtered.length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">該当する顧客はいません。</p>}
            {filtered.map((customer) => {
              const activeGroups = Object.entries(groupLabels).filter(([code]) => customer.crm_customer_groups.some((item) => item.group_code === code && !item.archived_at))
              const activeBrands = brands.filter(({ code }) => customer.crm_customer_group_brands.some((item) => item.business_code === code && !item.archived_at))
              const lastDate = (customer.crm_records || []).reduce((max, item) => !max || item.record_date > max ? item.record_date : max, null)
              const favoriteKey = `${customer.id}:is_favorite`; const pinnedKey = `${customer.id}:is_pinned`
              return <article key={customer.id} className="group relative rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md">
                <Link href={`/admin/customers/${customer.id}`} aria-label={`${customer.name}様の個人カルテを開く`} className="absolute inset-0 z-0 rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2" />
                <div className="pointer-events-none relative z-10 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-start gap-1">
                  <button type="button" disabled={updatingFlags[favoriteKey]} onClick={(event) => { event.stopPropagation(); toggleCustomerFlag(customer, "is_favorite") }} aria-label={customer.is_favorite ? "お気に入りから解除" : "お気に入りに追加"} className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-xl transition disabled:opacity-50 ${customer.is_favorite ? "bg-amber-50" : "text-gray-400 hover:bg-gray-50"}`}>{customer.is_favorite ? "⭐️" : "☆"}</button>
                  <div className="min-w-0 px-1"><h2 className="break-words text-lg font-bold leading-snug text-gray-900"><span>{customer.name}</span><span className="whitespace-nowrap"> 様</span></h2>{customer.name_yomi && <p className="mt-1 text-sm font-medium text-gray-600">{customer.name_yomi}</p>}{customer.nickname && <p className="mt-0.5 text-sm text-gray-500">{customer.nickname}</p>}</div>
                  <button type="button" disabled={updatingFlags[pinnedKey]} onClick={(event) => { event.stopPropagation(); toggleCustomerFlag(customer, "is_pinned") }} aria-label={customer.is_pinned ? "ピックアップから解除" : "ピックアップに追加"} className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-xl transition disabled:opacity-50 ${customer.is_pinned ? "bg-sky-100 opacity-100" : "opacity-30 hover:bg-gray-50 hover:opacity-60"}`}>📌</button>
                </div>
                <div className="pointer-events-none relative z-10 mt-3 flex flex-wrap items-center gap-2"><PhotoPermissionBadge value={customer.photo_permission} />{customer.care_notes?.trim() && <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">⚠️ 配慮あり</span>}</div>
                <div className="pointer-events-none relative z-10 mt-3 flex flex-wrap gap-2">{customer.crm_customer_services?.map((item) => <span key={item.id} className="rounded-2xl bg-sky-50 px-3 py-1.5 text-xs text-sky-800"><span>サービス：{item.crm_locations?.name} × {item.crm_services?.name}</span>{item.membership_type && <span className="ml-2 font-bold text-violet-700">🎫 {item.membership_type}</span>}</span>)}</div>
                <div className="pointer-events-none relative z-10 mt-2 flex flex-wrap gap-2">
                  {activeGroups.length ? activeGroups.map(([code, name]) => (
                    <span key={code} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{name}</span>
                  )) : <span className="text-xs text-gray-500">所属未設定</span>}
                  {activeBrands.map(({ code, name }) => <span key={code} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{name}</span>)}
                </div>
                <p className="pointer-events-none relative z-10 mt-3 text-sm text-gray-500">最終参加日：<span className="font-semibold text-gray-700">{formatDate(lastDate)}</span></p>
              </article>
            })}
          </div>
        )}
      </div>
      {showCreate && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"><div className="mx-auto my-4 max-w-xl rounded-3xl bg-white p-5 shadow-xl"><h2 className="mb-5 text-xl font-bold">新規顧客</h2><CustomerForm locations={locations} services={services} businesses={businesses} findCandidates={(form) => findCrmCustomerCandidates(supabase, form)} onSave={createCustomer} onCancel={() => setShowCreate(false)} submitLabel="顧客を登録" /></div></div>}
    </main>
  )
}
