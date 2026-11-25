export const interestLabels = { unknown: "不明", interested: "興味あり", considering: "検討中", not_interested: "興味なし" }
export const progressLabels = { unknown: "不明", not_done: "未実施", done: "実施済み" }
export const progressFields = [
  ["disclosure", "看板出し"],
  ["product_proposal", "商品提案"],
  ["business_proposal", "ビジネス提案"],
]
export const preferenceLabels = {
  global: "M.glitter全事業",
  nus_all: "NUS全般",
  nus_business: "NUSビジネス勧誘",
  nus_product: "NUS商品案内",
}
export const decisionLabels = { refuse: "拒否", allow: "許可", withdraw: "撤回（未確認に戻す）" }

export const emptyNusProfile = {
  product_interest: "unknown", product_note: "",
  business_interest: "unknown", business_note: "",
  disclosure_status: "unknown", disclosure_on: null,
  product_proposal_status: "unknown", product_proposal_on: null,
  business_proposal_status: "unknown", business_proposal_on: null,
}

export function contactRestrictions(preferences) {
  const refused = preferences.filter(({ decision }) => decision === "refuse")
  const applies = (...scopes) => refused.some(({ scope }) => scopes.includes(scope))
  return {
    business: applies("global", "nus_all", "nus_business"),
    product: applies("global", "nus_all", "nus_product"),
    administrative: refused.some(({ scope, coverage }) =>
      (scope === "global" || scope === "nus_all") && coverage === "all_contact"),
  }
}

export function tokyoDatetime(value, seconds = false) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
  }).format(new Date(value)).replace(" ", "T")
}

export function listNusRelationshipTypes(client) {
  return client.from("crm_nus_relationship_types").select("code, label, is_active").order("sort_order")
}
