export const PHOTO_PERMISSION_OPTIONS = [
  { value: "unknown", label: "❔ 未確認", tone: "bg-gray-100 text-gray-700" },
  { value: "ok", label: "🟢 OK", tone: "bg-emerald-50 text-emerald-800" },
  { value: "anonymous_only", label: "🟡 顔が分からなければOK", tone: "bg-amber-50 text-amber-800" },
  { value: "ng", label: "🔴 NG", tone: "bg-red-50 text-red-800" },
]

export function photoPermission(value) {
  return PHOTO_PERMISSION_OPTIONS.find((item) => item.value === value) || PHOTO_PERMISSION_OPTIONS[0]
}

export function formatDate(value) {
  if (!value) return "記録なし"
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  )
}

export function todayString() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function relationKey(item) {
  return `${item.location_id}:${item.service_id}`
}

export async function saveCrmRecord(client, customerId, values, recordId = null) {
  // SELECT results include joined display data; only editable columns belong in a write.
  const payload = {
    customer_id: Number(customerId),
    record_date: values.record_date,
    location_id: Number(values.location_id),
    service_id: Number(values.service_id),
    customer_note: values.customer_note,
    observation_note: values.observation_note,
  }
  const request = recordId == null
    ? client.from("crm_records").insert(payload)
    : client.from("crm_records").update(payload).eq("id", recordId).eq("customer_id", Number(customerId))
  const { data, error } = await request.select("id").single()
  if (error || data?.id == null) throw new Error("記録を保存できませんでした。")
  return data
}
