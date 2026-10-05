import { photoPermission } from "@/lib/crm"

export default function PhotoPermissionBadge({ value, prominent = false }) {
  const item = photoPermission(value)
  return (
    <span className={`inline-flex rounded-full font-semibold ${item.tone} ${prominent ? "px-4 py-2 text-base" : "px-3 py-1 text-sm"}`}>
      {item.label}
    </span>
  )
}
