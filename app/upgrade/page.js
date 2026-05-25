'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { PLAN_LIMITS } from '@/lib/planLimits'

const PLAN_INFO = {
  free: {
    name: 'Free',
    badge: 'まずはお試し',
    color: 'gray',
    price: '無料',
    description:
      'まずは気軽に、自分だけの辞書づくりを始めたい方向け。',
  },


  support: {
    name: 'Support',
    badge: 'β版協力者',
    color: 'emerald',
    price: '無料 / 月額300円相当',
    description:
      'β版から応援してくださっている方向けの特別プラン。',
  },

    special: {
    name: 'Special',
    badge: 'もっと自由に',
    color: 'sky',
    price: '月額480円予定',
    description:
      'レッスン作成をもっと快適に使いたい方向け。',
  },

  pro: {
    name: 'Pro',
    badge: '本格管理',
    color: 'violet',
    price: '月額980円予定',
    description:
      'レッスン資産を本格的に育てて管理したい方向け。',
  },
}

const FEATURE_ROWS = [
  ['asanas', '動きの登録数'],
  ['sequences', 'シークエンス数'],
  ['sequenceItems', 'シークエンス内アイテム数'],
  ['imageUpload', '画像アップロード'],
  ['templates', 'テンプレート利用'],
  ['pdfExport', 'PDF出力'],
  ['share', '共有機能'],
]

  function formatValue(value) {
  if (value === Infinity) return '無制限'
  if (value === true) return '○'
  if (value === false) return '—'
  if (value === 'partial') return '△'
  return value
}

function planStyle(color) {
  switch (color) {

    case 'gray':
  return {
    card: 'border-gray-100 bg-gray-50/70',
    title: 'text-gray-700',
    badge: 'bg-gray-500 text-white',
    button: 'from-gray-500 to-gray-600',
  }

case 'emerald':
  return {
    card: 'border-emerald-100 bg-emerald-50/70',
    title: 'text-emerald-700',
    badge: 'bg-emerald-500 text-white',
    button: 'from-emerald-500 to-teal-500',
  }
    case 'sky':
      return {
        card: 'border-sky-100 bg-sky-50/70',
        title: 'text-sky-700',
        badge: 'bg-sky-500 text-white',
        button: 'from-sky-500 to-cyan-500',
      }
    case 'violet':
      return {
        card: 'border-violet-100 bg-violet-50/70',
        title: 'text-violet-700',
        badge: 'bg-violet-500 text-white',
        button: 'from-violet-500 to-purple-500',
      }
    case 'pink':
      return {
        card: 'border-pink-100 bg-pink-50/70',
        title: 'text-pink-700',
        badge: 'bg-pink-500 text-white',
        button: 'from-pink-500 to-rose-500',
      }
    default:
      return {
        card: 'border-gray-100 bg-gray-50',
        title: 'text-gray-700',
        badge: 'bg-gray-500 text-white',
        button: 'from-gray-500 to-gray-600',
      }
  }
}

export default function UpgradePage() {
  const { profile } = useAuth()
  const currentPlan = profile?.plan || 'free'

  function handleUpgrade(planKey) {
  if (planKey === currentPlan) {
    alert('現在ご利用中のプランです 🌙')
    return
  }

  if (planKey === 'support') {
    alert(
      'Supportプランは現在、β版利用者向けの特別プランです 🌙\n\nご利用状況やフィードバック状況を見ながら順次ご案内予定です。'
    )
    return
  }

  alert('正式版リリース時に公開予定です 🌙')
}

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
          <Link href="/mypage" className="text-sm font-bold text-sky-600">
            ← マイページへ戻る
          </Link>

          <p className="mt-5 text-sm font-bold tracking-[0.25em] text-violet-400">
            UPGRADE
          </p>

          <h1 className="mt-2 text-3xl font-bold leading-tight text-gray-800">
            Asana Dictionary を
            <br />
            もっと自由に育てる 🌙
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-600">
            現在はβ版として運用中です。正式版リリース時に、
            登録数の拡張や追加機能を含むアップグレードプランを公開予定です。
          </p>

          <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm leading-7 text-violet-700 ring-1 ring-violet-100">
            現在のプラン：
            <span className="ml-1 font-bold">
              {PLAN_INFO[currentPlan]?.name || 'Free'}
            </span>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(PLAN_INFO).map(([planKey, plan]) => {
            const style = planStyle(plan.color)
            const limits = PLAN_LIMITS[planKey]
            const isCurrent = currentPlan === planKey

            return (
              <div
                key={planKey}
                className={`rounded-3xl border p-5 shadow-sm ${style.card}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className={`text-xl font-bold ${style.title}`}>
                    {plan.name}
                  </h2>

                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${style.badge}`}>
                    {isCurrent ? '現在のプラン' : plan.badge}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {plan.description}
                </p>

                <p className="mt-2 text-xs font-bold text-gray-500">
  {plan.price}
</p>

                <div className="mt-4 space-y-2 text-sm text-gray-700">
                  <PlanLine label="動き" value={formatValue(limits.asanas)} />
                  <PlanLine
  label="画像アップロード"
  value={formatValue(limits.imageUpload)}
/>
                  <PlanLine label="シークエンス" value={formatValue(limits.sequences)} />
                  <PlanLine label="PDF出力" value={formatValue(limits.pdfExport)} />
                  <PlanLine label="共有" value={formatValue(limits.share)} />
                  <PlanLine label="テンプレート" value={formatValue(limits.templates)} />
                </div>

                <button
  type="button"
  onClick={() => handleUpgrade(planKey)}
  className={`mt-5 w-full rounded-2xl bg-gradient-to-r ${style.button} px-4 py-3 text-sm font-bold text-white shadow transition hover:scale-[1.01] disabled:opacity-60`}
>
  {isCurrent
    ? '現在のプランです'
    : planKey === 'support'
      ? '🌙 利用条件を見る'
      : 'アップグレード'}
</button>
              </div>
            )
          })}
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            プラン比較
          </h2>

          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
           <div className="grid grid-cols-5 border-b border-gray-100 bg-gray-50 text-xs font-bold sm:text-sm">
  <div className="p-3 text-gray-500">
    プラン
  </div>

  {Object.entries(PLAN_INFO).map(([planKey, plan]) => (
    <div
      key={planKey}
      className={`p-3 text-center ${
        currentPlan === planKey
          ? 'bg-violet-50 text-violet-700'
          : 'text-gray-700'
      }`}
    >
      <p>{plan.name}</p>

      <p className="mt-1 text-[10px] font-normal text-gray-500">
        {plan.price}
      </p>
    </div>
  ))}
</div>
            {FEATURE_ROWS.map(([key, label]) => (
              <div
                key={key}
                className="grid grid-cols-5 border-b border-gray-100 text-xs last:border-b-0 sm:text-sm"
              >
                <div className="bg-gray-50 p-3 font-bold text-gray-600">
                  {label}
                </div>

                {Object.keys(PLAN_INFO).map((planKey) => (
                  <div
                    key={planKey}
                    className={`p-3 text-center ${
                      currentPlan === planKey
                        ? 'bg-violet-50 font-bold text-violet-700'
                        : 'bg-white text-gray-600'
                    }`}
                  >
                    {formatValue(PLAN_LIMITS[planKey][key])}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 to-violet-50 p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-pink-700">
            正式版リリース準備中
          </p>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            決済機能はまだ準備中です。正式版リリース時に、
            このページからアップグレードできるようにする予定です 🪷
          </p>
        </section>
      </div>
    </main>
  )
}

function PlanLine({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}