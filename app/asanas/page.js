'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

import {
  ASANA_TYPES,
  TYPE_LABELS,
  TYPE_STYLES,
  CHAKRA_STYLES,
  CHAKRAS,
  CHAKRA_DOT_COLORS,
  CHAKRA_LABELS,
} from '@/lib/categories'

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

    const { error } = await supabase.from('asanas').delete().eq('id', id)

    if (error) {
      alert(`削除エラー: ${error.message}`)
      return
    }

    alert('削除しました')
    fetchAsanas()
  }

  async function toggleFavorite(asana) {
    const { error } = await supabase
      .from('asanas')
      .update({
        favorite: !asana.favorite,
      })
      .eq('id', asana.id)
  
    if (error) {
      alert('お気に入り更新エラー')
      return
    }
  
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
      asana.alias?.toLowerCase().includes(keyword) ||
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
      if (!groups[type]) groups[type] = []
      groups[type].push(asana)
    })

    return groups
  }, {})

  const categoryOrder = [...ASANA_TYPES, '未分類']

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <p className="mb-2 text-sm font-medium text-sky-500">
            Asana Dictionary
          </p>

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🪷 アーサナ一覧
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                ポーズ・チャクラ・分類から探せます
              </p>
            </div>

            <Link
              href="/asana-create"
              className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
            >
              ＋ 登録
            </Link>
          </div>
        </div>

        <section className="mb-6 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="ポーズ名・チャクラ・分類で検索"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {filteredAsanas.length}件のアーサナ
            </p>

            {selectedChakras.length > 0 && (
              <button
                type="button"
                onClick={clearChakraFilter}
                className="text-xs font-medium text-gray-400 underline"
              >
                フィルター解除
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearChakraFilter}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                selectedChakras.length === 0
                  ? 'border-gray-800 bg-gray-800 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
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
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    isSelected
                      ? CHAKRA_STYLES[chakra]
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {CHAKRA_LABELS[chakra] || chakra}
                </button>
              )
            })}
          </div>
        </section>

        <div className="space-y-6">
          {categoryOrder
            .filter((category) => groupedAsanas[category])
            .map((category) => (
              <section
                key={category}
                className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenCategories((prev) => ({
                      ...prev,
                      [category]: !prev[category],
                    }))
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:scale-[1.01] ${
                    TYPE_STYLES[category] || TYPE_STYLES['未分類']
                  }`}
                >
                  <span>
                    <span className="block text-lg font-bold">
                      {TYPE_LABELS[category]?.ja || category}
                    </span>
                    <span className="block text-xs font-normal opacity-70">
                      {TYPE_LABELS[category]?.en || category} /{' '}
                      {groupedAsanas[category].length}件
                    </span>
                  </span>

                  <span className="text-lg text-gray-400">
  {openCategories[category] ? '▼' : '▶'}
</span>
                </button>

                {openCategories[category] && (
                  <div className="mt-4 space-y-3">
                    {groupedAsanas[category].map((asana) => {
                      const isOpen = openId === asana.id

                      return (
                        <div
                          key={`${category}-${asana.id}`}
                          className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                        >
                          <div
  role="button"
  tabIndex={0}
  onClick={() => setOpenId(isOpen ? null : asana.id)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setOpenId(isOpen ? null : asana.id)
    }
  }}
  className="flex w-full cursor-pointer items-center justify-between gap-4 p-4 text-left"
>
  <div className="flex min-w-0 flex-1 items-start gap-4">
                            
                            
  {asana.image_url ? (
    <img
      src={asana.image_url}
      alt={asana.title}
      className="h-20 w-20 shrink-0 rounded-2xl bg-gray-50 object-contain p-2 shadow-sm"
    />
  ) : (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-xs text-gray-400">
      no image
    </div>
  )}

  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          toggleFavorite(asana)
        }}
        className="text-lg transition hover:scale-110"
      >
        {asana.favorite ? '⭐' : '☆'}
      </button>

      <h3 className="truncate text-lg font-bold text-gray-800">
        {asana.title}
      </h3>

      <div className="flex shrink-0 gap-1">
        {asana.chakras?.map((chakra) => (
          <span
            key={chakra}
            className={`h-2.5 w-2.5 rounded-full border border-white shadow-sm ${
              CHAKRA_DOT_COLORS[chakra] || 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>

    <p className="mt-1 text-sm text-gray-500">
      {asana.sanskrit || 'サンスクリット名なし'}
    </p>
  </div>
</div>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-200">
  {isOpen ? '閉じる' : '詳細'}
</span>
</div>
                            

                          {isOpen && (
                            <div className="space-y-4 border-t border-gray-100 bg-gray-50/60 p-4 text-sm text-gray-700">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/asanas/${asana.id}/edit`}
                                  className="rounded-full bg-gray-800 px-3 py-1.5 text-xs font-bold text-white"
                                >
                                  ✏ 編集
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(asana.id)}
                                  className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
                                >
                                  🗑 削除
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {asana.types?.map((type) => (
                                  <span
                                    key={type}
                                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                                      TYPE_STYLES[type] ||
                                      TYPE_STYLES['未分類']
                                    }`}
                                  >
                                    {TYPE_LABELS[type]?.ja || type}
                                  </span>
                                ))}

                                {asana.chakras?.map((chakra) => (
                                  <span
                                    key={chakra}
                                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                                      CHAKRA_STYLES[chakra] ||
                                      'border-gray-200 bg-gray-50 text-gray-700'
                                    }`}
                                  >
                                    {CHAKRA_LABELS[chakra] || chakra}
                                  </span>
                                ))}
                              </div>

                              {asana.alias && (
  <div className="mb-4">
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
      別名・検索ワード
    </p>

    <div className="flex flex-wrap gap-2">
      {asana.alias.split(',').map((word) => (
        <span
          key={word}
          className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs text-gray-700"
        >
          #{word.trim()}
        </span>
      ))}
    </div>
  </div>
)}

{asana.image_url && (
  <img
    src={asana.image_url}
    alt={asana.title}
    className="h-56 w-full rounded-3xl bg-gray-50 object-contain p-3 shadow-sm"
  />
)}

                              <div className="space-y-3">
                                <Info label="誘導" value={asana.howto} />
                                <Info label="効果効能" value={asana.effect} />
                                <Info label="注意" value={asana.caution} />
                                <Info label="バリエーション" value={asana.variation} />
                                <Info label="筋力" value={asana.strength} />
                                <Info label="柔軟性" value={asana.flexibility} />
                                <Info label="軽減法" value={asana.modification} />
                                <Info label="メモ" value={asana.note} />
                              </div>
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
      </div>
    </main>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="mb-1 text-xs font-bold text-gray-400">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
        {value || '-'}
      </p>
    </div>
  )
}