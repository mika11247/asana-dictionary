export const groupLabels = { mglitter: "M.glitter", nus: "NUS", lilly: "Lilly" }

export async function saveCrmCustomerMemberships(client, customerId, customer, relations, selection) {
  const { data, error } = await client.rpc("crm_save_customer_memberships", {
    target_customer_id: customerId,
    customer,
    relations: relations.map(({ location_id, service_id, membership_type }) => ({ location_id, service_id, membership_type })),
    selected_groups: selection.groups,
    selected_brands: selection.brands,
  })
  if (error || data == null) throw new Error("顧客と所属を保存できませんでした。入力内容を確認してください。")
  return data
}

export async function findCrmCustomerCandidates(client, form) {
  const terms = [...new Set([form.name, form.name_yomi, form.nickname].map((value) => value.trim()).filter(Boolean))]
  const matches = await Promise.all(terms.flatMap((term) => {
    const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`
    return ["name", "name_yomi", "nickname"].map((field) =>
      client.from("crm_customers").select("id, name, name_yomi, nickname, archived").ilike(field, pattern).order("id").limit(5))
  }))
  if (matches.some(({ error }) => error)) throw new Error("既存顧客を検索できませんでした。再試行してください。")
  return [...new Map(matches.flatMap(({ data }) => data.map((customer) => [customer.id, customer]))).values()]
}
