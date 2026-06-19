import { X } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import DateField from './DateField'

// Last 18 months as { value:'yyyy-MM', label:'June 2026' } for a clean dropdown
// (replaces the browser's native month input, which shows an ugly "----" state).
const MONTHS = Array.from({ length: 18 }, (_, i) => {
  const d = subMonths(new Date(), i)
  return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') }
})

/**
 * Reusable date + month filter for admin list pages.
 * filter shape: { day: 'yyyy-mm-dd', month: 'yyyy-mm' } (use one at a time).
 * Pair with matchesDateFilter() from lib/format to filter the list.
 */
export default function AdminFilter({ filter, setFilter }) {
  const active = filter.day || filter.month
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label text-xs">Filter by date</label>
        <div className="w-44">
          <DateField value={filter.day} onChange={(iso) => setFilter({ day: iso, month: '' })} />
        </div>
      </div>
      <div>
        <label className="label text-xs">Filter by month</label>
        <select
          className="input h-[42px] w-44"
          value={filter.month}
          onChange={(e) => setFilter({ day: '', month: e.target.value })}
        >
          <option value="">All months</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      {active && (
        <button
          type="button"
          onClick={() => setFilter({ day: '', month: '' })}
          className="btn-ghost h-[42px] px-3 text-sm"
        >
          <X size={15} /> Clear
        </button>
      )}
    </div>
  )
}
