export const ASANA_TYPES = [
  'Standing',
  'Forward Bend',
  'Backbend',
  'Twist',
  'Balance',
  'Inversion',
  'Restorative',
]

export const TYPE_LABELS: Record<string, { ja: string; en: string }> = {
  Standing: { ja: '立位', en: 'Standing' },
  'Forward Bend': { ja: '前屈', en: 'Forward Bend' },
  Backbend: { ja: '後屈', en: 'Backbend' },
  Twist: { ja: 'ねじり', en: 'Twist' },
  Balance: { ja: 'バランス', en: 'Balance' },
  Inversion: { ja: '逆転', en: 'Inversion' },
  Restorative: { ja: 'リストラティブ', en: 'Restorative' },
  未分類: { ja: '未分類', en: 'Uncategorized' },
}
  
  export const TYPE_STYLES: Record<string, string> = {
    Standing: 'bg-green-50 text-green-700 border-green-200',
    'Forward Bend': 'bg-blue-50 text-blue-700 border-blue-200',
    Backbend: 'bg-pink-50 text-pink-700 border-pink-200',
    Twist: 'bg-purple-50 text-purple-700 border-purple-200',
    Balance: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Inversion: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Restorative: 'bg-teal-50 text-teal-700 border-teal-200',
    未分類: 'bg-gray-50 text-gray-700 border-gray-200',
  }
  
  export const CHAKRAS = [
    'ムーラダーラ',
    'スヴァディシュターナ',
    'マニプーラ',
    'アナハタ',
    'ヴィシュッダ',
    'アージュニャー',
    'サハスラーラ',
  ]

  export const CHAKRA_LABELS: Record<string, string> = {
    ムーラダーラ: '① ムーラダーラ',
    スヴァディシュターナ: '② スヴァディシュターナ',
    マニプーラ: '③ マニプーラ',
    アナハタ: '④ アナハタ',
    ヴィシュッダ: '⑤ ヴィシュッダ',
    アージュニャー: '⑥ アージュニャー',
    サハスラーラ: '⑦ サハスラーラ',
  }
  
  export const CHAKRA_STYLES: Record<string, string> = {
    ムーラダーラ: 'bg-red-50 text-red-700 border-red-200',
    スヴァディシュターナ: 'bg-orange-50 text-orange-700 border-orange-200',
    マニプーラ: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    アナハタ: 'bg-green-50 text-green-700 border-green-200',
    ヴィシュッダ: 'bg-sky-50 text-sky-700 border-sky-200',
    アージュニャー: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    サハスラーラ: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  
  export const CHAKRA_DOT_COLORS: Record<string, string> = {
    ムーラダーラ: 'bg-red-500',
    スヴァディシュターナ: 'bg-orange-500',
    マニプーラ: 'bg-yellow-400',
    アナハタ: 'bg-green-500',
    ヴィシュッダ: 'bg-sky-500',
    アージュニャー: 'bg-indigo-500',
    サハスラーラ: 'bg-violet-500',
  }