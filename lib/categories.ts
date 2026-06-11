export const ASANA_TYPES = [
  // ジャンル横断
  'Pilates',
  'Training',
  'Rusie Dutton',

  // 姿勢・方向
  'Standing',
  'Seated',
  'Kneeling',
  'Prone',
  'Supine',

  'Forward Bend',
  'Backbend',
  'Side Bend',
  'Twist',

  // バランス
  'Balance',
  'Inversion',
  'Arm Balance',

  // 身体テーマ
  'Core',
  'Strength',
  'Mobility',
  'Hip Opening',

  // 回復・呼吸
  'Restorative',
  'Breath Meditation',
]

export const TYPE_LABELS: Record<
  string,
  { ja: string; en: string }
> = {
  Standing: {
    ja: '立位',
    en: 'Standing',
  },

  Seated: {
    ja: '座位',
    en: 'Seated',
  },

  Kneeling: {
    ja: '膝立ち',
    en: 'Kneeling',
  },

  Prone: {
    ja: 'うつ伏せ',
    en: 'Prone',
  },

  Supine: {
    ja: '仰向け',
    en: 'Supine',
  },

  'Forward Bend': {
    ja: '前屈',
    en: 'Forward Bend',
  },

  Backbend: {
    ja: '後屈',
    en: 'Backbend',
  },

  Twist: {
    ja: 'ねじり',
    en: 'Twist',
  },

  'Side Bend': {
  ja: '側屈',
  en: 'Side Bend',
},

  Balance: {
    ja: 'バランス',
    en: 'Balance',
  },

  Inversion: {
    ja: '逆転',
    en: 'Inversion',
  },

  'Arm Balance': {
    ja: 'アームバランス',
    en: 'Arm Balance',
  },

  Core: {
    ja: 'コア',
    en: 'Core',
  },

  Strength: {
    ja: '筋力',
    en: 'Strength',
  },

  Mobility: {
    ja: 'モビリティ',
    en: 'Mobility',
  },

  'Hip Opening': {
    ja: '股関節',
    en: 'Hip Opening',
  },

  Pilates: {
    ja: '🧘 ピラティス',
    en: 'Pilates',
  },

  Training: {
    ja: '🏋️ トレーニング',
    en: 'Training',
  },

  'Rusie Dutton': {
    ja: '🌿 ルーシーダットン',
    en: 'Rusie Dutton',
  },

  Restorative: {
    ja: 'リストラティブ',
    en: 'Restorative',
  },

  'Breath Meditation': {
    ja: '呼吸・瞑想',
    en: 'Breath Meditation',
  },

  未分類: {
    ja: '未分類',
    en: 'Uncategorized',
  },
}

export const TYPE_STYLES: Record<string, string> = {
  Standing:
    'bg-lime-50 text-lime-700 border-lime-200',

  Seated:
    'bg-emerald-50 text-emerald-700 border-emerald-200',

  Kneeling:
    'bg-green-50 text-green-700 border-green-200',

  Prone:
    'bg-teal-50 text-teal-700 border-teal-200',

  Supine:
    'bg-purple-50 text-purple-700 border-purple-200',

  'Forward Bend':
    'bg-sky-50 text-sky-700 border-sky-200',

  Backbend:
    'bg-pink-50 text-pink-700 border-pink-200',

  'Side Bend':
  'bg-cyan-50 text-cyan-700 border-cyan-200',

  Twist:
    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',

  Balance:
    'bg-yellow-50 text-yellow-700 border-yellow-200',

  Inversion:
    'bg-indigo-50 text-indigo-700 border-indigo-200',

  'Arm Balance':
    'bg-cyan-50 text-cyan-700 border-cyan-200',

  Core:
    'bg-orange-50 text-orange-700 border-orange-200',

  Strength:
    'bg-red-50 text-red-700 border-red-200',

  Mobility:
    'bg-blue-50 text-blue-700 border-blue-200',

  'Hip Opening':
    'bg-rose-50 text-rose-700 border-rose-200',

  Pilates:
    'bg-amber-100 text-amber-800 border-amber-300',

  Training:
    'bg-pink-100 text-pink-800 border-pink-300',

  'Rusie Dutton':
    'bg-green-100 text-green-800 border-green-300',

  Restorative:
    'bg-teal-50 text-teal-700 border-teal-200',

  'Breath Meditation':
    'bg-violet-50 text-violet-700 border-violet-200',

  未分類:
    'bg-gray-50 text-gray-700 border-gray-200',
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

  スヴァディシュターナ:
    '② スヴァディシュターナ',

  マニプーラ:
    '③ マニプーラ',

  アナハタ:
    '④ アナハタ',

  ヴィシュッダ:
    '⑤ ヴィシュッダ',

  アージュニャー:
    '⑥ アージュニャー',

  サハスラーラ:
    '⑦ サハスラーラ',
}

export const CHAKRA_STYLES: Record<string, string> = {
  ムーラダーラ:
    'bg-red-50 text-red-700 border-red-200',

  スヴァディシュターナ:
    'bg-orange-50 text-orange-700 border-orange-200',

  マニプーラ:
    'bg-yellow-50 text-yellow-700 border-yellow-200',

  アナハタ:
    'bg-green-50 text-green-700 border-green-200',

  ヴィシュッダ:
    'bg-sky-50 text-sky-700 border-sky-200',

  アージュニャー:
    'bg-indigo-50 text-indigo-700 border-indigo-200',

  サハスラーラ:
    'bg-violet-50 text-violet-700 border-violet-200',
}

export const CHAKRA_DOT_COLORS: Record<string, string> = {
  ムーラダーラ: 'bg-red-500',

  スヴァディシュターナ:
    'bg-orange-500',

  マニプーラ:
    'bg-yellow-400',

  アナハタ:
    'bg-green-500',

  ヴィシュッダ:
    'bg-sky-500',

  アージュニャー:
    'bg-indigo-500',

  サハスラーラ:
    'bg-violet-500',
}