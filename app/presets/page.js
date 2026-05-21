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
  const [addingId, setAddingId] = useState(null)

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

  async function handleAddPreset(preset) {
    if (!user || !profile) return

    const userRank =
      PLAN_RANK[profile.plan] || PLAN_RANK.free

    const requiredRank =
      PLAN_RANK[preset.plan_required || 'free'] ||
      PLAN_RANK.free

    if (userRank < requiredRank) {
      alert(
        'このテンプレートは現在、一部プラン向けに調整中です🌙'
      )
      return
    }

    setAddingId(preset.id)

    try {
      const limits = getPlanLimits(profile.plan)

      // 現在のアーサナ取得
      const { data: currentAsanas, error: countError } =
        await supabase
          .from('asanas')
          .select('id, preset_key')
          .eq('user_id', user.id)

      if (countError) {
        console.error(countError)
        alert(
          '現在のアーサナ数を確認できませんでした💦'
        )
        return
      }

      // 既存preset_key
      const existingPresetKeys = new Set(
        (currentAsanas || [])
          .map((a) => a.preset_key)
          .filter(Boolean)
      )

      // テンプレ取得
      const { data: items, error: itemsError } =
        await supabase
          .from('initial_sequence_items')
          .select('*')
          .eq('initial_sequence_id', preset.id)
          .eq('type', 'asana')
          .order('position', { ascending: true })

      if (itemsError) {
        console.error(itemsError)
        alert(
          'テンプレート内容を取得できませんでした💦'
        )
        return
      }

      // 重複除外
      const uniqueItems = (items || []).filter(
        (item) =>
          item.preset_key &&
          !existingPresetKeys.has(item.preset_key)
      )

      const skippedCount =
        (items || []).length - uniqueItems.length

      if (uniqueItems.length === 0) {
        alert(
          '追加できる新しいアーサナはありません✨'
        )
        return
      }

      // 上限チェック
      const currentCount =
        currentAsanas?.length || 0

      const nextCount =
        currentCount + uniqueItems.length

      if (
        Number.isFinite(limits.asanas) &&
        nextCount > limits.asanas
      ) {
        alert(
          `アーサナ上限を超えるため追加できません💦\n\n現在: ${currentCount}件\n追加予定: ${uniqueItems.length}件\n上限: ${limits.asanas}件`
        )
        return
      }

      // insert
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

      if (insertError) {
        console.error(insertError)
        alert('追加に失敗しました💦')
        return
      }

      alert(
        `${uniqueItems.length}件のアーサナを追加しました✨\n${skippedCount}件は登録済みのためスキップしました🌙`
      )
    } finally {
      setAddingId(null)
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
          <Link
            href="/"
            className="text-sm text-sky-600"
          >
            ← ホームへ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            📦 テンプレート
          </h1>

          <p className="mt-2 text-sm leading-7 text-gray-500">
            よく使うアーサナや、
            レッスンのベースになるセットを
            まとめて追加できます✨
          </p>

          <p className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-xs leading-6 text-violet-700">
  同じテンプレート由来のアーサナは、
  重複しないよう自動でスキップされます🌙

  <br />
  ※ テンプレート内容は参考用です。
  流派やレッスン内容によって、
  アーサナ名・順番・分類などが異なる場合があります。

  <br />
  ※ 追加後は、ご自身の使いやすい形に
  自由に編集・調整してご利用ください✨
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

                {getPlanBadge(
                  preset.plan_required || 'free'
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  handleAddPreset(preset)
                }
                disabled={addingId === preset.id}
                className="mt-5 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-600 disabled:opacity-50"
              >
                {addingId === preset.id
                  ? '追加中...'
                  : 'アーサナを追加'}
              </button>
            </section>
          ))
        )}
      </div>
    </main>
  )
}