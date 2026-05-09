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

function SortableSequenceItem({
  item,
  index,
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
    opacity: isDragging ? 0.5 : 1,
  }

  if (item.type === 'section') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab rounded border border-sky-300 bg-white px-2 py-1 text-sm text-gray-500 active:cursor-grabbing"
            >
              ☰
            </button>

            <button
  type="button"
  onClick={() => toggleSection(item.id)}
  className="text-left text-lg font-bold text-sky-800"
>
  {closedSections.includes(item.id) ? '▶' : '▼'} 🌿 {item.section_title}
</button>

          </div>

          <button
  type="button"
  onClick={() => editSection(item)}
  className="rounded bg-sky-600 px-3 py-1 text-xs text-white"
>
  編集
</button>

          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="rounded bg-red-600 px-3 py-1 text-xs text-white"
          >
            削除
          </button>
        </div>
      </div>
    )
  }

  if (item.type === 'memo') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab rounded border border-yellow-300 bg-white px-2 py-1 text-sm text-gray-500 active:cursor-grabbing"
          >
            ☰
          </button>

          <div>
            <p className="text-sm font-bold text-yellow-700">📝 メモ</p>
            <p className="whitespace-pre-wrap text-gray-700">{item.memo}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => editMemo(item)}
            className="rounded bg-yellow-600 px-3 py-1 text-xs text-white"
          >
            編集
          </button>

          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="rounded bg-red-600 px-3 py-1 text-xs text-white"
          >
            削除
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab rounded border px-2 py-1 text-sm text-gray-500 active:cursor-grabbing"
        >
          ☰
        </button>

        <div>
          <p className="text-sm text-gray-400">{index + 1}</p>

          <h3 className="font-bold">{item.asanas?.title}</h3>

          <p className="text-sm text-gray-500">
            {item.asanas?.sanskrit || 'サンスクリット名なし'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => removeItem(item.id)}
        className="rounded bg-red-600 px-3 py-1 text-xs text-white"
      >
        外す
      </button>
    </div>
  )
}
  

export default function SequenceDetailPage() {
  const params = useParams()
  const sequenceId = params.id

  const [sequence, setSequence] = useState(null)
  const [items, setItems] = useState([])
  const [asanas, setAsanas] = useState([])
  const [loading, setLoading] = useState(true)

  const [memoModalOpen, setMemoModalOpen] = useState(false)
const [memoText, setMemoText] = useState('')
const [editingMemo, setEditingMemo] = useState(null)

const [closedSections, setClosedSections] = useState([])

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

    const { data: sequenceData } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', sequenceId)
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
          sanskrit,
          types,
          chakras
        )
      `)
      .eq('sequence_id', sequenceId)
      .order('position', { ascending: true })

    const { data: asanaData } = await supabase
      .from('asanas')
      .select('*')
      .order('created_at', { ascending: false })

    setSequence(sequenceData)
    setItems(itemData || [])
    setAsanas(asanaData || [])
    setLoading(false)
  }

  async function addAsana(asanaId) {
    const nextPosition = items.length + 1

    const { error } = await supabase
      .from('sequence_items')
      .insert({
        sequence_id: Number(sequenceId),
        asana_id: asanaId,
        position: nextPosition,
      })

    if (error) {
      alert(`追加エラー: ${error.message}`)
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
    const sectionTitle = prompt('セクション名を入力')
  
    if (!sectionTitle?.trim()) return
  
    const nextPosition = items.length + 1
  
    const { error } = await supabase
      .from('sequence_items')
      .insert({
        sequence_id: Number(sequenceId),
        type: 'section',
        section_title: sectionTitle,
        position: nextPosition,
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
    const sectionTitle = prompt(
      'セクション名を編集',
      item.section_title || ''
    )
  
    if (sectionTitle === null) return
    if (!sectionTitle.trim()) return
  
    const { error } = await supabase
      .from('sequence_items')
      .update({
        section_title: sectionTitle,
      })
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
    if (!memoText.trim()) return
  
    if (editingMemo) {
      const { error } = await supabase
        .from('sequence_items')
        .update({
          memo: memoText,
        })
        .eq('id', editingMemo.id)
  
      if (error) {
        alert(`編集エラー: ${error.message}`)
        return
      }
    } else {
      const nextPosition = items.length + 1
  
      const { error } = await supabase
        .from('sequence_items')
        .insert({
          sequence_id: Number(sequenceId),
          type: 'memo',
          memo: memoText,
          position: nextPosition,
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
    const ok = confirm('このアーサナをシークエンスから外しますか？')
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

  if (loading) {
    return <main className="p-6">読み込み中...</main>
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link href="/sequences" className="text-sm text-gray-500">
          ← シークエンス一覧へ
        </Link>

        <h1 className="mt-3 text-2xl font-bold">
          {sequence?.title || 'シークエンス'}
        </h1>

        {sequence?.memo && (
          <p className="mt-2 text-gray-600">{sequence.memo}</p>
        )}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">レッスン構成</h2>

        <div className="mb-4 flex gap-2">
  <button
    type="button"
    onClick={addMemo}
    className="rounded-xl bg-yellow-500 px-4 py-2 text-sm text-white"
  >
    📝 メモ追加
  </button>

  <button
  type="button"
  onClick={addSection}
  className="rounded-xl bg-sky-600 px-4 py-2 text-sm text-white"
>
  🌿 セクション追加
</button>

</div>

        {items.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-500">
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
      index={index}
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

      <section>
        <h2 className="mb-3 text-xl font-bold">アーサナを追加</h2>

        <div className="space-y-3">
          {asanas.map((asana) => (
            <div
              key={asana.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
            >
              <div>
                <h3 className="font-bold">{asana.title}</h3>
                <p className="text-sm text-gray-500">
                  {asana.sanskrit || 'サンスクリット名なし'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => addAsana(asana.id)}
                className="rounded bg-black px-3 py-1 text-xs text-white"
              >
                ＋ 追加
              </button>
            </div>
          ))}
        </div>
      </section>

      {memoModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
      <h2 className="mb-4 text-xl font-bold">
        {editingMemo ? 'メモ編集' : 'メモ追加'}
      </h2>

      <textarea
        value={memoText}
        onChange={(e) => setMemoText(e.target.value)}
        rows={8}
        placeholder="自由にメモを書いてください"
        className="w-full rounded-xl border p-3 text-base text-gray-800"
      />

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setMemoModalOpen(false)}
          className="rounded-xl border px-4 py-2"
        >
          キャンセル
        </button>

        <button
          type="button"
          onClick={saveMemo}
          className="rounded-xl bg-black px-4 py-2 text-white"
        >
          保存
        </button>
      </div>
    </div>
  </div>
)}

    </main>
  )
}