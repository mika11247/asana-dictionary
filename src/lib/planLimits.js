export const PLAN_LIMITS = {
  free: {
    asanas: 30,
    sequences: 3,
    sequenceItems: 100,
    imageUpload: true,
    pdfExport: false,
    share: false,
    templates: false,
  },

  special: {
    asanas: 50,
    sequences: 10,
    sequenceItems: 300,
    imageUpload: true,
    pdfExport: false,
    share: false,
    templates: true,
  },

  pro: {
    asanas: Infinity,
    sequences: Infinity,
    sequenceItems: Infinity,
    imageUpload: true,
    pdfExport: true,
    share: true,
    templates: true,
  },
}

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}