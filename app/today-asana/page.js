'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/components/AuthProvider'
import { TYPE_LABELS } from '@/lib/categories'

const messages = [
  '今日は、呼吸とともに自分の中心へ戻る時間を大切にしましょう。',
  '無理に頑張るより、今の身体の声をやさしく聞いてみましょう。',
  '小さな安定を積み重ねることで、心も身体も整っていきます。',
  '今日は、自分の軸を信じて静かに前を向く日です。',
  '力を抜くことで、本来のしなやかさが戻ってきます。',
  '今のあなたに必要なテーマを、ポーズから受け取ってみましょう。',
]

function getTodayKey() {
  return new Date().toLocaleDateString('sv-SE')
}

export default function TodayAsanaPage() {
  const { user, profile } = useAuth()

  const [asanas, setAsanas] = useState([])
  const [selectedAsana, setSelectedAsana] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const todayKey = getTodayKey()
  const storageKey = user ? `todayAsana:${user.id}` : null
  const canDrawUnlimited =
    profile?.plan === 'special' || profile?.plan === 'pro'

  useEffect(() => {
    if (!user) return
    fetchAsanas()
  }, [user])

  async function fetchAsanas() {
    setLoading(true)

    const { data, error } = await supabase
      .from('asanas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    const list = data || []
    setAsanas(list)

    if (list.length > 0) {
      restoreOrDrawAsana(list)
    }

    setLoading(false)
  }

  function restoreOrDrawAsana(list) {
    if (!storageKey) return

    const saved = localStorage.getItem(storageKey)

    if (!canDrawUnlimited && saved) {
      try {
        const parsed = JSON.parse(saved)

        if (parsed.date === todayKey) {
          const savedAsana = list.find((asana) => asana.id === parsed.asanaId)

          if (savedAsana) {
            setSelectedAsana(savedAsana)
            setMessage(parsed.message)
            return
          }
        }
      } catch {
        localStorage.removeItem(storageKey)
      }
    }

    drawAsana(list, true)
  }

  function drawAsana(list = asanas, isFirstDraw = false) {
    if (!list || list.length === 0 || !storageKey) return

    const saved = localStorage.getItem(storageKey)

    if (!canDrawUnlimited && !isFirstDraw && saved) {
      try {
        const parsed = JSON.parse(saved)

        if (parsed.date === todayKey) {
          alert(
            `β版では「今日のアーサナ」は1日1回までご利用いただけます🌙\n\n今後、機能追加や保存数の拡張も予定しています✨`
          )
          return
        }
      } catch {
        localStorage.removeItem(storageKey)
      }
    }

    const randomAsana = list[Math.floor(Math.random() * list.length)]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]

    setSelectedAsana(randomAsana)
    setMessage(randomMessage)

    if (!canDrawUnlimited) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          date: todayKey,
          asanaId: randomAsana.id,
          message: randomMessage,
        })
      )
    }
  }

  function formatTypes(types) {
  if (!types?.length) return '未設定'

  return types
    .map((type) => TYPE_LABELS[type]?.ja || type)
    .join(' / ')
}

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-sky-50 p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-violet-100">
          <Link href="/" className="text-sm text-violet-600">
            ← ホームへ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-violet-800">
            🌙 今日のアーサナ
          </h1>

          <p className="mt-2 text-sm leading-7 text-gray-600">
            登録してあるアーサナの中から、今日の1ポーズをランダムで選びます。
            レッスンテーマやセルフプラクティスのヒントにどうぞ🧘‍♀️
          </p>

          {!canDrawUnlimited && (
            <p className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-xs leading-6 text-violet-700">
              β版では1日1回までご利用いただけます🌙
            </p>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            読み込み中...
          </div>
        )}

        {!loading && asanas.length === 0 && (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-violet-100">
            <p className="text-sm leading-7 text-gray-600">
              まだアーサナが登録されていません。
              <br />
              まずはアーサナを登録してから、今日のアーサナを引いてみましょう✨
            </p>

            <Link href="/asana-create">
              <button className="mt-5 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-600">
                アーサナを登録する
              </button>
            </Link>
          </div>
        )}

        {!loading && selectedAsana && (
          <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-violet-100">
            <div className="bg-gradient-to-r from-violet-100 to-sky-100 p-6 text-center">
              <p className="text-xs font-bold tracking-[0.25em] text-violet-500">
                TODAY&apos;S ASANA
              </p>

              <h2 className="mt-3 text-3xl font-bold text-gray-800">
                {selectedAsana.title}
              </h2>

              {selectedAsana.sanskrit && (
                <p className="mt-1 text-sm text-gray-500">
                  {selectedAsana.sanskrit}
                </p>
              )}
            </div>

            {selectedAsana.image_url && (
              <div className="bg-violet-50 p-4">
                <img
                  src={selectedAsana.image_url}
                  alt={selectedAsana.title}
                  className="mx-auto max-h-80 rounded-3xl object-contain shadow-sm"
                />
              </div>
            )}

            <div className="space-y-5 p-6">
              <div className="rounded-3xl bg-violet-50 p-5">
                <p className="text-xs font-bold tracking-widest text-violet-500">
                  今日のメッセージ
                </p>

                <p className="mt-3 text-sm leading-7 text-gray-700">
                  {message}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-sky-50 p-4">
                  <p className="text-xs font-bold text-sky-600">分類</p>

                  <p className="mt-2 text-sm text-gray-600">
                    {formatTypes(selectedAsana.types)}
                  </p>
                </div>

                <div className="rounded-3xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold text-emerald-600">
                    チャクラ
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    {selectedAsana.chakras?.length
                      ? selectedAsana.chakras.join(' / ')
                      : '未設定'}
                  </p>
                </div>
              </div>

              {selectedAsana.effect && (
                <div className="rounded-3xl bg-orange-50 p-4">
                  <p className="text-xs font-bold text-orange-600">
                    効果効能
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                    {selectedAsana.effect}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => drawAsana()}
                  className="flex-1 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-600"
                >
                  もう一度引く
                </button>

                <Link href="/asanas" className="flex-1">
                  <button className="w-full rounded-2xl border border-violet-200 bg-white px-5 py-3 text-sm font-bold text-violet-600 shadow-sm transition hover:bg-violet-50">
                    アーサナ一覧で見る
                  </button>
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}