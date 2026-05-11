export const PLAN_LIMITS = {
    free: {
      asanas: 50,
      sequences: 3,
      sequenceItems: 100,
      imageUpload: true,
      pdfExport: false,
      share: false,
      templates: false,
    },
  
    special: {
      asanas: 300,
      sequences: 20,
      sequenceItems: 1000,
      imageUpload: true,
      pdfExport: true,
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