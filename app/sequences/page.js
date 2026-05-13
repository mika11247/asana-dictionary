'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

import { getPlanLimits } from '@/lib/planLimits'
import { useAuth } from '@/components/AuthProvider'

import { PLAN_UI } from '@/lib/planUI'

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
  editSequence,
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
    <Link
      href={`/sequences/${sequence.id}`}
      ref={setNodeRef}
      style={style}
      className="block rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.preventDefault()}
            className="cursor-grab rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 active:cursor-grabbing"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-violet-400">
              Sequence
            </p>

            <h2 className="line-clamp-2 break-words text-lg font-bold leading-snug text-gray-800">
              {sequence.title}
            </h2>

            {sequence.memo && (
              <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-500">
                {sequence.memo}
              </p>
            )}

<div className="mt-3 flex items-center justify-between gap-3">
  <p className="text-xs text-gray-400">
    最終更新：
    {new Date(sequence.created_at).toLocaleDateString()}
  </p>

  <div className="flex shrink-0 items-center gap-1">
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        editSequence(sequence)
      }}
      className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 transition hover:bg-gray-50"
    >
      ✏️
    </button>

    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        duplicateSequence(sequence)
      }}
      className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 transition hover:bg-gray-50"
    >
      📄
    </button>

    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        deleteSequence(sequence.id)
      }}
      className="rounded-full bg-white px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-gray-200 transition hover:bg-red-50"
    >
      🗑
    </button>
  </div>
</div>
          </div>
        </div>

      </div>
    </Link>
  )
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)

  const { profile } = useAuth()

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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }
    
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('user_id', user.id)
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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) return

    const limits = getPlanLimits(profile?.plan)

if (sequences.length >= limits.sequences) {
  alert(
    `${PLAN_UI[profile?.plan]?.label || 'Free'}プランでは ${limits.sequences}件まで作成できます✨`
  )
  return
}

    const title = prompt('レッスン名を入力')
    if (!title) return

    const memo = prompt('メモを入力（空でもOK）') || ''

    const nextPosition = sequences.length + 1

    const { error } = await supabase.from('sequences')
    .insert({
      title,
      memo,
      position: nextPosition,
      user_id: user.id,
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

  async function editSequence(sequence) {
    const newTitle = prompt('シークエンス名を編集', sequence.title)
  
    if (!newTitle) return
  
    const newMemo =
      prompt('メモを編集', sequence.memo || '') ?? sequence.memo
  
    const { error } = await supabase
      .from('sequences')
      .update({
        title: newTitle,
        memo: newMemo,
      })
      .eq('id', sequence.id)
  
    if (error) {
      alert(`更新エラー: ${error.message}`)
      return
    }
  
    fetchSequences()
  }

  async function duplicateSequence(sequence) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
  
    if (!user) return
  
    const limits = getPlanLimits(profile?.plan)
  
    const { count, error: countError } = await supabase
      .from('sequences')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
  
    if (countError) {
      alert('シークエンス数の確認に失敗しました')
      return
    }
  
    if (limits.sequences !== null && count >= limits.sequences) {
      alert(
        `${PLAN_UI[profile?.plan]?.label || 'Free'}プランではシークエンスを ${limits.sequences}件まで作成できます✨`
      )
      return
    }
  
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
    memo: sequence.memo,
    position: nextPosition,
    user_id: user.id,
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
        user_id: user.id,
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
            Sequence
          </p>

          <div className="flex items-start justify-between gap-3">
            <div>
            <h1 className="text-3xl font-bold leading-tight text-gray-800">
                🌙 シークエンス
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                レッスン構成を作成・複製・並び替えできます
              </p>
            </div>

            <div className="flex flex-col justify-end">
  <button
    type="button"
    onClick={createSequence}
    className="shrink-0 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
  >
    ＋ 作成
  </button>
</div>
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
                  editSequence={editSequence}
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