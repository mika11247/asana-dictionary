'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

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

  const chakraOptions = [
    'ムーラダーラ',
    'スヴァディシュターナ',
    'マニプーラ',
    'アナハタ',
    'ヴィシュッダ',
    'アージュニャー',
    'サハスラーラ',
  ]
  
  const typeOptions = [
    'Standing',
    'Forward Bend',
    'Backbend',
    'Twist',
    'Balance',
    'Inversion',
    'Restorative',
  ]

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
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">アーサナ登録</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">ポーズ名</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="例：山のポーズ"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">サンスクリット名</label>
          <input
            type="text"
            value={sanskrit}
            onChange={(e) => setSanskrit(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="例：タダ・アーサナ"
          />
        </div>

        <div>
  <label className="block mb-2 font-medium">分類</label>

  <div className="flex flex-wrap gap-2">
    {typeOptions.map((type) => (
      <label key={type} className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={types.includes(type)}
          onChange={(e) => {
            if (e.target.checked) {
              setTypes([...types, type])
            } else {
              setTypes(types.filter((t) => t !== type))
            }
          }}
        />
        {type}
      </label>
    ))}
  </div>
</div>

        <div>
  <label className="block mb-2 font-medium">チャクラ</label>

  <div className="flex flex-wrap gap-2">
    {chakraOptions.map((chakra) => (
      <label key={chakra} className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={chakras.includes(chakra)}
          onChange={(e) => {
            if (e.target.checked) {
              setChakras([...chakras, chakra])
            } else {
              setChakras(chakras.filter((c) => c !== chakra))
            }
          }}
        />
        {chakra}
      </label>
    ))}
  </div>
</div>

        <div>
          <label className="block mb-1 font-medium">誘導</label>
          <textarea
            value={howto}
            onChange={(e) => setHowto(e.target.value)}
            className="w-full border rounded p-2"
            rows={4}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">効果効能</label>
          <textarea
            value={effect}
            onChange={(e) => setEffect(e.target.value)}
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">注意</label>
          <textarea
            value={caution}
            onChange={(e) => setCaution(e.target.value)}
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">バリエーション</label>
          <textarea
            value={variation}
            onChange={(e) => setVariation(e.target.value)}
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">筋力</label>
          <input
            type="text"
            value={strength}
            onChange={(e) => setStrength(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">柔軟性</label>
          <input
            type="text"
            value={flexibility}
            onChange={(e) => setFlexibility(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">軽減法</label>
          <input
            type="text"
            value={modification}
            onChange={(e) => setModification(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">画像URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="画像URLがあれば入力"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">メモ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded p-2"
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? '登録中...' : '登録する'}
        </button>
      </form>
    </main>
  )
}