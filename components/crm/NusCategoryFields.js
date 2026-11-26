import { nusCategoryLabels } from "@/lib/crmNus"

export default function NusCategoryFields({ value, onChange }) {
  const inputClass = "mt-1 block min-h-11 w-full rounded-xl border border-slate-300 p-2 text-base"
  return <div className="space-y-2">
    <label className="block text-sm font-semibold">NUS区分
      <select className={inputClass} value={value.category || ""} onChange={(event) =>
        onChange({ category: event.target.value, other_label: "" })}>
        <option value="">未設定</option>
        {Object.entries(nusCategoryLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select>
    </label>
    {value.category === "other" && <label className="block text-sm font-semibold">その他のNUS区分
      <input className={inputClass} required maxLength={200} value={value.other_label || ""}
        onChange={(event) => onChange({ ...value, other_label: event.target.value })} />
    </label>}
  </div>
}
