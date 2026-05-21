'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import { getPlanLimits } from '@/lib/planLimits'

const PLAN_RANK = {
  free: 1,
  special: 2,
  pro: 3,
}

export default function PresetsPage() {
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [presets, setPresets] = useState([])
  const [addingKey, setAddingKey] = useState(null)

  useEffect(() => {
    fetchPresets()
  }, [])

  async function fetchPresets() {
    const { data, error } = await supabase
      .from('initial_sequences')
      .select('*')
      .order('position', { ascending: true })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setPresets(data || [])
    setLoading(false)
  }

  function canUsePreset(preset) {
    const userRank = PLAN_RANK[profile?.plan || 'free'] || PLAN_RANK.free
    const requiredRank =
      PLAN_RANK[preset.plan_required || 'free'] || PLAN_RANK.free

    return userRank >= requiredRank
  }

  async function getPresetItems(presetId) {
    const { data, error } = await supabase
      .from('initial_sequence_items')
      .select('*')
      .eq('initial_sequence_id', presetId)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  }

  async function addAsanasOnly(preset) {
    if (!user || !profile) return

    if (!canUsePreset(preset)) {
      alert('このテンプレートは現在、一部プラン向けに調整中です🌙')
      return
    }

    setAddingKey(`${preset.id}-asanas`)

    try {
      const result = await addMissingAsanas(preset)

      if (result.addedCount === 0) {
        alert('追加できる新しいアーサナはありません✨')
        return
      }

      alert(
        `${result.addedCount}件のアーサナを追加しました✨\n${result.skippedCount}件は登録済みのためスキップしました🌙`
      )
    } catch (error) {
      console.error(error)
      alert('アーサナ追加に失敗しました💦')
    } finally {
      setAddingKey(null)
    }
  }

  async function addAsanasAndSequence(preset) {
    if (!user || !profile) return

    if (!canUsePreset(preset)) {
      alert('このテンプレートは現在、一部プラン向けに調整中です🌙')
      return
    }

    setAddingKey(`${preset.id}-sequence`)

    try {
      const sequencePresetKey = preset.preset_key || preset.id

      const { data: existingSequence, error: sequenceCheckError } =
        await supabase
          .from('sequences')
          .select('id')
          .eq('user_id', user.id)
          .eq('preset_key', sequencePresetKey)
          .maybeSingle()

      if (sequenceCheckError) throw sequenceCheckError

      if (existingSequence) {
        alert('このシークエンスはすでに追加済みです🌙')
        return
      }

      const limits = getPlanLimits(profile.plan)

      const { data: currentSequences, error: countSequenceError } =
        await supabase.from('sequences').select('id').eq('user_id', user.id)

      if (countSequenceError) throw countSequenceError

      if (
        Number.isFinite(limits.sequences) &&
        (currentSequences?.length || 0) + 1 > limits.sequences
      ) {
        alert(
          `シークエンス上限を超えるため追加できません💦\n\n現在: ${
            currentSequences?.length || 0
          }件\n上限: ${limits.sequences}件`
        )
        return
      }

      const asanaResult = await addMissingAsanas(preset)

      const items = await getPresetItems(preset.id)

      const { data: latestAsanas, error: latestAsanasError } = await supabase
        .from('asanas')
        .select('id, preset_key, title')
        .eq('user_id', user.id)

      if (latestAsanasError) throw latestAsanasError

      const asanaMap = new Map(
        (latestAsanas || [])
          .filter((asana) => asana.preset_key)
          .map((asana) => [asana.preset_key, asana.id])
      )

      const { data: newSequence, error: insertSequenceError } = await supabase
        .from('sequences')
        .insert({
          user_id: user.id,
          title: preset.title || 'テンプレート',
          memo: preset.memo || '',
          preset_key: sequencePresetKey,
        })
        .select('id')
        .single()

      if (insertSequenceError) throw insertSequenceError

      const sequenceItems = items
        .map((item, index) => {
          if (item.type === 'asana') {
            const asanaId = asanaMap.get(item.preset_key)

            if (!asanaId) return null

            return {
              user_id: user.id,
              sequence_id: newSequence.id,
              type: 'asana',
              asana_id: asanaId,
              position: item.position ?? index,
              memo: item.memo || '',
            }
          }

          if (item.type === 'section') {
            return {
              user_id: user.id,
              sequence_id: newSequence.id,
              type: 'section',
              section_title: item.section_title || '',
              position: item.position ?? index,
            }
          }

          if (item.type === 'memo') {
            return {
              user_id: user.id,
              sequence_id: newSequence.id,
              type: 'memo',
              memo: item.memo || '',
              position: item.position ?? index,
            }
          }

          return null
        })
        .filter(Boolean)

      if (sequenceItems.length > 0) {
        const { error: insertItemsError } = await supabase
          .from('sequence_items')
          .insert(sequenceItems)

        if (insertItemsError) throw insertItemsError
      }

      alert(
        `シークエンスを追加しました✨\n\nアーサナ追加: ${asanaResult.addedCount}件\nスキップ: ${asanaResult.skippedCount}件`
      )
    } catch (error) {
      console.error(error)
      alert('シークエンス追加に失敗しました💦')
    } finally {
      setAddingKey(null)
    }
  }

  async function addMissingAsanas(preset) {
    const limits = getPlanLimits(profile.plan)

    const { data: currentAsanas, error: countError } = await supabase
      .from('asanas')
      .select('id, preset_key')
      .eq('user_id', user.id)

    if (countError) throw countError

    const existingPresetKeys = new Set(
      (currentAsanas || []).map((a) => a.preset_key).filter(Boolean)
    )

    const items = await getPresetItems(preset.id)

    const asanaItems = items.filter((item) => item.type === 'asana')

    const uniqueItems = Array.from(
  new Map(
    asanaItems
      .filter(
        (item) =>
          item.preset_key &&
          !existingPresetKeys.has(item.preset_key)
      )
      .map((item) => [item.preset_key, item])
  ).values()
)

    const skippedCount = asanaItems.length - uniqueItems.length

    if (uniqueItems.length === 0) {
      return {
        addedCount: 0,
        skippedCount,
      }
    }

    const currentCount = currentAsanas?.length || 0
    const nextCount = currentCount + uniqueItems.length

    if (Number.isFinite(limits.asanas) && nextCount > limits.asanas) {
      alert(
        `アーサナ上限を超えるため追加できません💦\n\n現在: ${currentCount}件\n追加予定: ${uniqueItems.length}件\n上限: ${limits.asanas}件`
      )

      return {
        addedCount: 0,
        skippedCount,
      }
    }

    const insertRows = uniqueItems.map((item) => ({
      user_id: user.id,

      title: item.asana_title || '',
      sanskrit: item.asana_sanskrit || '',

      alias: item.alias || '',

      types: item.types || [],
      chakras: item.chakras || [],

      strength: item.strength || '',
      flexibility: item.flexibility || '',

      howto: item.howto || '',
      effect: item.effect || '',
      caution: item.caution || '',

      variation: item.variation || '',
      modification: item.modification || '',

      note: item.note || '',
      image_url: item.image_url || null,

      favorite: false,
      preset_key: item.preset_key,
    }))

    const { error: insertError } = await supabase
      .from('asanas')
      .insert(insertRows)

    if (insertError) throw insertError

    return {
      addedCount: uniqueItems.length,
      skippedCount,
    }
  }

  function getPlanBadge(plan) {
    switch (plan) {
      case 'special':
        return (
          <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-700">
            Special
          </span>
        )

      case 'pro':
        return (
          <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">
            Pro
          </span>
        )

      default:
        return (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">
            Free
          </span>
        )
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-4">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
          <Link href="/" className="text-sm text-sky-600">
            ← ホームへ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            📦 テンプレート
          </h1>

          <p className="mt-2 text-sm leading-7 text-gray-500">
            よく使うアーサナや、レッスンのベースになるセットをまとめて追加できます✨
          </p>

          <p className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-xs leading-6 text-violet-700">
            同じテンプレート由来のアーサナやシークエンスは、
            重複しないよう自動でスキップされます🌙
            <br />
            ※ テンプレート内容は参考用です。流派やレッスン内容によって、
            アーサナ名・順番・分類などが異なる場合があります。
            <br />
            ※ 追加後は、ご自身の使いやすい形に自由に編集・調整してご利用ください✨
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            読み込み中...
          </div>
        ) : (
          presets.map((preset) => (
            <section
              key={preset.id}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {preset.title}
                  </h2>

                  {preset.memo && (
                    <p className="mt-2 text-sm leading-7 text-gray-500">
                      {preset.memo}
                    </p>
                  )}
                </div>

                {getPlanBadge(preset.plan_required || 'free')}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => addAsanasOnly(preset)}
                  disabled={addingKey === `${preset.id}-asanas`}
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-600 disabled:opacity-50"
                >
                  {addingKey === `${preset.id}-asanas`
                    ? '追加中...'
                    : 'アーサナのみ追加'}
                </button>

                {preset.is_sequence_template && (
  <button
    type="button"
    onClick={() => addAsanasAndSequence(preset)}
    disabled={addingKey === `${preset.id}-sequence`}
    className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-600 disabled:opacity-50"
  >
    {addingKey === `${preset.id}-sequence`
      ? '追加中...'
      : 'アーサナ＋シークエンス追加'}
  </button>
)}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}