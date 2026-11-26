import { interestLabels, progressFields, progressLabels, tokyoDatetime } from "@/lib/crmNus"

const inputClass = "mt-1 block w-full rounded-xl border border-slate-300 p-2 text-base"

function Options({ labels }) {
  return Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)
}

export default function NusDetailFields({ value, onChange }) {
  const updateProfile = (values) => onChange({ ...value, ...values })
  return <>
  {[["product", "商品"], ["business", "ビジネス"]].map(([key, label]) => <div className="space-y-2" key={key}>
    <label className="block text-sm">{label}への関心
      <select className={inputClass} value={value[`${key}_interest`]} onChange={(event) => updateProfile({ [`${key}_interest`]: event.target.value })}>
        <Options labels={interestLabels} />
      </select>
    </label>
    <label className="block text-sm">{label}への関心メモ（任意）
      <textarea className={inputClass} rows={2} value={value[`${key}_note`] || ""} onChange={(event) => updateProfile({ [`${key}_note`]: event.target.value })} />
    </label>
  </div>)}
  {progressFields.map(([key, label]) => <div className="space-y-2" key={key}>
    <label className="block text-sm">{label}
      <select className={inputClass} value={value[`${key}_status`]} onChange={(event) => updateProfile({
        [`${key}_status`]: event.target.value,
        [`${key}_on`]: event.target.value === "done" ? value[`${key}_on`] : null,
      })}><Options labels={progressLabels} /></select>
    </label>
    {value[`${key}_status`] === "done" && <label className="block text-sm">{label}の初回実施日（任意）
      <input className={inputClass} type="date" max={tokyoDatetime(new Date()).slice(0, 10)} value={value[`${key}_on`] || ""}
        onChange={(event) => updateProfile({ [`${key}_on`]: event.target.value || null })} />
    </label>}
  </div>)}
  </>
}
