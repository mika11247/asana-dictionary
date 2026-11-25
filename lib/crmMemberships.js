import { isLegacyLilly, lillyDisplayName, usesLillyDisplay } from "./crmLilly"

export const groupLabels = { mglitter: "M.glitter", nus: "NUS", lilly: "Lilly" }

export async function saveCrmCustomerMemberships(client, customerId, customer, relations, selection) {
  const args = {
    customer,
    relations: relations.filter((item) => !isLegacyLilly(item)).map(({ location_id, service_id, membership_type }) => ({ location_id, service_id, membership_type })),
    selected_groups: selection.groups,
    selected_brands: selection.brands,
  }
  const { data, error } = customerId == null && selection.lilly
    ? await client.rpc("crm_create_customer_with_lilly", { ...args, membership_code: selection.lilly.membership, selected_services: selection.lilly.services })
    : await client.rpc("crm_save_customer_memberships", { ...args, target_customer_id: customerId })
  if (error || data == null) throw new Error("顧客と所属を保存できませんでした。入力内容を確認してください。")
  return data
}

export async function findCrmCustomerCandidates(client, form, lillyOnly) {
  const terms = [...new Set([form.name, form.name_yomi, form.nickname].map((value) => value.trim()).filter(Boolean))]
  const matches = await Promise.all(terms.flatMap((term) => {
    const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`
    return (lillyOnly ? ["nickname"] : ["name", "name_yomi", "nickname"]).map((field) =>
      client.from("crm_customers").select("id, name, name_yomi, nickname, archived, crm_customer_groups(group_code, archived_at), crm_customer_services(location_id)").ilike(field, pattern).order("id").limit(5))
  }))
  if (matches.some(({ error }) => error)) throw new Error("既存顧客を検索できませんでした。再試行してください。")
  return [...new Map(matches.flatMap(({ data }) => data.map((customer) => [customer.id, customer]))).values()]
    .map((customer) => lillyOnly || usesLillyDisplay(customer)
      ? { id: customer.id, name: lillyDisplayName(customer), archived: customer.archived, lillyDisplay: true }
      : customer)
}
