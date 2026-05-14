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

  const [viewMode, setViewMode] = useState('card')

  const [filterOpen, setFilterOpen] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const [printingAsanaId, setPrintingAsanaId] = useState(null)

  useEffect(() => {
    fetchAsanas()
  }, [])

  async function fetchAsanas() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) return
    
    const { data, error } = await supabase
      .from('asanas')
      .select('*')
      .eq('user_id', user.id)
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
    setFavoritesOnly(false)
  }

  const filteredAsanas = asanas.filter((asana) => {
    const keyword = searchText.trim().toLowerCase()
  
    const matchesSearch =
      keyword === '' ||
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
  
      const matchesFavorite =
  !favoritesOnly || asana.favorite

    return matchesSearch && matchesChakra && matchesFavorite
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

const printingAsana = asanas.find((asana) => asana.id === printingAsanaId)

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="mx-auto max-w-4xl">
      <div className="mb-6 rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur">
  <div className="flex items-center justify-between gap-4">
    <div>
      {/* 通常表示 */}
      <div className="screen-only">
        <p className="mb-2 text-sm font-medium text-sky-500">
          Asana List
        </p>

        <h1 className="text-3xl font-bold leading-tight text-gray-800">
          🪷 アーサナ
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-gray-500">
          ポーズ・チャクラ・分類から探せます
        </p>
      </div>

      {/* 印刷表示 */}
      <div className="print-only">
        <p className="mb-2 text-sm font-medium tracking-wide text-gray-400">
          Asana Dictionary by M.glitter
        </p>

        <h1 className="text-3xl font-bold leading-tight text-gray-800">
          🪷 {printingAsana?.title || 'アーサナ'}
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-gray-500">
          {printingAsana?.sanskrit || 'サンスクリット名なし'}
        </p>
      </div>
    </div>

    <Link
      href="/asana-create"
      className="no-print shrink-0 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-center text-sm font-bold leading-tight text-white shadow-sm"
    >
      ＋ 登録
    </Link>
  </div>
</div>

        <section className="no-print mb-6 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="ポーズ名・チャクラ・分類で検索"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />

<div className="mt-4">
  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
    表示モード
  </p>

  <div className="flex gap-2">
    {[
      ['card', '詳細'],
      ['compact', '管理'],
      ['minimal', '検索'],
    ].map(([value, label]) => (
      <button
        key={value}
        type="button"
        onClick={() => setViewMode(value)}
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
          viewMode === value
            ? 'bg-gray-800 text-white'
            : 'border border-gray-200 bg-white text-gray-600'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
</div>

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

          <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
  <button
    type="button"
    onClick={() => setFilterOpen(!filterOpen)}
    className="flex w-full items-center justify-between text-left"
  >
    <span className="text-sm font-bold text-gray-600">
      絞り込み
      {selectedChakras.length > 0 && (
        <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-white">
          {selectedChakras.length}
        </span>
      )}
    </span>

    <span className="text-xs text-gray-400">
      {filterOpen ? '▲' : '▼'}
    </span>
  </button>

  {filterOpen && (
    <div className="mt-3 flex flex-wrap gap-2">
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
      <button
  type="button"
  onClick={() => setFavoritesOnly(!favoritesOnly)}
  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
    favoritesOnly
      ? 'border-yellow-400 bg-yellow-400 text-white'
      : 'border-gray-200 bg-white text-gray-600'
  }`}
>
  ⭐ お気に入り
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
  )}
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
                  className={`no-print flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:scale-[1.01] ${
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

                      if (viewMode === 'minimal') {
                        return (
                          <div
                            key={`${category}-${asana.id}`}
                            onClick={() => setOpenId(isOpen ? null : asana.id)}
                            className={`rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition active:scale-[0.99] ${
                              printingAsanaId && printingAsanaId !== asana.id ? 'print-hide' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleFavorite(asana)
                                    }}
                                    className="no-print shrink-0 text-sm"
                                  >
                                    {asana.favorite ? '⭐' : '☆'}
                                  </button>
                      
                                  <div className="min-w-0 flex-1">
                                    <h3 className="truncate text-sm font-bold text-gray-800">
                                      {asana.title}
                                    </h3>
                      
                                    <p className="truncate text-[11px] text-gray-500">
                                      {asana.sanskrit || 'サンスクリット名なし'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                      
                              <div className="flex shrink-0 items-center gap-1">
                                {asana.chakras?.slice(0, 3).map((chakra) => (
                                  <span
                                    key={chakra}
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      CHAKRA_DOT_COLORS[chakra] || 'bg-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                      
                            {isOpen && (
                              <div className="mt-3 border-t border-gray-100 pt-3">
                                <div className="flex justify-end gap-2">
  <Link
    href={`/asanas/${asana.id}/edit`}
    className="rounded-full border border-yellow-200 bg-white px-2.5 py-1 text-sm text-yellow-600 transition hover:bg-yellow-50"
  >
    ✏️
  </Link>

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      handleDelete(asana.id)
    }}
    className="rounded-full border border-red-100 bg-white px-2.5 py-1 text-sm text-red-500 transition hover:bg-red-50"
  >
    🗑️
  </button>
</div>
                              </div>
                            )}
                          </div>
                        )
                      }

                      if (viewMode === 'compact') {
                        return (
                            <div
                              key={`${category}-${asana.id}`}
                              onClick={() => setOpenId(isOpen ? null : asana.id)}
                              className={`rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition active:scale-[0.99] ${
                                printingAsanaId && printingAsanaId !== asana.id ? 'print-hide' : ''
                              }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleFavorite(asana)
                                    }}
                                    className="mt-0.5 shrink-0 text-base"
                                  >
                                    {asana.favorite ? '⭐' : '☆'}
                                  </button>
                      
                                  <div className="min-w-0 flex-1">
                                    <h3 className="truncate text-sm font-bold text-gray-800">
                                      {asana.title}
                                    </h3>
                      
                                    <p className="truncate text-xs text-gray-500">
                                      {asana.sanskrit || 'サンスクリット名なし'}
                                    </p>
                      
                                    <div className="mt-2 flex flex-wrap items-center gap-1">
                                      {asana.chakras?.map((chakra) => (
                                        <span
                                          key={chakra}
                                          className={`h-2.5 w-2.5 rounded-full ${
                                            CHAKRA_DOT_COLORS[chakra] || 'bg-gray-300'
                                          }`}
                                        />
                                      ))}
                      
                                      {asana.types?.slice(0, 2).map((type) => (
                                        <span
                                          key={type}
                                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
                                        >
                                          {TYPE_LABELS[type]?.ja || type}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                      
                              <div className="flex shrink-0 items-center gap-1">
  <Link
    href={`/asanas/${asana.id}/edit`}
    onClick={(e) => e.stopPropagation()}
    className="rounded-full border border-yellow-200 bg-white px-2.5 py-1 text-sm text-yellow-600 transition hover:bg-yellow-50"
  >
    ✏️
  </Link>

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      handleDelete(asana.id)
    }}
    className="rounded-full border border-red-100 bg-white px-2.5 py-1 text-sm text-red-500 transition hover:bg-red-50"
  >
    🗑️
  </button>

  
</div>
                            </div>
                      
                            {isOpen && (
                              <div className="mt-3 border-t border-gray-100 pt-3">
                                <div className="flex justify-end gap-2">
  <Link
    href={`/asanas/${asana.id}/edit`}
    className="rounded-full border border-yellow-200 bg-white px-2.5 py-1 text-sm text-yellow-600 transition hover:bg-yellow-50"
  >
    ✏️
  </Link>

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      handleDelete(asana.id)
    }}
    className="rounded-full border border-red-100 bg-white px-2.5 py-1 text-sm text-red-500 transition hover:bg-red-50"
  >
    🗑️
  </button>
</div>
                      
                                <div className="mt-3 space-y-2">
                                  <Info label="効果" value={asana.effect} />
                                  <Info label="注意" value={asana.caution} />
                                  <Info label="メモ" value={asana.note} />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <div
                          key={`${category}-${asana.id}`}
                          className={`overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md ${
                            printingAsanaId && printingAsanaId !== asana.id ? 'print-hide' : ''
                          }`}
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
  className="no-print flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left sm:p-4"
>
  <div className="flex min-w-0 flex-1 items-start gap-3">
    
    {asana.image_url ? (
      <img
        src={asana.image_url}
        alt={asana.title}
        className="h-16 w-16 shrink-0 rounded-2xl bg-gray-50 object-contain p-1.5 shadow-sm sm:h-20 sm:w-20 sm:p-2"
      />
    ) : (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-[10px] text-gray-400 sm:h-20 sm:w-20">
        no image
      </div>
    )}

    <div className="min-w-0 flex-1">
      
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(asana)
          }}
          className="mt-0.5 shrink-0 text-lg leading-none transition hover:scale-110 sm:text-xl"
        >
          {asana.favorite ? '⭐' : '☆'}
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug text-gray-800 sm:text-lg">
            {asana.title}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs leading-snug text-gray-500 sm:text-sm">
            {asana.sanskrit || 'サンスクリット名なし'}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
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
      </div>

    </div>
  </div>

  <span className="no-print shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition hover:bg-gray-200 sm:px-3 sm:py-1 sm:text-xs">
    {isOpen ? '閉じる' : '詳細'}
  </span>
</div>
                            

                          {isOpen && (
                            <div className="space-y-4 border-t border-gray-100 bg-gray-50/60 p-4 text-sm text-gray-700">

                              {/* ======================
   PDF用レイアウト
====================== */}

<div className="print-only space-y-6">

{/* 分類・チャクラ */}
<div className="flex flex-wrap items-center gap-2">
  {asana.types?.map((type) => (
    <span
      key={type}
      className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-700"
    >
      {TYPE_LABELS[type]?.ja || type}
    </span>
  ))}

  {asana.chakras?.map((chakra) => (
    <span
      key={chakra}
      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-500"
    >
      {chakra}
    </span>
  ))}
</div>

{/* 別名 */}
{asana.alias && (
  <div>
    <p className="mb-2 text-xs font-bold tracking-wide text-gray-400">
      別名・検索ワード
    </p>

    <div className="flex flex-wrap gap-2">
    {asana.alias.split(',').map((alias) => (
        <span
          key={alias}
          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500"
        >
          #{alias}
        </span>
      ))}
    </div>
  </div>
)}

{/* 2カラム */}
<div className="grid grid-cols-[220px_1fr] gap-8">

  {/* 左 */}
  <div className="space-y-4">

    {asana.image_url && (
      <img
        src={asana.image_url}
        alt={asana.title}
        className="w-full rounded-2xl object-contain"
      />
    )}

    <Info label="誘導" value={asana.howto} />
    <Info label="効果効能" value={asana.effect} />
    <Info label="メモ" value={asana.memo} />

  </div>

  {/* 右 */}
  <div className="space-y-4">

    <Info label="筋力" value={asana.strength} />
    <Info label="柔軟性" value={asana.flexibility} />
    <Info label="軽減法" value={asana.modification} />
    <Info label="注意" value={asana.caution} />
    <Info label="バリエーション" value={asana.variation} />

  </div>

</div>
</div>

   {/* ======================
   通常表示用
====================== */}

<div className="no-print space-y-4">

<div className="flex justify-end gap-2">

  <Link
    href={`/asanas/${asana.id}/edit`}
    className="rounded-full border border-yellow-200 bg-white px-2.5 py-1 text-sm text-yellow-600 transition hover:bg-yellow-50"
  >
    ✏️
  </Link>

  <button
    type="button"
    onClick={() => handleDelete(asana.id)}
    className="rounded-full border border-red-100 bg-white px-2.5 py-1 text-sm text-red-500 transition hover:bg-red-50"
  >
    🗑️
  </button>

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      setPrintingAsanaId(asana.id)

      setTimeout(() => {
        window.print()
        setPrintingAsanaId(null)
      }, 100)
    }}
    className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-sm text-violet-600 transition hover:bg-violet-50"
  >
    📄
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
  <div>
    <p className="mb-2 text-xs font-bold tracking-wide text-gray-400">
      別名・検索ワード
    </p>

    <div className="flex flex-wrap gap-2">
      {asana.alias.split(',').map((alias) => (
        <span
          key={alias.trim()}
          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500"
        >
          #{alias.trim()}
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