'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  ASANA_TYPES,
  TYPE_LABELS,
  TYPE_STYLES,
  CHAKRAS,
  CHAKRA_LABELS,
  CHAKRA_STYLES,
} from '@/lib/categories'

export default function AsanaCreatePage() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [sanskrit, setSanskrit] = useState('')
  const [howto, setHowto] = useState('')
  const [effect, setEffect] = useState('')
  const [caution, setCaution] = useState('')
  const [variation, setVariation] = useState('')
  const [note, setNote] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [strength, setStrength] = useState('')
  const [flexibility, setFlexibility] = useState('')
  const [modification, setModification] = useState('')
  const [chakras, setChakras] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(false)

  const inputClass =
    'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100'

  const textareaClass =
    'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100'

  const labelClass = 'mb-2 block text-sm font-bold text-gray-700'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('asanas').insert([
      {
        title,
        sanskrit,
        howto,
        effect,
        caution,
        variation,
        note,
        image_url: imageUrl || null,
        strength,
        flexibility,
        modification,
        chakras,
        types,
      },
    ])

    setLoading(false)

    if (error) {
      alert(`登録エラー: ${error.message}`)
      return
    }

    alert('登録できたよ！')
    router.push('/asanas')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-medium text-sky-500">
            Asana Dictionary
          </p>

          <h1 className="mb-2 text-3xl font-bold text-gray-800">
            ✨ アーサナ登録
          </h1>

          <p className="text-sm text-gray-500">
            ポーズの誘導・効果・チャクラを記録して、自分だけの辞書を育てよう
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur"
        >
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">基本情報</h2>

            <div>
              <label className={labelClass}>ポーズ名</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="例：山のポーズ"
                required
              />
            </div>

            <div>
              <label className={labelClass}>サンスクリット名</label>
              <input
                type="text"
                value={sanskrit}
                onChange={(e) => setSanskrit(e.target.value)}
                className={inputClass}
                placeholder="例：タダーサナ"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-3xl bg-sky-50/60 p-4">
            <h2 className="text-lg font-bold text-gray-800">分類</h2>

            <div className="flex flex-wrap gap-2">
              {ASANA_TYPES.map((type) => {
                const checked = types.includes(type)

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      checked
                        ? setTypes(types.filter((t) => t !== type))
                        : setTypes([...types, type])
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      checked
                        ? TYPE_STYLES[type]
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {TYPE_LABELS[type]?.ja || type}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl bg-violet-50/60 p-4">
            <h2 className="text-lg font-bold text-gray-800">チャクラ</h2>

            <div className="flex flex-wrap gap-2">
              {CHAKRAS.map((chakra) => {
                const checked = chakras.includes(chakra)

                return (
                  <button
                    key={chakra}
                    type="button"
                    onClick={() =>
                      checked
                        ? setChakras(chakras.filter((c) => c !== chakra))
                        : setChakras([...chakras, chakra])
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      checked
                        ? CHAKRA_STYLES[chakra]
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {CHAKRA_LABELS[chakra] || chakra}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">レッスンメモ</h2>

            <div>
              <label className={labelClass}>誘導</label>
              <textarea
                value={howto}
                onChange={(e) => setHowto(e.target.value)}
                className={textareaClass}
                rows={4}
                placeholder="呼吸や身体の使い方など"
              />
            </div>

            <div>
              <label className={labelClass}>効果効能</label>
              <textarea
                value={effect}
                onChange={(e) => setEffect(e.target.value)}
                className={textareaClass}
                rows={3}
                placeholder="期待できる効果など"
              />
            </div>

            <div>
              <label className={labelClass}>注意</label>
              <textarea
                value={caution}
                onChange={(e) => setCaution(e.target.value)}
                className={textareaClass}
                rows={3}
                placeholder="禁忌・気をつけること"
              />
            </div>

            <div>
              <label className={labelClass}>バリエーション</label>
              <textarea
                value={variation}
                onChange={(e) => setVariation(e.target.value)}
                className={textareaClass}
                rows={3}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-3xl bg-gray-50 p-4">
            <h2 className="text-lg font-bold text-gray-800">身体のポイント</h2>

            <div>
              <label className={labelClass}>筋力</label>
              <input
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>柔軟性</label>
              <input
                type="text"
                value={flexibility}
                onChange={(e) => setFlexibility(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>軽減法</label>
              <input
                type="text"
                value={modification}
                onChange={(e) => setModification(e.target.value)}
                className={inputClass}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <label className={labelClass}>画像URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={inputClass}
                placeholder="画像URLがあれば入力"
              />
            </div>

            <div>
              <label className={labelClass}>メモ</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={textareaClass}
                rows={4}
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-base font-bold text-white shadow-md transition hover:scale-[1.01] hover:shadow-lg disabled:opacity-50"
          >
            {loading ? '登録中...' : 'アーサナを登録する'}
          </button>
        </form>
      </div>
    </main>
  )
}