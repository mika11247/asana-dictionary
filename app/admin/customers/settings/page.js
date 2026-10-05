"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function CustomerSettingsPage() {
  const [locations, setLocations] = useState([]); const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [saving, setSaving] = useState(false)
  async function load() {
    setLoading(true); const [a, b] = await Promise.all([supabase.from("crm_locations").select("*").order("sort_order").order("name"), supabase.from("crm_services").select("*").order("sort_order").order("name")])
    if (a.error || b.error) { console.error("マスター取得に失敗しました", a.error || b.error); setError("設定を読み込めませんでした。") } else { setLocations(a.data || []); setServices(b.data || []) } setLoading(false)
  }
  useEffect(() => { load() }, [])
  async function add(table, label) {
    const name = window.prompt(`${label}の名称を入力してください。`)?.trim(); if (!name) return
    setSaving(true); setError("")
    const list = table === "crm_locations" ? locations : services
    const { error: insertError } = await supabase.from(table).insert({ name, is_active: true, sort_order: list.length ? Math.max(...list.map((x) => x.sort_order || 0)) + 1 : 1 })
    if (insertError) { console.error("マスター追加に失敗しました", insertError); setError(`${label}を追加できませんでした。`) } else await load(); setSaving(false)
  }
  async function update(table, item, patch) {
    setSaving(true); setError("")
    const { error: updateError } = await supabase.from(table).update(patch).eq("id", item.id)
    if (updateError) { console.error("マスター更新に失敗しました", updateError); setError("設定を保存できませんでした。") } else await load(); setSaving(false)
  }
  return <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 py-6 sm:p-8"><div className="mx-auto max-w-3xl"><Link href="/admin/customers" className="text-sm text-sky-700">← 顧客一覧</Link><h1 className="mt-2 text-2xl font-bold">担当先・サービス設定</h1><p className="mt-2 text-sm text-gray-500">使用しない項目は削除せず「非表示」にしてください。</p>{error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{loading ? <p className="py-10 text-center text-gray-500">読み込み中...</p> : <div className="mt-5 grid gap-5 md:grid-cols-2"><MasterList title="担当先" table="crm_locations" items={locations} saving={saving} onAdd={add} onUpdate={update} /><MasterList title="サービス" table="crm_services" items={services} saving={saving} onAdd={add} onUpdate={update} /></div>}</div></main>
}

function MasterList({ title, table, items, saving, onAdd, onUpdate }) {
  return <section className="rounded-3xl bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button disabled={saving} onClick={() => onAdd(table, title)} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">＋ 追加</button></div><div className="space-y-3">{items.map((item) => <div key={item.id} className={`rounded-2xl border p-3 ${item.is_active ? "border-gray-100" : "border-gray-100 bg-gray-50 opacity-70"}`}><input defaultValue={item.name} aria-label={`${title}名`} onBlur={(e) => { const name = e.target.value.trim(); if (name && name !== item.name) onUpdate(table, item, { name }) }} className="w-full rounded-xl border border-gray-200 px-3 py-2 font-medium" /><div className="mt-2 flex items-center justify-between gap-3"><label className="text-xs text-gray-500">並び順 <input type="number" defaultValue={item.sort_order} onBlur={(e) => { const value = Number(e.target.value); if (value !== item.sort_order) onUpdate(table, item, { sort_order: value }) }} className="ml-1 w-16 rounded-lg border border-gray-200 px-2 py-1" /></label><button disabled={saving} onClick={() => onUpdate(table, item, { is_active: !item.is_active })} className={`rounded-full px-3 py-1 text-xs font-bold ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>{item.is_active ? "有効" : "非表示"}</button></div></div>)}</div></section>
}
