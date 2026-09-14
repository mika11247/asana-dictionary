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


/* =====================================================
   ログインユーザー用カード
===================================================== */

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


/* =====================================================
   PAGE
===================================================== */

export default function SequencesPage() {
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)

  const [demoSequence, setDemoSequence] = useState(null)
  const [demoItems, setDemoItems] = useState([])
  const [demoOpen, setDemoOpen] = useState(false)

  const { user, profile } = useAuth()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )


  /* =====================================================
     初期読み込み
  ===================================================== */

  useEffect(() => {
    if (user) {
      fetchSequences()
    } else {
      fetchDemoSequence()
    }
  }, [user])


  /* =====================================================
     ログインユーザーのシークエンス取得
  ===================================================== */

  async function fetchSequences() {
    setLoading(true)

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


  /* =====================================================
     ゲスト用 太陽礼拝A
  ===================================================== */

  async function fetchDemoSequence() {
    setLoading(true)

    try {
      const { data: sequence, error: sequenceError } = await supabase
        .from('initial_sequences')
        .select('*')
        .eq('preset_key', 'surya_namaskar_a')
        .maybeSingle()

      if (sequenceError) throw sequenceError

      if (!sequence) {
        setDemoSequence(null)
        setDemoItems([])
        return
      }

      const { data: items, error: itemsError } = await supabase
        .from('initial_sequence_items')
        .select('*')
        .eq('initial_sequence_id', sequence.id)
        .order('position', { ascending: true })

      if (itemsError) throw itemsError

      const { data: initialAsanas, error: asanasError } = await supabase
        .from('initial_asanas')
        .select('*')

      if (asanasError) throw asanasError

      const asanaByPresetKey = new Map(
        (initialAsanas || [])
          .filter((asana) => asana.preset_key)
          .map((asana) => [asana.preset_key, asana])
      )

      const mergedItems = (items || []).map((item) => {
        if (item.type !== 'asana') return item

        const asana = item.preset_key
          ? asanaByPresetKey.get(item.preset_key)
          : null

        return {
          ...item,
          asana,
          asana_title: asana?.title || item.asana_title || '',
          asana_sanskrit: asana?.sanskrit || item.asana_sanskrit || '',
          image_url: asana?.image_url || null,
        }
      })

      setDemoSequence({
        ...sequence,
        id: 'guest-surya-namaskar-a',
        created_at: sequence.created_at || new Date().toISOString(),
        position: 1,
      })

      setDemoItems(mergedItems)
    } catch (error) {
      console.error('ゲストシークエンス取得エラー:', error)
      setDemoSequence(null)
      setDemoItems([])
    } finally {
      setLoading(false)
    }
  }


  /* =====================================================
     ゲスト登録案内
  ===================================================== */

  function requireLogin() {
    const ok = window.confirm(
      '🔒 この機能は無料登録後に利用できます✨\n\n無料登録すると、自分のシークエンスを作成・編集・保存できます。\n\n無料登録しますか？'
    )

    if (ok) {
      window.location.href = '/login?mode=signup'
    }
  }


  /* =====================================================
     作成
  ===================================================== */

  async function createSequence() {
    if (!user) {
      requireLogin()
      return
    }

    const limits = getPlanLimits(profile?.plan)

    if (sequences.length >= limits.sequences) {
      alert(
        `${PLAN_UI[profile?.plan]?.label || 'Free'}では ${limits.sequences}件まで作成できます✨`
      )
      return
    }

    const title = prompt('レッスン名を入力')
    if (!title) return

    const memo = prompt('メモを入力（空でもOK）') || ''

    const nextPosition = sequences.length + 1

    const { error } = await supabase
      .from('sequences')
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


  /* =====================================================
     削除
  ===================================================== */

  async function deleteSequence(id) {
    if (!user) {
      requireLogin()
      return
    }

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


  /* =====================================================
     編集
  ===================================================== */

  async function editSequence(sequence) {
    if (!user) {
      requireLogin()
      return
    }

    const newTitle = prompt(
      'シークエンス名を編集',
      sequence.title
    )

    if (!newTitle) return

    const newMemo =
      prompt(
        'メモを編集',
        sequence.memo || ''
      ) ?? sequence.memo

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


  /* =====================================================
     複製
  ===================================================== */

  async function duplicateSequence(sequence) {
    if (!user) {
      requireLogin()
      return
    }

    const limits = getPlanLimits(profile?.plan)

    const { count, error: countError } = await supabase
      .from('sequences')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', user.id)

    if (countError) {
      alert('シークエンス数の確認に失敗しました')
      return
    }

    if (
      limits.sequences !== null &&
      count >= limits.sequences
    ) {
      alert(
        `${PLAN_UI[profile?.plan]?.label || 'Free'}ではシークエンスを ${limits.sequences}件まで作成できます✨`
      )
      return
    }

    const newTitle = `${sequence.title} コピー`
    const nextPosition = sequences.length + 1

    const {
      data: originalItems,
      error: fetchError,
    } = await supabase
      .from('sequence_items')
      .select('*')
      .eq('sequence_id', sequence.id)
      .order('position', { ascending: true })

    if (fetchError) {
      alert('複製エラー')
      return
    }

    const {
      data: newSequence,
      error: createError,
    } = await supabase
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
      const duplicatedItems = originalItems.map(
        (item) => ({
          sequence_id: newSequence.id,
          asana_id: item.asana_id,
          type: item.type,
          memo: item.memo,
          position: item.position,
          user_id: user.id,
        })
      )

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


  /* =====================================================
     並び替え
  ===================================================== */

  async function handleDragEnd(event) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = sequences.findIndex(
      (item) => item.id === active.id
    )

    const newIndex = sequences.findIndex(
      (item) => item.id === over.id
    )

    if (oldIndex === -1 || newIndex === -1) return

    const newSequences = arrayMove(
      sequences,
      oldIndex,
      newIndex
    ).map((item, index) => ({
      ...item,
      position: index + 1,
    }))

    setSequences(newSequences)

    const updates = newSequences.map((item) =>
      supabase
        .from('sequences')
        .update({
          position: item.position,
        })
        .eq('id', item.id)
    )

    const results = await Promise.all(updates)

    const hasError = results.some(
      (result) => result.error
    )

    if (hasError) {
      alert('並び替えエラー')
      fetchSequences()
    }
  }


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/90 p-6 text-center text-gray-500 shadow-sm">
          読み込み中...
        </div>
      </main>
    )
  }


  /* =====================================================
     GUEST
  ===================================================== */

  if (!user) {
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

                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  レッスン構成を作成・複製・並び替えできます
                </p>

                <button
                  type="button"
                  onClick={createSequence}
                  className="mt-4 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
                >
                  ＋ 作成 🔒
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-3xl border border-violet-100 bg-gradient-to-r from-sky-50 to-violet-50 p-4 shadow-sm">
            <p className="font-bold text-violet-700">
              👀 ゲスト体験中
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              新規登録後に入る初期シークエンスを体験しています。
              閲覧はできますが、作成・編集・複製・削除・並び替えには無料登録が必要です。
            </p>
          </div>

          <div className="mb-6 rounded-3xl border border-white/70 bg-white/80 p-4 text-sm text-gray-500 shadow-sm backdrop-blur">
            <p>
              現在のシークエンス：{' '}
              <span className="font-bold text-gray-700">
                {demoSequence ? 1 : 0}
              </span>
              件
            </p>

            <p className="mt-1 text-xs text-gray-400">
              🔒 無料登録後は、☰ を長押し・ドラッグして並び替えできます
            </p>
          </div>

          {demoSequence ? (
            <div className="space-y-4">
              <div className="block rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">

                    <button
                      type="button"
                      onClick={requireLogin}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
                    >
                      ☰
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs font-medium text-violet-400">
                        Sequence
                      </p>

                      <button
                        type="button"
                        onClick={() => setDemoOpen(!demoOpen)}
                        className="block w-full text-left"
                      >
                        <h2 className="line-clamp-2 break-words text-lg font-bold leading-snug text-gray-800">
                          {demoSequence.title}
                        </h2>

                        {demoSequence.memo && (
                          <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-500">
                            {demoSequence.memo}
                          </p>
                        )}
                      </button>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-gray-400">
                          初期シークエンス / {demoItems.filter((item) => item.type === 'asana').length}ポーズ
                        </p>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={requireLogin}
                            className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 transition hover:bg-gray-50"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={requireLogin}
                            className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 transition hover:bg-gray-50"
                          >
                            📄
                          </button>

                          <button
                            type="button"
                            onClick={requireLogin}
                            className="rounded-full bg-white px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-gray-200 transition hover:bg-red-50"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDemoOpen(!demoOpen)}
                        className="mt-4 w-full rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-600 transition hover:bg-violet-100"
                      >
                        {demoOpen ? '閉じる ▲' : '詳細を見る ▼'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {demoOpen && (
                <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-violet-400">
                        Sequence Detail
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-gray-800">
                        ☀️ {demoSequence.title}
                      </h2>
                    </div>

                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
                      初期登録
                    </span>
                  </div>

                  <div className="space-y-2">
                    {demoItems.map((item, index) => (
                      <div
                        key={item.id || `${item.type}-${index}`}
                        className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-400 shadow-sm">
                          {index + 1}
                        </div>

                        {item.type === 'asana' && item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.asana_title}
                            className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm"
                          />
                        ) : null}

                        <div className="min-w-0 flex-1">
                          {item.type === 'asana' && (
                            <>
                              <p className="text-sm font-bold text-gray-700">
                                {item.asana_title}
                              </p>

                              {item.asana_sanskrit && (
                                <p className="mt-0.5 text-xs text-gray-400">
                                  {item.asana_sanskrit}
                                </p>
                              )}

                              {item.memo && (
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                  {item.memo}
                                </p>
                              )}
                            </>
                          )}

                          {item.type === 'section' && (
                            <p className="text-sm font-bold text-violet-600">
                              {item.section_title}
                            </p>
                          )}

                          {item.type === 'memo' && (
                            <p className="text-sm leading-relaxed text-gray-600">
                              {item.memo}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl bg-violet-50 p-4">
                    <p className="text-xs leading-6 text-gray-600">
                      🔒 無料登録すると、このシークエンスを編集・複製したり、
                      登録済みのアーサナを使って自分のシークエンスを作れます。
                    </p>

                    <button
                      type="button"
                      onClick={requireLogin}
                      className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-violet-600 shadow-sm ring-1 ring-violet-100"
                    >
                      無料で使ってみる
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-sm backdrop-blur">
              <p className="font-bold text-gray-700">
                初期シークエンスを読み込めませんでした
              </p>
            </div>
          )}

        </div>
      </main>
    )
  }


  /* =====================================================
     LOGGED IN
  ===================================================== */

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

              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                レッスン構成を作成・複製・並び替えできます
              </p>

              <button
                type="button"
                onClick={createSequence}
                className="mt-4 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
              >
                ＋ 作成
              </button>

            </div>
          </div>
        </div>


        <div className="mb-6 rounded-3xl border border-white/70 bg-white/80 p-4 text-sm text-gray-500 shadow-sm backdrop-blur">

          <p>
            現在のシークエンス：{' '}
            <span className="font-bold text-gray-700">
              {sequences.length}
            </span>
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
              items={sequences.map(
                (sequence) => sequence.id
              )}
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