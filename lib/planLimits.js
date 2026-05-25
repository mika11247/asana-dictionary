export const PLAN_LIMITS = {
  free: {
    asanas: 30,
    sequences: 3,
    sequenceItems: 100,
    imageUpload: true,
    pdfExport: false,
    share: false,
    templates: 'partial',
  },

  support: {
    asanas: 50,
    sequences: 10,
    sequenceItems: 300,
    imageUpload: true,
    pdfExport: true,
    share: false,
    templates: true,
  },

  special: {
    asanas: 100,
    sequences: 15,
    sequenceItems: 500,
    imageUpload: true,
    pdfExport: true,
    share: false,
    templates: true,
  },

  pro: {
    asanas: 500,
    sequences: 100,
    sequenceItems: 10000,
    imageUpload: true,
    pdfExport: true,
    share: true,
    templates: true,
  },
}

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}