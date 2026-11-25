import { lillyMemberships, lillyServices } from "@/lib/crmLilly"

export default function LillyFields({ value, onChange, search = false }) {
  return <div className="space-y-3">
    <label className="block text-sm font-semibold">Lillyの会員種別
      <select value={value.membership ?? (search ? "" : "unknown")}
        onChange={(event) => onChange({ ...value, membership: event.target.value })}
        className="mt-1 block min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-base">
        {search && <option value="">すべて</option>}
        {Object.entries(lillyMemberships).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
    <fieldset>
      <legend className="text-sm font-semibold">Lillyのサービス（複数選択可）</legend>
      {Object.entries(lillyServices).map(([code, name]) => {
        const services = value.services || []
        const checked = services.includes(code)
        return <label key={code} className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={() => onChange({
            ...value, services: checked ? services.filter((item) => item !== code) : [...services, code],
          })} />
          {name}
        </label>
      })}
    </fieldset>
  </div>
}
