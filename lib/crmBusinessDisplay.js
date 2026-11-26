export function visibleCustomerBusinesses(customer, records, ownServiceResult) {
  const groups = customer.crm_customer_groups.filter(({ archived_at }) => !archived_at)
  const inGroup = (code) => groups.some(({ group_code }) => group_code === code)
  const explicitThirdPlace = inGroup("mglitter") && customer.crm_customer_group_brands.some(
    ({ business_code, archived_at }) => business_code === "third_place" && !archived_at,
  )
  const ownRecord = records.some(({ location_id, record_group_code, record_brand_code }) =>
    Number(location_id) === 2 || (record_group_code === "mglitter" && record_brand_code === "third_place"))

  // If the historical lookup failed, keep the row visible.
  if (!inGroup("lilly") || explicitThirdPlace || ownRecord || ownServiceResult !== false) {
    return customer.crm_customer_businesses
  }
  return customer.crm_customer_businesses.filter(({ business_code, source, stage, business_note }) =>
    business_code !== "third_place" || source !== "service" || stage !== "unconfirmed" || Boolean(business_note?.trim()))
}
