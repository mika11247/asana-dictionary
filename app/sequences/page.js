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
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 active:cursor-grabbing"
          >
            ☰
          </button>

          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-violet-400">
              Sequence
            </p>

            <h2 className="truncate text-lg font-bold text-gray-800">
              {sequence.title}
            </h2>

            <p className="mt-1 text-xs text-gray-400">
              作成日：{new Date(sequence.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href={`/sequences/${sequence.id}`}
            className="rounded-full bg-gray-800 px-3 py-1.5 text-center text-xs font-bold text-white"
          >
            開く
          </Link>

          <button
            type="button"
            onClick={() => duplicateSequence(sequence)}
            className="rounded-full bg-sky-500 px-3 py-1.5 text-xs font-bold text-white"
          >
            複製
          </button>

          <button
            type="button"
            onClick={() => deleteSequence(sequence.id)}
            className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white"
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

    const { error } = await supabase.from('sequences').insert({
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

    const { error } = await supabase.from('sequences').delete().eq('id', id)

    if (error) {
      alert(`削除エラー: ${error.message}`)
      return
    }

    fetchSequences()
  }

  async function duplicateSequence(sequence) {
    const newTitle = `${sequence.title} コピー`
    const nextPosition = sequences.length + 1

    const { data: originalItems, error: fetchError } = await supabase
      .from('sequence_items')
      .select('*')
      .eq('sequence_id', sequence.id)
      .order('position', { ascending: true })

    if (fetchError) {
      alert('複製エラー')
      return
    }

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
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/90 p-6 text-center text-gray-500 shadow-sm">
          読み込み中...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl border border-violet-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <p className="mb-2 text-sm font-medium text-violet-500">
            Yoga Sequence
          </p>

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🌙 シークエンス
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                レッスン構成を作成・複製・並び替えできます
              </p>
            </div>

            <button
              type="button"
              onClick={createSequence}
              className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
            >
              ＋ 新規作成
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/70 bg-white/80 p-4 text-sm text-gray-500 shadow-sm backdrop-blur">
          <p>
            現在のシークエンス：{' '}
            <span className="font-bold text-gray-700">{sequences.length}</span>
            件
          </p>
          <p className="mt-1 text-xs text-gray-400">
            ☰ を長押し・ドラッグして並び替えできます
          </p>
        </div>

        {sequences.length === 0 ? (
          <div className="rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-sm backdrop-blur">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-3xl">
              🌙
            </div>

            <p className="font-bold text-gray-700">
              まだシークエンスがありません
            </p>

            <p className="mt-2 text-sm text-gray-500">
              最初のレッスン構成を作ってみよう
            </p>

            <button
              type="button"
              onClick={createSequence}
              className="mt-5 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm"
            >
              ＋ シークエンスを作成
            </button>
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
      </div>
    </main>
  )
}