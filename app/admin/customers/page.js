"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import LillyFields from "@/components/crm/LillyFields"
import { isLegacyLilly as isLilly, lillyDisplayName, lillyFormalName, lillyMemberships, lillyServices, usesLillyDisplay } from "@/lib/crmLilly"
import CustomerForm from "@/components/crm/CustomerForm"
import PhotoPermissionBadge from "@/components/crm/PhotoPermissionBadge"
import { formatDate, listCrmBusinesses } from "@/lib/crm"
import { findCrmCustomerCandidates, groupLabels, saveCrmCustomerMemberships } from "@/lib/crmMemberships"
import { contactRestrictions, interestLabels, listNusRelationshipTypes, progressFields, progressLabels } from "@/lib/crmNus"

const toggle = (values, key) => values.includes(key) ? values.filter((value) => value !== key) : [...values, key]
const isDenied = ({ status, error }) => [401, 403].includes(status) || ["42501", "PGRST301", "PGRST303"].includes(error?.code)

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [services, setServices] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [groups, setGroups] = useState([])
  const [panel, setPanel] = useState("")
  const [legacyLilly, setLegacyLilly] = useState(false)
  const [lilly, setLilly] = useState({})
  const [denied, setDenied] = useState(false)
  const [brandFilter, setBrandFilter] = useState([])
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
      supabase.from("crm_customers").select("*, crm_customer_services(id, location_id, service_id, membership_type, crm_locations(id, name, is_active), crm_services(id, name, is_active)), crm_records(record_date), crm_customer_businesses(business_code, stage, archived_at), crm_customer_groups(group_code, archived_at), crm_customer_group_brands(business_code, archived_at), crm_lilly_profiles(membership, service_codes)").eq("archived", archived).order("name"),
      supabase.from("crm_locations").select("*").order("sort_order").order("name"),
      supabase.from("crm_services").select("*").order("sort_order").order("name"),
      listCrmBusinesses(supabase),
    ])
    const firstError = customerResult.error || locationResult.error || serviceResult.error || businessResult.error
    if (firstError) {
      setCustomers([])
      if ([customerResult, locationResult, serviceResult, businessResult].some(isDenied)) setDenied(true)
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

  const includeNus = groups.includes("nus")
  const nusOnly = includeNus && groups.length === 1

  useEffect(() => {
    if (!includeNus) return
    let mounted = true
    Promise.all([
      supabase.from("crm_nus_profiles").select("customer_id, product_interest, business_interest, disclosure_status, product_proposal_status, business_proposal_status"),
      supabase.from("crm_nus_customer_relationships").select("customer_id, type_code").is("archived_at", null),
      supabase.from("crm_contact_preferences_current").select("customer_id, scope, decision, coverage").eq("decision", "refuse"),
      listNusRelationshipTypes(supabase),
      supabase.rpc("is_crm_admin"),
    ]).then(([profiles, roles, preferences, types, access]) => {
      if (!mounted) return
      if (access.data === false || [profiles, roles, preferences, types, access].some(isDenied)) setDenied(true)
      else if (profiles.error || roles.error || preferences.error || types.error || access.data !== true) setNusError("NUS情報を読み込めませんでした。")
      else setNusData({ profiles: profiles.data, roles: roles.data, preferences: preferences.data, types: types.data })
    }).catch(() => {
      if (mounted) setNusError("NUS情報を読み込めませんでした。")
    })
    return () => { mounted = false }
  }, [includeNus])

  function changeGroup(code) {
    const selected = groups.includes(code)
    if (code === "nus") {
      setNusData(null)
      setNusError("")
    }
    setGroups(toggle(groups, code))
    if (!selected && code !== "unassigned") setPanel(code)
    else if (panel === code) setPanel("")
  }

  function clearFilters() {
    setGroups([])
    setPanel("")
    setBrandFilter([])
    setNusFilter({})
    setLilly({})
    setLegacyLilly(false)
    setLocationFilter("")
    setServiceFilter("")
    setMembershipFilter("")
    setQuery("")
    setFavoriteOnly(false)
    setPinnedOnly(false)
    setNusData(null)
    setNusError("")
  }

  const brands = businesses.filter(({ code }) => code !== "nus")
  const nusOptions = [
    ["stage", "NUS顧客区分", { prospect: "見込み客", customer: "顧客", unconfirmed: "未確認" }],
    ["role", "関係性", Object.fromEntries((nusData?.types || []).map(({ code, label }) => [code, label]))],
    ["product_interest", "商品への関心", interestLabels],
    ["business_interest", "ビジネスへの関心", interestLabels],
    ...progressFields.map(([key, label]) => [`${key}_status`, label, progressLabels]),
    ["restriction", "連絡制限", { business: "ビジネス案内停止", product: "商品案内停止", administrative: "事務連絡も停止" }],
  ]
  const locationOptions = locations.map(({ id, name }) => [String(id), name])
  const serviceOptions = services.map(({ id, name }) => [String(id), name])
  const memberOptions = ["通い放題", "回数券", "月謝", "体験"].map((name) => [name, name])
  const labelFor = (options, value) => options.find(([key]) => key === value)?.[1] || value
  const summaries = {
    mglitter: brands.filter(({ code }) => brandFilter.includes(code)).map(({ name }) => name),
    nus: nusOptions.flatMap(([key, label, options]) => nusFilter[key] ? [label + "：" + (options[nusFilter[key]] || "選択済み")] : []),
    lilly: [lillyMemberships[lilly.membership], ...(lilly.services || []).map((code) => lillyServices[code])].filter(Boolean),
    legacy: [legacyLilly && "旧Lilly情報あり", labelFor(locationOptions, locationFilter), labelFor(serviceOptions, serviceFilter), membershipFilter].filter(Boolean),
  }

  function matchesGroup(customer, code) {
    const active = customer.crm_customer_groups.filter((item) => !item.archived_at)
    if (code === "unassigned") return active.length === 0
    if (!active.some(({ group_code }) => group_code === code)) return false
    if (code === "mglitter") return !brandFilter.length || customer.crm_customer_group_brands.some((item) =>
      !item.archived_at && brandFilter.includes(item.business_code))
    if (code === "lilly") {
      const profile = customer.crm_lilly_profiles
      return (!lilly.membership || (profile?.membership || "unknown") === lilly.membership) &&
        (!(lilly.services?.length) || lilly.services.some((code) => profile?.service_codes.includes(code)))
    }
    if (!nusData) return false
    const profile = nusData.profiles.find((item) => item.customer_id === customer.id)
    const stage = customer.crm_customer_businesses.find((item) => item.business_code === "nus" && !item.archived_at)?.stage || "unconfirmed"
    const restrictions = contactRestrictions(nusData.preferences.filter((item) => item.customer_id === customer.id))
    return Object.entries(nusFilter).every(([key, value]) => {
      if (!value) return true
      if (key === "stage") return stage === value
      if (key === "role") return nusData.roles.some((item) => item.customer_id === customer.id && item.type_code === value)
      if (key === "restriction") return restrictions[value]
      return (profile?.[key] || "unknown") === value
    })
  }

  function lillyView(customer) {
    return usesLillyDisplay(customer) ||
      (groups.includes("lilly") && customer.crm_customer_groups.some(({ group_code, archived_at }) => group_code === "lilly" && !archived_at))
  }

  const word = query.trim().toLocaleLowerCase("ja")
  const filtered = customers.filter((customer) => {
    const links = customer.crm_customer_services
    const searchValues = lillyView(customer) ? [customer.nickname] : [customer.name, customer.nickname, customer.name_yomi, customer.private_note]
    const textMatch = !word || searchValues
      .some((value) => (value || "").toLocaleLowerCase("ja").includes(word))
    return textMatch && (!favoriteOnly || customer.is_favorite) && (!pinnedOnly || customer.is_pinned) &&
      (!legacyLilly || links.some(isLilly)) &&
      (!locationFilter || links.some((item) => String(item.location_id) === locationFilter)) &&
      (!serviceFilter || links.some((item) => String(item.service_id) === serviceFilter)) &&
      (!membershipFilter || links.some((item) => item.membership_type === membershipFilter)) &&
      (!groups.length || groups.some((code) => matchesGroup(customer, code)))
  })

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

  function filterSelect(label, value, onChange, options) {
    return <label key={label} className="block min-w-0 text-sm">{label}
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-base">
        <option value="">すべて</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  }

  if (denied) return <p role="alert" className="p-6">CRMを閲覧できません。</p>

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><Link href="/admin" className="text-sm text-sky-700">← 管理メニュー</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">👥 顧客管理</h1></div>
          <Link href="/admin/customers/settings" className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm">設定</Link>
        </div>

        <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・よみがな・ニックネーム・メモで検索" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-sky-400" />
          <fieldset className="mt-3">
            <legend className="text-sm font-semibold">所属で絞り込み</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {[...Object.entries(groupLabels), ["unassigned", "所属未設定"]].map(([code, label]) =>
                <button key={code} type="button" aria-pressed={groups.includes(code)} onClick={() => changeGroup(code)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${groups.includes(code) ? "border-sky-400 bg-sky-100 text-sky-900" : "border-gray-200 text-gray-700"}`}>{label}</button>
              )}
            </div>
          </fieldset>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3">
            <p className="text-sm text-gray-700" aria-live="polite">{groups.length ? groups.map((code) => groupLabels[code] || "所属未設定").join(" または ") : "全顧客"}</p>
            <button type="button" onClick={clearFilters} className="min-h-11 text-sm font-semibold text-sky-800">条件をすべて解除</button>
          </div>
          {[...Object.entries(groupLabels).filter(([code]) => groups.includes(code)).map(([code, label]) => [code, label + "の条件"]),
            ["legacy", "旧サービス情報を確認"]].map(([code, label]) => (
            <section key={code} className="mt-2 rounded-xl border border-gray-200 px-3">
              <button type="button" aria-expanded={panel === code} aria-controls={`filters-${code}`}
                onClick={() => setPanel(panel === code ? "" : code)} className="min-h-11 w-full py-2 text-left text-sm font-semibold">
                {label}{summaries[code].length ? `（${summaries[code].length}件適用中）` : ""}
              </button>
              {summaries[code].length > 0 && <p className="break-words pb-2 text-sm text-gray-700">{summaries[code].join("・")}</p>}
              <div id={`filters-${code}`} hidden={panel !== code}>
                <div className="grid gap-2 pb-3 sm:grid-cols-2">
                  {code === "mglitter" && brands.map(({ code: brand, name }) => (
                    <label key={brand} className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" checked={brandFilter.includes(brand)} onChange={() => setBrandFilter((values) => toggle(values, brand))} />{name}
                    </label>
                  ))}
                  {code === "nus" && nusData && nusOptions.map(([key, label, options]) =>
                    filterSelect(label, nusFilter[key], (value) => setNusFilter((current) => ({ ...current, [key]: value })), Object.entries(options)))}
                  {code === "lilly" && <LillyFields search value={lilly} onChange={setLilly} />}
                  {code === "legacy" && <>
                    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={legacyLilly} onChange={(event) => setLegacyLilly(event.target.checked)} />旧Lilly情報あり</label>
                    {filterSelect("担当先で絞り込み", locationFilter, setLocationFilter, locationOptions)}
                    {filterSelect("サービスで絞り込み", serviceFilter, setServiceFilter, serviceOptions)}
                    {filterSelect("既存の会員種別で絞り込み", membershipFilter, setMembershipFilter, memberOptions)}
                  </>}
                </div>
              </div>
            </section>
          ))}
          <div className="mt-3 flex rounded-2xl bg-gray-100 p-1">
            {[false, true].map((value) => <button key={String(value)} onClick={() => setArchived(value)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${archived === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{value ? "アーカイブ" : "通常"}</button>)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs font-bold text-gray-500">絞り込み</span>
            <button type="button" aria-pressed={favoriteOnly} onClick={() => setFavoriteOnly((value) => !value)} className={`rounded-full border px-3 py-2 text-sm font-bold ${favoriteOnly ? "border-amber-300 bg-amber-50 text-amber-800" : "border-gray-200 bg-white text-gray-500"}`}>⭐️ お気に入り</button>
            <button type="button" aria-pressed={pinnedOnly} onClick={() => setPinnedOnly((value) => !value)} className={`rounded-full border px-3 py-2 text-sm font-bold ${pinnedOnly ? "border-sky-300 bg-sky-50 text-sky-800" : "border-gray-200 bg-white text-gray-500"}`}>📌 ピックアップ</button>
          </div>
        </section>

        <button onClick={() => setShowCreate(true)} className="mb-4 w-full rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white shadow-sm">＋ 新規顧客</button>
        {error && <p className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {includeNus && nusError && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {nusError}{!nusOnly && " NUSの条件を除いた一部の検索結果を表示しています。"}
        </p>}
        {includeNus && !nusData && !nusError && <p role="status" className="mb-4 text-sm text-gray-600">NUS情報を読み込み中…</p>}
        {loading ? <p className="py-10 text-center text-gray-500">読み込み中...</p> : !(nusOnly && !nusData) && (
          <div className="space-y-3">
            {filtered.length === 0 && !(includeNus && !nusData) && <p className="rounded-3xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">該当する顧客はいません。</p>}
            {filtered.map((customer) => {
              const activeGroups = Object.entries(groupLabels).filter(([code]) => customer.crm_customer_groups.some((item) => item.group_code === code && !item.archived_at))
              const activeBrands = brands.filter(({ code }) => customer.crm_customer_group_brands.some((item) => item.business_code === code && !item.archived_at))
              const lastDate = (customer.crm_records || []).reduce((max, item) => !max || item.record_date > max ? item.record_date : max, null)
              const nicknameView = lillyView(customer)
              const displayName = nicknameView ? lillyDisplayName(customer) : customer.name || lillyDisplayName(customer, { includeId: true })
              const formalName = nicknameView && lillyFormalName(customer)
              const favoriteKey = `${customer.id}:is_favorite`; const pinnedKey = `${customer.id}:is_pinned`
              return <article key={customer.id} className="group relative rounded-3xl border border-transparent bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md">
                <Link href={`/admin/customers/${customer.id}${nicknameView ? "?view=lilly" : ""}`} aria-label={`${displayName}${formalName ? `（${formalName}）` : ""}の個人カルテを開く`} className="absolute inset-0 z-0 rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2" />
                <div className="pointer-events-none relative z-10 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-start gap-1">
                  <button type="button" disabled={updatingFlags[favoriteKey]} onClick={(event) => { event.stopPropagation(); toggleCustomerFlag(customer, "is_favorite") }} aria-label={customer.is_favorite ? "お気に入りから解除" : "お気に入りに追加"} className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-xl transition disabled:opacity-50 ${customer.is_favorite ? "bg-amber-50" : "text-gray-400 hover:bg-gray-50"}`}>{customer.is_favorite ? "⭐️" : "☆"}</button>
                  <div className="min-w-0 px-1"><h2 className="break-words text-lg font-bold leading-snug text-gray-900"><span>{displayName}</span>{!nicknameView && <span className="whitespace-nowrap"> 様</span>}</h2>{formalName && <p className="mt-1 break-words text-sm text-gray-600">{formalName}</p>}{!nicknameView && customer.name_yomi && <p className="mt-1 text-sm font-medium text-gray-600">{customer.name_yomi}</p>}{!nicknameView && customer.nickname && <p className="mt-0.5 text-sm text-gray-500">{customer.nickname}</p>}</div>
                  <button type="button" disabled={updatingFlags[pinnedKey]} onClick={(event) => { event.stopPropagation(); toggleCustomerFlag(customer, "is_pinned") }} aria-label={customer.is_pinned ? "ピックアップから解除" : "ピックアップに追加"} className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-xl transition disabled:opacity-50 ${customer.is_pinned ? "bg-sky-100 opacity-100" : "opacity-30 hover:bg-gray-50 hover:opacity-60"}`}>📌</button>
                </div>
                <div className="pointer-events-none relative z-10 mt-3 flex flex-wrap items-center gap-2"><PhotoPermissionBadge value={customer.photo_permission} />{customer.care_notes?.trim() && <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">⚠️ 配慮あり</span>}</div>
                <div className="pointer-events-none relative z-10 mt-3 flex flex-wrap gap-2">{customer.crm_customer_services?.map((item) => <span key={item.id} className="rounded-2xl bg-sky-50 px-3 py-1.5 text-xs text-sky-800"><span>{isLilly(item) ? "旧サービス：" : "サービス："}{item.crm_locations?.name} × {item.crm_services?.name}</span>{item.membership_type && <span className="ml-2 font-bold text-violet-700">🎫 {item.membership_type}</span>}</span>)}</div>
                <div className="pointer-events-none relative z-10 mt-2 flex flex-wrap gap-2">
                  {activeGroups.length ? activeGroups.map(([code, name]) => (
                    <span key={code} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{name}所属</span>
                  )) : <span className="text-xs text-gray-500">所属未設定</span>}
                  {activeBrands.map(({ code, name }) => <span key={code} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{name}</span>)}
                </div>
                <p className="pointer-events-none relative z-10 mt-3 text-sm text-gray-500">最終参加日：<span className="font-semibold text-gray-700">{formatDate(lastDate)}</span></p>
              </article>
            })}
          </div>
        )}
      </div>
      {showCreate && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"><div className="mx-auto my-4 max-w-xl rounded-3xl bg-white p-5 shadow-xl"><h2 className="mb-5 text-xl font-bold">新規顧客</h2><CustomerForm locations={locations} services={services} businesses={businesses} findCandidates={(form, lillyOnly) => findCrmCustomerCandidates(supabase, form, lillyOnly)} onSave={createCustomer} onCancel={() => setShowCreate(false)} submitLabel="顧客を登録" /></div></div>}
    </main>
  )
}
