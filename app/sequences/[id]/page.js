'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'

import { getPlanLimits } from '@/lib/planLimits'
import { PLAN_UI } from '@/lib/planUI'
import { useAuth } from '@/components/AuthProvider'

import {
  TYPE_LABELS,
  CHAKRA_DOT_COLORS,
} from '@/lib/categories'

function SortableSequenceItem({
  item,
  removeItem,
  editMemo,
  editSection,
  toggleSection,
  closedSections,
  viewMode,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const [open, setOpen] = useState(false)

  if (item.type === 'section') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-violet-50 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 border-l-4 border-sky-400 px-3 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="no-print cursor-grab rounded-xl border border-sky-200 bg-white px-2 py-1 text-xs text-gray-400 active:cursor-grabbing"
            >
              ☰
            </button>

            <button
              type="button"
              onClick={() => toggleSection(item.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-400">
                section
              </p>

              <h3 className="mt-0.5 line-clamp-2 break-words text-base font-bold leading-snug text-gray-700">
                {item.section_title}
              </h3>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => toggleSection(item.id)}
              className="no-print rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-sky-500 ring-1 ring-sky-100 transition hover:bg-sky-50"
            >
              {closedSections.includes(item.id) ? '▶' : '▼'}
            </button>

            <button
              type="button"
              onClick={() => editSection(item)}
              className="no-print rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-sky-600 ring-1 ring-sky-100 transition hover:bg-sky-50"
            >
              ✏️
            </button>

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="no-print rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-red-500 ring-1 ring-red-100 transition hover:bg-red-50"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (item.type === 'memo') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-2xl border border-yellow-100 bg-yellow-50/80 px-3 py-3 shadow-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="no-print cursor-grab rounded-xl border border-yellow-200 bg-white px-2 py-1 text-xs text-gray-400 active:cursor-grabbing"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-yellow-500">
                memo
              </p>

              <p className="whitespace-pre-wrap text-sm leading-snug text-gray-700">
                {item.memo}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => editMemo(item)}
              className="no-print rounded-full bg-white px-2 py-1 text-[11px] text-yellow-600 ring-1 ring-yellow-200 transition hover:bg-yellow-50"
            >
              ✏️
            </button>

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="no-print rounded-full bg-white px-2 py-1 text-[11px] text-red-500 ring-1 ring-red-100 transition hover:bg-red-50"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'minimal') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="no-print cursor-grab rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs text-gray-400 active:cursor-grabbing"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-800">
                {item.asanas?.title}
              </p>

              {item.memo && (
                <p className="truncate text-[11px] text-yellow-700">
                  📝 {item.memo}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeItem(item.id)
            }}
            className="no-print rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-500 ring-1 ring-red-100"
          >
            ❌
          </button>
        </div>
      </div>
    )
  }

  if (viewMode === 'compact') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={() => setOpen(!open)}
        className="cursor-pointer rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm transition"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="no-print cursor-grab rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs text-gray-400 active:cursor-grabbing"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-gray-800">
                {item.asanas?.title}
              </h3>

              <p className="truncate text-xs text-gray-500">
                {item.asanas?.sanskrit || 'サンスクリット名なし'}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-1">
                {item.asanas?.types?.slice(0, 2).map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700"
                  >
                    {TYPE_LABELS[type]?.ja || type}
                  </span>
                ))}

                {item.asanas?.chakras?.slice(0, 3).map((chakra) => (
                  <span
                    key={chakra}
                    className={`h-2.5 w-2.5 rounded-full ${
                      CHAKRA_DOT_COLORS[chakra] || 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {item.memo && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-yellow-700">
                  📝 {item.memo}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                editMemo(item)
              }}
              className="no-print rounded-full bg-yellow-50 px-2 py-1 text-[11px] text-yellow-600 ring-1 ring-yellow-100"
            >
              ✏️
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeItem(item.id)
              }}
              className="no-print rounded-full bg-red-50 px-2 py-1 text-[11px] text-red-500 ring-1 ring-red-100"
            >
              ❌
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            {item.asanas?.effect && (
              <div className="mb-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  効果
                </p>

                <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                  {item.asanas.effect}
                </p>
              </div>
            )}

            {item.asanas?.howto && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  誘導
                </p>

                <p className="line-clamp-5 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                  {item.asanas.howto}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => setOpen(!open)}
      className="cursor-pointer rounded-3xl border border-gray-100 bg-white/95 p-3 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="no-print cursor-grab rounded-2xl border border-gray-200 bg-white px-2 py-2 text-sm text-gray-400 active:cursor-grabbing"
          >
            ☰
          </button>

          {item.asanas?.image_url ? (
            <img
              src={item.asanas.image_url}
              alt={item.asanas.title}
              className="h-14 w-14 shrink-0 rounded-2xl bg-gray-50 object-contain p-1.5 shadow-sm"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-[11px] text-gray-400">
              no image
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 break-words text-[15px] font-bold leading-tight text-gray-800">
              {item.asanas?.title}
            </h3>

            <p className="mt-0.5 line-clamp-2 break-words text-xs leading-snug text-gray-500">
              {item.asanas?.sanskrit || 'サンスクリット名なし'}
            </p>

            {item.memo && (
              <div className="mt-1.5 rounded-xl bg-yellow-50 px-2 py-1 text-[11px] leading-snug text-yellow-700 ring-1 ring-yellow-100">
                <p className="line-clamp-2">📝 {item.memo}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              editMemo(item)
            }}
            className="no-print rounded-full bg-yellow-50 px-2 py-1 text-[11px] text-yellow-600 ring-1 ring-yellow-100"
          >
            ✏️
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeItem(item.id)
            }}
            className="no-print rounded-full bg-red-50 px-2 py-1 text-[11px] text-red-500 ring-1 ring-red-100"
          >
            ❌
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 rounded-2xl bg-gray-50 p-4">
          {item.asanas?.image_url && (
            <img
              src={item.asanas.image_url}
              alt={item.asanas.title}
              className="h-64 w-full rounded-3xl bg-white object-contain p-4 shadow-sm"
            />
          )}

          {item.asanas?.types?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                分類
              </p>

              <div className="flex flex-wrap gap-2">
                {item.asanas.types.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700"
                  >
                    {TYPE_LABELS[type]?.ja || type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.asanas?.chakras?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                チャクラ
              </p>

              <div className="flex flex-wrap gap-2">
                {item.asanas.chakras.map((chakra) => (
                  <span
                    key={chakra}
                    className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-700"
                  >
                    {chakra}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.asanas?.alias && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                別名・検索ワード
              </p>

              <div className="flex flex-wrap gap-2">
                {item.asanas.alias.split(',').map((word) => (
                  <span
                    key={word}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                  >
                    #{word.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.asanas?.howto && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                誘導
              </p>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {item.asanas.howto}
              </p>
            </div>
          )}

          {item.asanas?.effect && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                効果
              </p>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {item.asanas.effect}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SequenceDetailPage() {
  const params = useParams()
  const sequenceId = params.id

  const [sequence, setSequence] = useState(null)
  const [items, setItems] = useState([])
  const [asanas, setAsanas] = useState([])
  const [asanaSearchText, setAsanaSearchText] = useState('')
  const [loading, setLoading] = useState(true)

  const [memoModalOpen, setMemoModalOpen] = useState(false)
  const [memoText, setMemoText] = useState('')
  const [editingMemo, setEditingMemo] = useState(null)

  const [closedSections, setClosedSections] = useState([])
  const [openAsanaId, setOpenAsanaId] = useState(null)

  const [viewMode, setViewMode] = useState('card')

  const { profile } = useAuth()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchData()
  }, [sequenceId])

  async function fetchData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }
    
    const { data: sequenceData } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', sequenceId)
      .eq('user_id', user.id)
      .single()

    const { data: itemData } = await supabase
      .from('sequence_items')
      .select(`
        id,
        type,
        memo,
        section_title,
        position,
        asana_id,
        asanas (
  id,
  title,
  alias,
  sanskrit,
  image_url,
  types,
  chakras,
  howto,
  effect
)
      `)
      .eq('sequence_id', sequenceId)
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      
      const { data: asanaData } = await supabase
        .from('asanas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    setSequence(sequenceData)
    setItems(itemData || [])
    setAsanas(asanaData || [])
    setLoading(false)
  }

  async function addAsana(asanaId) {

    const limits = getPlanLimits(profile?.plan)

if (items.length >= limits.sequenceItems) {
  alert(
    `${PLAN_UI[profile?.plan]?.label || 'Free'}では、レッスン構成を ${limits.sequenceItems}件まで追加できます✨`
  )
  return
}

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) return

    const nextPosition = items.length + 1

    const { error } = await supabase.from('sequence_items').insert({
  sequence_id: Number(sequenceId),
  asana_id: asanaId,
  position: nextPosition,
  user_id: user.id,
})

    if (error) {
      alert(`追加エラー: ${error.message}`)
      return
    }

    fetchData()
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
  
    fetchData()
  }

  function addMemo() {
    setEditingMemo(null)
    setMemoText('')
    setMemoModalOpen(true)
  }

  async function addSection() {

    const limits = getPlanLimits(profile?.plan)

if (items.length >= limits.sequenceItems) {
  alert(
    `${PLAN_UI[profile?.plan]?.label || 'Free'}では、レッスン構成を ${limits.sequenceItems}件まで追加できます✨`
  )
  return
}

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) return

    const sectionTitle = prompt('セクション名を入力')
    if (!sectionTitle?.trim()) return

    const nextPosition = items.length + 1

    const { error } = await supabase.from('sequence_items').insert({
      sequence_id: Number(sequenceId),
      type: 'section',
      section_title: sectionTitle,
      position: nextPosition,
      user_id: user.id,
    })

    if (error) {
      alert(`追加エラー: ${error.message}`)
      return
    }

    fetchData()
  }

  function editMemo(item) {
    setEditingMemo(item)
    setMemoText(item.memo || '')
    setMemoModalOpen(true)
  }

  async function editSection(item) {
    const sectionTitle = prompt('セクション名を編集', item.section_title || '')
    if (sectionTitle === null) return
    if (!sectionTitle.trim()) return

    const { error } = await supabase
      .from('sequence_items')
      .update({ section_title: sectionTitle })
      .eq('id', item.id)

    if (error) {
      alert(`編集エラー: ${error.message}`)
      return
    }

    fetchData()
  }

  function toggleSection(sectionId) {
    setClosedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  async function saveMemo() {

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) return

    if (!editingMemo) {
      const limits = getPlanLimits(profile?.plan)
    
      if (items.length >= limits.sequenceItems) {
        alert(
          `${PLAN_UI[profile?.plan]?.label || 'Free'}では、レッスン構成を ${limits.sequenceItems}件まで追加できます✨`
        )
        return
      }
    }

    if (!memoText.trim()) return

    if (editingMemo) {
      const { error } = await supabase
        .from('sequence_items')
        .update({ memo: memoText })
        .eq('id', editingMemo.id)

      if (error) {
        alert(`編集エラー: ${error.message}`)
        return
      }
    } else {
      const nextPosition = items.length + 1

      const { error } = await supabase.from('sequence_items').insert({
        sequence_id: Number(sequenceId),
        type: 'memo',
        memo: memoText,
        position: nextPosition,
        user_id: user.id,
      })

      if (error) {
        alert(`追加エラー: ${error.message}`)
        return
      }
    }

    setMemoModalOpen(false)
    setMemoText('')
    setEditingMemo(null)

    fetchData()
  }

  async function editSequence() {
    const newTitle = prompt('シークエンス名を編集', sequence?.title || '')
    if (newTitle === null) return
    if (!newTitle.trim()) return
  
    const newMemo = prompt('メモを編集', sequence?.memo || '')
    if (newMemo === null) return
  
    const { error } = await supabase
      .from('sequences')
      .update({
        title: newTitle.trim(),
        memo: newMemo.trim(),
      })
      .eq('id', sequenceId)
  
    if (error) {
      alert(`編集エラー: ${error.message}`)
      return
    }
  
    fetchData()
  }
  
  async function deleteSequence() {
    const ok = confirm('このシークエンスを削除しますか？')
    if (!ok) return
  
    const { error } = await supabase
      .from('sequences')
      .delete()
      .eq('id', sequenceId)
  
    if (error) {
      alert(`削除エラー: ${error.message}`)
      return
    }
  
    window.location.href = '/sequences'
  }

  async function removeItem(itemId) {
    const ok = confirm('このアイテムを削除しますか？')
    if (!ok) return

    const { error } = await supabase
      .from('sequence_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      alert(`削除エラー: ${error.message}`)
      return
    }

    fetchData()
  }

  async function handleDragEnd(event) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      position: index + 1,
    }))

    setItems(newItems)

    const updates = newItems.map((item) =>
      supabase
        .from('sequence_items')
        .update({ position: item.position })
        .eq('id', item.id)
    )

    const results = await Promise.all(updates)
    const hasError = results.some((result) => result.error)

    if (hasError) {
      alert('並び替えエラー')
      fetchData()
    }
  }

  const filteredAsanas = asanas
  .filter((asana) => {
    const keyword = asanaSearchText.toLowerCase()

    return (
      asana.title?.toLowerCase().includes(keyword) ||
      asana.sanskrit?.toLowerCase().includes(keyword) ||
      asana.types?.some((type) =>
        type.toLowerCase().includes(keyword)
      ) ||
      asana.chakras?.some((chakra) =>
        chakra.toLowerCase().includes(keyword)
      )
    )
  })
  .sort((a, b) => Number(b.favorite) - Number(a.favorite))

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white/90 p-6 text-center text-gray-500 shadow-sm">
          読み込み中...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="mx-auto max-w-4xl">
      <div className="print-title-card mb-6 rounded-3xl border border-violet-100 bg-white/90 p-6 shadow-sm backdrop-blur">
      <div className="no-print flex items-center justify-between">
  <Link
    href="/sequences"
    className="text-sm font-medium text-gray-400 transition hover:text-violet-500"
  >
    ← シークエンス一覧へ
  </Link>

  <div className="flex items-center gap-2">
  <button
  type="button"
  onClick={editSequence}
  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-50"
>
  ✏️
</button>

<button
  type="button"
  onClick={deleteSequence}
  className="rounded-full border border-red-100 bg-white px-2 py-1 text-sm text-red-500 transition hover:bg-red-50"
>
  🗑️
</button>
  </div>
</div>

          <p className="screen-only mt-5 text-sm font-medium text-violet-500">
  Sequence
</p>

<p className="print-only mt-5 text-sm font-medium tracking-wide text-gray-400">
  Asana Dictionary by M.glitter
</p>

          <h1 className="mt-2 text-3xl font-bold text-gray-800">
            🌙 {sequence?.title || 'シークエンス'}
          </h1>

          {sequence?.memo && (
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {sequence.memo}
            </p>
          )}

<div className="no-print mt-5 rounded-2xl bg-violet-50/80 p-4 text-sm text-gray-500">
            <p>
              レッスン構成：{' '}
              <span className="font-bold text-gray-700">{items.length}</span>
              件
            </p>
            <p className="mt-1 text-xs text-gray-400">
              ☰ を長押し・ドラッグして並び替えできます
            </p>
          </div>
        </div>

        <div className="no-print mb-4">
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

<section className="mb-8 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-sky-500">Lesson Flow</p>
              <h2 className="text-2xl font-bold text-gray-800">レッスン構成</h2>
            </div>

            <div className="no-print flex gap-2">
              <button
                type="button"
                onClick={addMemo}
                className="rounded-full bg-yellow-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
              >
                📝 メモ追加
              </button>

              <button
                type="button"
                onClick={addSection}
                className="rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
              >
                🌿 セクション追加
              </button>
            

          <button
  type="button"
  onClick={() => window.print()}
  className="rounded-full bg-violet-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
>
  📄 PDF出力
</button>

</div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-8 text-center text-gray-500">
              まだアーサナが追加されていません
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {items.map((item, index) => {
                    let currentSectionId = null

                    for (let i = index; i >= 0; i--) {
                      if (items[i].type === 'section') {
                        currentSectionId = items[i].id
                        break
                      }
                    }

                    const isHidden =
                      item.type !== 'section' &&
                      currentSectionId &&
                      closedSections.includes(currentSectionId)

                    if (isHidden) return null

                    return (
                      <SortableSequenceItem
  key={item.id}
  item={item}
  removeItem={removeItem}
  editMemo={editMemo}
  editSection={editSection}
  toggleSection={toggleSection}
  closedSections={closedSections}
  viewMode={viewMode}
/>
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <section className="no-print rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="mb-5">
            <p className="text-sm font-medium text-violet-500">Add Asana</p>
            <h2 className="text-2xl font-bold text-gray-800">アーサナを追加</h2>
          </div>

          <input
  type="text"
  value={asanaSearchText}
  onChange={(e) => setAsanaSearchText(e.target.value)}
  placeholder="ポーズ名・サンスクリット名・分類・チャクラで検索"
  className="mb-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
/>

<p className="mb-3 text-sm text-gray-500">
  {filteredAsanas.length}件のアーサナ
</p>

<div className="space-y-3">
  {filteredAsanas.map((asana) => {

    // =========================
    // minimal
    // =========================

    if (viewMode === 'minimal') {
      return (
        <div
          key={asana.id}
          className="rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">

            <div className="flex min-w-0 flex-1 items-center gap-2">

              <button
                type="button"
                onClick={() => toggleFavorite(asana)}
                className="shrink-0 text-sm"
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

            <button
              type="button"
              onClick={() => addAsana(asana.id)}
              className="shrink-0 rounded-full bg-gray-800 px-3 py-1 text-[11px] font-bold text-white"
            >
              ＋追加
            </button>
          </div>
        </div>
      )
    }

    // =========================
    // compact
    // =========================

    if (viewMode === 'compact') {
      return (
        <div
          key={asana.id}
          onClick={() =>
            setOpenAsanaId(openAsanaId === asana.id ? null : asana.id)
          }
          className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition"
        >
          <div className="flex items-start justify-between gap-3">

            <div className="flex min-w-0 flex-1 items-start gap-3">

              {asana.image_url ? (
                <img
                  src={asana.image_url}
                  alt={asana.title}
                  className="h-12 w-12 shrink-0 rounded-xl bg-gray-50 object-contain p-1 shadow-sm"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[10px] text-gray-400">
                  no
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
                    className="shrink-0 text-sm"
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

                    <div className="mt-1 flex flex-wrap items-center gap-1">
  {asana.types?.slice(0, 2).map((type) => (
    <span
      key={type}
      className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700"
    >
      {TYPE_LABELS[type]?.ja || type}
    </span>
  ))}

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
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                addAsana(asana.id)
              }}
              className="shrink-0 rounded-full bg-gray-800 px-3 py-1 text-[11px] font-bold text-white"
            >
              ＋追加
            </button>
          </div>

          {openAsanaId === asana.id && (
            <div className="mt-3 border-t border-gray-100 pt-3">

              {asana.effect && (
                <div className="mb-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    効果
                  </p>

                  <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                    {asana.effect}
                  </p>
                </div>
              )}

              {asana.howto && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    誘導
                  </p>

                  <p className="line-clamp-5 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                    {asana.howto}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    // =========================
    // card
    // =========================

    return (
      <div
        key={asana.id}
        onClick={() =>
          setOpenAsanaId(openAsanaId === asana.id ? null : asana.id)
        }
        className="cursor-pointer rounded-3xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
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
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(asana)
                    }}
                    className="shrink-0 text-base leading-none transition hover:scale-110"
                  >
                    {asana.favorite ? '⭐' : '☆'}
                  </button>

                  <h3 className="truncate font-bold text-gray-800">
                    {asana.title}
                  </h3>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  {asana.sanskrit || 'サンスクリット名なし'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                addAsana(asana.id)
              }}
              className="shrink-0 rounded-full bg-gray-800 px-3 py-1.5 text-xs font-bold text-white"
            >
              ＋ 追加
            </button>
          </div>

          {openAsanaId === asana.id && (
            <div className="rounded-2xl bg-gray-50 p-4">

              {asana.image_url && (
                <img
                  src={asana.image_url}
                  alt={asana.title}
                  className="mb-4 h-56 w-full rounded-3xl bg-white object-contain p-3 shadow-sm"
                />
              )}

              {asana.types?.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    分類
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {asana.types.map((type) => (
                      <span
                        key={type}
                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {asana.chakras?.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    チャクラ
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {asana.chakras.map((chakra) => (
                      <span
                        key={chakra}
                        className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-700"
                      >
                        {chakra}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {asana.alias && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    別名・検索ワード
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {asana.alias.split(',').map((word) => (
                      <span
                        key={word}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                      >
                        #{word.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {asana.howto && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    誘導
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {asana.howto}
                  </p>
                </div>
              )}

              {asana.effect && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    効果
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {asana.effect}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  })}
</div>

</section>

        {memoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-bold text-gray-800">
                {editingMemo ? 'メモ編集' : 'メモ追加'}
              </h2>

              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                rows={8}
                placeholder="自由にメモを書いてください"
                className="w-full rounded-2xl border border-gray-200 p-4 text-base text-gray-800 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMemoModalOpen(false)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600"
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  onClick={saveMemo}
                  className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2 text-sm font-bold text-white"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
          )}
      </div>
    </main>
  )
}