'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ASANA_TYPES, CHAKRAS } from '@/lib/categories'

export default function AsanaEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id

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
  const [types, setTypes] = useState([])
  const [chakras, setChakras] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAsana()
  }, [id])

  async function fetchAsana() {
    const { data, error } = await supabase
      .from('asanas')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      alert(`取得エラー: ${error.message}`)
      setLoading(false)
      return
    }

    setTitle(data.title || '')
    setSanskrit(data.sanskrit || '')
    setHowto(data.howto || '')
    setEffect(data.effect || '')
    setCaution(data.caution || '')
    setVariation(data.variation || '')
    setNote(data.note || '')
    setImageUrl(data.image_url || '')
    setStrength(data.strength || '')
    setFlexibility(data.flexibility || '')
    setModification(data.modification || '')
    setTypes(data.types || [])
    setChakras(data.chakras || [])
    setLoading(false)
  }

  function toggleType(type) {
    setTypes((prev) =>
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type]
    )
  }

  function toggleChakra(chakra) {
    setChakras((prev) =>
      prev.includes(chakra)
        ? prev.filter((item) => item !== chakra)
        : [...prev, chakra]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('asanas')
      .update({
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
        types,
        chakras,
      })
      .eq('id', id)

    setSaving(false)

    if (error) {
      alert(`更新エラー: ${error.message}`)
      return
    }

    alert('更新できたよ！')
    router.push('/asanas')
    router.refresh()
  }

  if (loading) {
    return <main className="p-6">読み込み中...</main>
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">アーサナ編集</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block font-medium">ポーズ名</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border p-2"
            required
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">サンスクリット名</label>
          <input
            value={sanskrit}
            onChange={(e) => setSanskrit(e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">分類</label>
          <div className="flex flex-wrap gap-2">
            {ASANA_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-medium">チャクラ</label>
          <div className="flex flex-wrap gap-2">
            {CHAKRAS.map((chakra) => (
              <label key={chakra} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={chakras.includes(chakra)}
                  onChange={() => toggleChakra(chakra)}
                />
                {chakra}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block font-medium">誘導</label>
          <textarea
            value={howto}
            onChange={(e) => setHowto(e.target.value)}
            className="w-full rounded border p-2"
            rows={4}
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">効果効能</label>
          <textarea
            value={effect}
            onChange={(e) => setEffect(e.target.value)}
            className="w-full rounded border p-2"
            rows={3}
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">注意</label>
          <textarea
            value={caution}
            onChange={(e) => setCaution(e.target.value)}
            className="w-full rounded border p-2"
            rows={3}
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">バリエーション</label>
          <textarea
            value={variation}
            onChange={(e) => setVariation(e.target.value)}
            className="w-full rounded border p-2"
            rows={3}
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">筋力</label>
          <input
            value={strength}
            onChange={(e) => setStrength(e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">柔軟性</label>
          <input
            value={flexibility}
            onChange={(e) => setFlexibility(e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">軽減法</label>
          <input
            value={modification}
            onChange={(e) => setModification(e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">画像URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">メモ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border p-2"
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </form>
    </main>
  )
}