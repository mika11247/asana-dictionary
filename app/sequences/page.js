'use client'

import { useEffect, useState } from 'react'
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

function SortableSequenceCard({
  sequence,
  deleteSequence,
  duplicateSequence,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sequence.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
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
            <h2 className="text-lg font-bold">{sequence.title}</h2>

            <p className="text-sm text-gray-500">
              {new Date(sequence.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/sequences/${sequence.id}`}
            className="rounded bg-black px-3 py-1 text-xs text-white"
          >
            開く
          </Link>

          <button
  type="button"
  onClick={() => duplicateSequence(sequence)}
  className="rounded bg-sky-600 px-3 py-1 text-xs text-white"
>
  複製
</button>

          <button
            type="button"
            onClick={() => deleteSequence(sequence.id)}
            className="rounded bg-red-600 px-3 py-1 text-xs text-white"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchSequences()
  }, [])

  async function fetchSequences() {
    setLoading(true)

    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setSequences(data || [])
    setLoading(false)
  }

  async function createSequence() {
    if (sequences.length >= 1) {
      alert('無料プランでは1レッスンまでです✨')
      return
    }

    const title = prompt('レッスン名を入力')

    if (!title) return

    const nextPosition = sequences.length + 1

    const { error } = await supabase
      .from('sequences')
      .insert({
        title,
        position: nextPosition,
      })

    if (error) {
      alert(`作成エラー: ${error.message}`)
      return
    }

    fetchSequences()
  }

  async function deleteSequence(id) {
    const ok = confirm('削除しますか？')

    if (!ok) return

    const { error } = await supabase
      .from('sequences')
      .delete()
      .eq('id', id)

    if (error) {
      alert(`削除エラー: ${error.message}`)
      return
    }

    fetchSequences()
  }

  async function duplicateSequence(sequence) {
    const newTitle = `${sequence.title} コピー`
  
    const nextPosition = sequences.length + 1
  
    // 元シークエンス取得
    const { data: originalItems, error: fetchError } = await supabase
      .from('sequence_items')
      .select('*')
      .eq('sequence_id', sequence.id)
      .order('position', { ascending: true })
  
    if (fetchError) {
      alert('複製エラー')
      return
    }
  
    // 新シークエンス作成
    const { data: newSequence, error: createError } = await supabase
      .from('sequences')
      .insert({
        title: newTitle,
        position: nextPosition,
      })
      .select()
      .single()
  
    if (createError || !newSequence) {
      alert('複製エラー')
      return
    }
  
    // itemsコピー
    if (originalItems?.length > 0) {
      const duplicatedItems = originalItems.map((item) => ({
        sequence_id: newSequence.id,
        asana_id: item.asana_id,
        type: item.type,
        memo: item.memo,
        position: item.position,
      }))
  
      const { error: itemError } = await supabase
        .from('sequence_items')
        .insert(duplicatedItems)
  
      if (itemError) {
        alert('アイテム複製エラー')
        return
      }
    }
  
    fetchSequences()
  }

  async function handleDragEnd(event) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = sequences.findIndex((item) => item.id === active.id)
    const newIndex = sequences.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newSequences = arrayMove(sequences, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        position: index + 1,
      })
    )

    setSequences(newSequences)

    const updates = newSequences.map((item) =>
      supabase
        .from('sequences')
        .update({ position: item.position })
        .eq('id', item.id)
    )

    const results = await Promise.all(updates)

    const hasError = results.some((result) => result.error)

    if (hasError) {
      alert('並び替えエラー')
      fetchSequences()
    }
  }

  if (loading) {
    return <main className="p-6">読み込み中...</main>
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">シークエンス</h1>

        <button
          type="button"
          onClick={createSequence}
          className="rounded-xl bg-black px-4 py-2 text-white"
        >
          ＋ 新規作成
        </button>
      </div>

      {sequences.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center text-gray-500">
          まだシークエンスがありません
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sequences.map((sequence) => sequence.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {sequences.map((sequence) => (
                <SortableSequenceCard
                key={sequence.id}
                sequence={sequence}
                deleteSequence={deleteSequence}
                duplicateSequence={duplicateSequence}
              />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </main>
  )
}