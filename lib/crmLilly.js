export const lillyMemberships = { trial: "体験", ticket: "回数券", monthly: "月謝（通い放題）", unknown: "未確認" }
export const lillyServices = { yoga: "ヨガ", mat: "マットピラティス", machine: "マシンピラティス" }

export function usesLillyDisplay(customer) {
  const groups = customer.crm_customer_groups || []
  const active = groups.filter(({ archived_at }) => !archived_at)
  return active.some(({ group_code }) => group_code === "lilly") &&
    !active.some(({ group_code }) => group_code === "mglitter" || group_code === "nus")
}

export function customerDisplayName(customer) {
  return customer.nickname?.trim() || "名前未登録"
}

export function customerFormalName(customer) {
  return [customer.name?.trim(), customer.name_yomi?.trim()].filter(Boolean).join(" / ")
}
