import { X } from 'lucide-react'
import DateField from './DateField'

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
        <input
          type="month"
          className="input h-[42px] w-40"
          value={filter.month}
          onChange={(e) => setFilter({ day: '', month: e.target.value })}
        />
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
