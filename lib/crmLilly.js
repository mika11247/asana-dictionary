export const lillyMemberships = { trial: "体験", ticket: "回数券", monthly: "月謝（通い放題）", unknown: "未確認" }
export const lillyServices = { yoga: "ヨガ", mat: "マットピラティス", machine: "マシンピラティス" }
export const isLegacyLilly = ({ location_id }) => String(location_id) === "1"

export function usesLillyDisplay(customer) {
  const groups = customer.crm_customer_groups || []
  const active = groups.filter(({ archived_at }) => !archived_at)
  return (active.some(({ group_code }) => group_code === "lilly") || customer.crm_customer_services?.some(isLegacyLilly)) &&
    !active.some(({ group_code }) => group_code === "mglitter" || group_code === "nus")
}

export function lillyDisplayName(customer) {
  return customer.nickname?.trim() || `呼び名未登録 #${customer.id}`
}
