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
import { useAuth } from '@/app/components/AuthProvider'

function SortableSequenceItem({
  item,
  removeItem,
  editMemo,
  editSection,
  toggleSection,
  closedSections,
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
        className="rounded-3xl border border-sky-100 bg-sky-50/90 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab rounded-2xl border border-sky-200 bg-white px-3 py-2 text-sm text-gray-400 active:cursor-grabbing"
            >
              ☰
            </button>

            <button
  type="button"
  onClick={() => toggleSection(item.id)}
  className="min-w-0 flex-1 text-left"
>
              <p className="text-xs font-medium text-sky-500">Section</p>
              <h3 className="line-clamp-2 break-words text-base font-bold leading-snug text-sky-800 sm:text-lg">
                {closedSections.includes(item.id) ? '▶' : '▼'} 🌿{' '}
                {item.section_title}
              </h3>
            </button>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => editSection(item)}
              className="rounded-full bg-sky-500 px-3 py-1.5 text-xs font-bold text-white"
            >
              編集
            </button>

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
            >
              削除
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
        className="rounded-3xl border border-yellow-100 bg-yellow-50/90 p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab rounded-2xl border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-400 active:cursor-grabbing"
            >
              ☰
            </button>

            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold text-yellow-600">📝 Memo</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {item.memo}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => editMemo(item)}
              className="rounded-full bg-yellow-500 px-3 py-1.5 text-xs font-bold text-white"
            >
              編集
            </button>

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    )
  }


return (
  <div
    ref={setNodeRef}
    style={style}
    onClick={() => setOpen(!open)}
    className="cursor-pointer rounded-3xl border border-gray-100 bg-white/95 p-4 shadow-sm transition hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 active:cursor-grabbing"
        >
          ☰
        </button>

        {item.asanas?.image_url ? (
          <img
            src={item.asanas.image_url}
            alt={item.asanas.title}
            className="h-20 w-20 shrink-0 rounded-2xl bg-gray-50 object-contain p-2 shadow-sm"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-xs text-gray-400">
            no image
          </div>
        )}

<div className="min-w-0 flex-1">
  <h3 className="line-clamp-2 break-words text-base font-bold leading-snug text-gray-800">
  {item.asanas?.title}
  </h3>

          <p className="mt-1 text-sm text-gray-500">
            {item.asanas?.sanskrit || 'サンスクリット名なし'}
          </p>

          <p className="mt-2 text-xs font-bold text-gray-400">
            {open ? '閉じる' : '詳細'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          removeItem(item.id)
        }}
        className="shrink-0 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
      >
        外す
      </button>
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
                  {type}
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
    `${PLAN_UI[profile?.plan]?.label || 'Free'}プランでは、レッスン構成を ${limits.sequenceItems}件まで追加できます✨`
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
    `${PLAN_UI[profile?.plan]?.label || 'Free'}プランでは、レッスン構成を ${limits.sequenceItems}件まで追加できます✨`
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
          `${PLAN_UI[profile?.plan]?.label || 'Free'}プランでは、レッスン構成を ${limits.sequenceItems}件まで追加できます✨`
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
        <div className="mb-6 rounded-3xl border border-violet-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <Link
            href="/sequences"
            className="text-sm font-medium text-gray-400 transition hover:text-violet-500"
          >
            ← シークエンス一覧へ
          </Link>

          <p className="mt-5 text-sm font-medium text-violet-500">
            Yoga Sequence
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-800">
            🌙 {sequence?.title || 'シークエンス'}
          </h1>

          {sequence?.memo && (
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {sequence.memo}
            </p>
          )}

          <div className="mt-5 rounded-2xl bg-violet-50/80 p-4 text-sm text-gray-500">
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

        <section className="mb-8 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-sky-500">Lesson Flow</p>
              <h2 className="text-2xl font-bold text-gray-800">レッスン構成</h2>
            </div>

            <div className="flex gap-2">
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
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
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
  {filteredAsanas.map((asana) => (
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
      className="shrink-0 text-base leading-none transition hover:scale-110">
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
  ))}
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