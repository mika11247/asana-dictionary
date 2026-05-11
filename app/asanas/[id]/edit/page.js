'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  ASANA_TYPES,
  CHAKRAS,
  TYPE_LABELS,
  TYPE_STYLES,
  CHAKRA_LABELS,
  CHAKRA_STYLES,
} from '@/lib/categories'

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

  const [alias, setAlias] = useState('')

  const [imageFile, setImageFile] = useState(null)
const [imagePreview, setImagePreview] = useState('')

  const inputClass =
    'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100'

  const textareaClass =
    'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100'

  const labelClass = 'mb-2 block text-sm font-bold text-gray-700'

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
    setImagePreview(data.image_url || '')
    setAlias(data.alias || '')
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

  function handleImageChange(e) {
    const file = e.target.files?.[0] || null
  
    setImageFile(file)
  
    if (file) {
      setImagePreview(URL.createObjectURL(file))
    }
  }

  async function compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image()
      const reader = new FileReader()
  
      reader.readAsDataURL(file)
  
      reader.onload = (event) => {
        img.src = event.target?.result
      }
  
      img.onload = () => {
        const canvas = document.createElement('canvas')
  
        const maxWidth = 1200
  
        const scale = Math.min(1, maxWidth / img.width)
  
        canvas.width = img.width * scale
        canvas.height = img.height * scale
  
        const ctx = canvas.getContext('2d')
  
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
        canvas.toBlob(
          (blob) => {
            if (!blob) return
  
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.\w+$/, '.webp'),
              {
                type: 'image/webp',
              }
            )
  
            resolve(compressedFile)
          },
          'image/webp',
          0.8
        )
      }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
  
    let uploadedImageUrl = imageUrl
  
    try {
      if (imageFile) {

        const compressedFile = await compressImage(imageFile)
        const fileExt = compressedFile.name.split('.').pop()
  
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`
  
        const { error: uploadError } = await supabase.storage
          .from('asana-images')
          .upload(fileName, compressedFile)
  
        if (uploadError) {
          throw uploadError
        }
  
        const {
          data: { publicUrl },
        } = supabase.storage
          .from('asana-images')
          .getPublicUrl(fileName)
  
        uploadedImageUrl = publicUrl
      }
  
      const { error } = await supabase
        .from('asanas')
        .update({
          title,
          sanskrit,
          alias,
          howto,
          effect,
          caution,
          variation,
          note,
          image_url: uploadedImageUrl || null,
          strength,
          flexibility,
          modification,
          types,
          chakras,
        })
        .eq('id', id)
  
      if (error) {
        alert(`更新エラー: ${error.message}`)
        return
      }
  
      alert('更新できたよ！')
      router.push('/asanas')
      router.refresh()
    } catch (error) {
      alert(`画像アップロードエラー: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white/90 p-6 text-center text-gray-500 shadow-sm">
          読み込み中...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-medium text-violet-500">
            Edit Asana
          </p>

          <h1 className="mb-2 text-3xl font-bold text-gray-800">
            ✏️ アーサナ編集
          </h1>

          <p className="text-sm text-gray-500">
            アーサナ情報を更新できます
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>サンスクリット名</label>
              <input
                value={sanskrit}
                onChange={(e) => setSanskrit(e.target.value)}
                className={inputClass}
              />
            </div>
          </section>

          <div>
  <label className="mb-2 block text-sm font-bold text-gray-700">
    検索用キーワード
  </label>

  <input
    type="text"
    value={alias}
    onChange={(e) => setAlias(e.target.value)}
    placeholder="例：略称・英語名・別名など"
    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
  />

  <p className="mt-2 text-xs text-gray-400">
    カンマ区切りで複数登録できます
  </p>
</div>

          <section className="space-y-4 rounded-3xl bg-sky-50/60 p-4">
            <h2 className="text-lg font-bold text-gray-800">分類</h2>

            <div className="flex flex-wrap gap-2">
              {ASANA_TYPES.map((type) => {
                const checked = types.includes(type)

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
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
                    onClick={() => toggleChakra(chakra)}
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
              />
            </div>

            <div>
              <label className={labelClass}>効果効能</label>
              <textarea
                value={effect}
                onChange={(e) => setEffect(e.target.value)}
                className={textareaClass}
                rows={3}
              />
            </div>

            <div>
              <label className={labelClass}>注意</label>
              <textarea
                value={caution}
                onChange={(e) => setCaution(e.target.value)}
                className={textareaClass}
                rows={3}
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
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>柔軟性</label>
              <input
                value={flexibility}
                onChange={(e) => setFlexibility(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>軽減法</label>
              <input
                value={modification}
                onChange={(e) => setModification(e.target.value)}
                className={inputClass}
              />
            </div>
          </section>

          <section className="space-y-4">
  <div>
    <label className={labelClass}>アーサナ画像</label>

    <input
      type="file"
      accept="image/*"
      onChange={handleImageChange}
      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
    />

    {imagePreview && (
      <div className="mt-4 rounded-3xl bg-gray-50 p-4">
        <img
          src={imagePreview}
          alt="プレビュー"
          className="h-56 w-full rounded-2xl object-contain"
        />
      </div>
    )}
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
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-base font-bold text-white shadow-md transition hover:scale-[1.01] hover:shadow-lg disabled:opacity-50"
          >
            {saving ? '保存中...' : '変更を保存する'}
          </button>
        </form>
      </div>
    </main>
  )
}