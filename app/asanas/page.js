'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

import {
  ASANA_TYPES,
  TYPE_LABELS,
  TYPE_STYLES,
  CHAKRA_STYLES,
  CHAKRAS,
} from '@/lib/categories'

import Link from 'next/link'

export default function AsanaListPage() {
  const [asanas, setAsanas] = useState([])
  const [openId, setOpenId] = useState(null)

  const [searchText, setSearchText] = useState('')
  const [selectedChakras, setSelectedChakras] = useState([])

  const [openCategories, setOpenCategories] = useState(
    ASANA_TYPES.reduce((acc, type) => {
      acc[type] = true
      return acc
    }, { 未分類: true })
  )

  useEffect(() => {
    fetchAsanas()
  }, [])

  async function fetchAsanas() {
    const { data, error } = await supabase
      .from('asanas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setAsanas(data || [])
  }

  async function handleDelete(id) {
    const ok = window.confirm('このアーサナを削除しますか？')
  
    if (!ok) return
  
    const { error } = await supabase
      .from('asanas')
      .delete()
      .eq('id', id)
  
    if (error) {
      alert(`削除エラー: ${error.message}`)
      return
    }
  
    alert('削除しました')
    fetchAsanas()
  }

  function toggleChakraFilter(chakra) {
    setSelectedChakras((prev) =>
      prev.includes(chakra)
        ? prev.filter((item) => item !== chakra)
        : [...prev, chakra]
    )
  }
  
  function clearChakraFilter() {
    setSelectedChakras([])
  }

  const filteredAsanas = asanas.filter((asana) => {
    const keyword = searchText.toLowerCase()
  
    const matchesSearch =
      asana.title?.toLowerCase().includes(keyword) ||
      asana.sanskrit?.toLowerCase().includes(keyword) ||
      asana.howto?.toLowerCase().includes(keyword) ||
      asana.effect?.toLowerCase().includes(keyword) ||
      asana.caution?.toLowerCase().includes(keyword) ||
      asana.variation?.toLowerCase().includes(keyword) ||
      asana.note?.toLowerCase().includes(keyword) ||
      asana.types?.some((type) => type.toLowerCase().includes(keyword)) ||
      asana.chakras?.some((chakra) => chakra.toLowerCase().includes(keyword))
  
      const matchesChakra =
      selectedChakras.length === 0 ||
      selectedChakras.some((chakra) => asana.chakras?.includes(chakra))
  
    return matchesSearch && matchesChakra
  })

  const groupedAsanas = filteredAsanas.reduce((groups, asana) => {
    const types = asana.types?.length ? asana.types : ['未分類']

    types.forEach((type) => {
      if (!groups[type]) {
        groups[type] = []
      }

      groups[type].push(asana)
    })

    return groups
  }, {})

  const categoryOrder = [...ASANA_TYPES, '未分類']

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">アーサナ一覧</h1>

      <div className="mb-6">
  <input
    type="text"
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    placeholder="ポーズ名・チャクラ・分類で検索"
    className="w-full rounded-xl border px-4 py-3 text-base shadow-sm"
  />
</div>

<p className="mb-3 text-sm text-gray-500">
  {filteredAsanas.length}件のアーサナ
</p>

<div className="mb-6 flex flex-wrap gap-2">
  <button
    type="button"
    onClick={clearChakraFilter}
    className={`rounded-full border px-3 py-1 text-sm ${
      selectedChakras.length === 0
        ? 'border-black bg-black text-white'
        : 'border-gray-200 bg-white text-gray-700'
    }`}
  >
    ALL
  </button>

  {CHAKRAS.map((chakra) => {
    const isSelected = selectedChakras.includes(chakra)

    return (
      <button
        key={chakra}
        type="button"
        onClick={() => toggleChakraFilter(chakra)}
        className={`rounded-full border px-3 py-1 text-sm ${
          isSelected
            ? CHAKRA_STYLES[chakra]
            : 'border-gray-200 bg-white text-gray-700'
        }`}
      >
        {chakra}
      </button>
    )
  })}
</div>
      <div className="space-y-8">
        {categoryOrder
          .filter((category) => groupedAsanas[category])
          .map((category) => (
            <section key={category}>
              <button
                type="button"
                onClick={() =>
                  setOpenCategories((prev) => ({
                    ...prev,
                    [category]: !prev[category],
                  }))
                }
                className={`mb-3 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xl font-bold transition hover:opacity-80 ${
                  TYPE_STYLES[category] || TYPE_STYLES['未分類']
                }`}
              >
                <span>
  <span className="block">{TYPE_LABELS[category]?.ja || category}</span>
  <span className="block text-sm font-normal opacity-70">
    {TYPE_LABELS[category]?.en || category}
  </span>
</span>
                <span className="text-2xl">
                  {openCategories[category] ? '−' : '+'}
                </span>
              </button>

              {openCategories[category] && (
                <div className="space-y-3">
                  {groupedAsanas[category].map((asana) => {
                    const isOpen = openId === asana.id

                    return (
                      <div
                        key={`${category}-${asana.id}`}
                        className="overflow-hidden rounded-xl border bg-white shadow-sm"
                      >


                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? null : asana.id)}
                          className="flex w-full items-center justify-between p-4 text-left"
                        >
                          <div>
                            <h3 className="text-lg font-bold">
                              {asana.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {asana.sanskrit || 'サンスクリット名なし'}
                            </p>
                          </div>

                          <span className="text-2xl">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="space-y-3 border-t p-4 text-sm">
                            <div className="flex justify-end gap-2">
  <Link
    href={`/asanas/${asana.id}/edit`}
    className="rounded bg-black px-3 py-1 text-xs text-white"
  >
    ✏ 編集
  </Link>

  <button
    type="button"
    onClick={() => handleDelete(asana.id)}
    className="rounded bg-red-600 px-3 py-1 text-xs text-white"
  >
    🗑 削除
  </button>
</div>
                            <div className="flex flex-wrap gap-2">
                              {asana.types?.map((type) => (
                                <span
                                  key={type}
                                  className={`rounded-full border px-2 py-1 text-xs ${
                                    TYPE_STYLES[type] ||
                                    TYPE_STYLES['未分類']
                                  }`}
                                >
                                  {type}
                                </span>
                              ))}

                              {asana.chakras?.map((chakra) => (
                                <span
                                  key={chakra}
                                  className={`rounded-full border px-2 py-1 text-xs ${
                                    CHAKRA_STYLES[chakra] ||
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {chakra}
                                </span>
                              ))}
                            </div>

                            <p><strong>誘導：</strong>{asana.howto || '-'}</p>
                            <p><strong>効果効能：</strong>{asana.effect || '-'}</p>
                            <p><strong>注意：</strong>{asana.caution || '-'}</p>
                            <p><strong>バリエーション：</strong>{asana.variation || '-'}</p>
                            <p><strong>筋力：</strong>{asana.strength || '-'}</p>
                            <p><strong>柔軟性：</strong>{asana.flexibility || '-'}</p>
                            <p><strong>軽減法：</strong>{asana.modification || '-'}</p>
                            <p><strong>メモ：</strong>{asana.note || '-'}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
      </div>
    </main>
  )
}