import { X } from 'lucide-react'
import DateField from './DateField'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad2 = (n) => String(n).padStart(2, '0')
const CUR_YEAR = new Date().getFullYear()
// Current year back 8 years — easy access to previous years.
const YEARS = Array.from({ length: 9 }, (_, i) => String(CUR_YEAR - i))

/**
 * Reusable date filter for admin list pages — a specific day, or a month and/or
 * year. filter shape: { day:'yyyy-MM-dd', month:'MM', year:'yyyy' }.
 * Pair with matchesDateFilter() from lib/format to filter the list.
 */
export default function AdminFilter({ filter, setFilter }) {
  const active = filter.day || filter.month || filter.year
  return (
    <div className="flex flex-wrap items-end justify-center gap-3 md:justify-start">
      <div>
        <label className="label text-xs">Filter by date</label>
        <div className="w-44">
          <DateField value={filter.day} onChange={(iso) => setFilter({ day: iso, month: '', year: '' })} />
        </div>
      </div>
      <div>
        <label className="label text-xs">Month</label>
        <select
          className="input h-[42px] w-40"
          value={filter.month || ''}
          onChange={(e) => setFilter({ day: '', month: e.target.value, year: filter.year || (e.target.value ? String(CUR_YEAR) : '') })}
        >
          <option value="">All</option>
          {MONTH_NAMES.map((m, i) => <option key={m} value={pad2(i + 1)}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="label text-xs">Year</label>
        <select
          className="input h-[42px] w-32"
          value={filter.year || ''}
          onChange={(e) => setFilter({ day: '', month: filter.month || '', year: e.target.value })}
        >
          <option value="">All</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {active && (
        <button
          type="button"
          onClick={() => setFilter({ day: '', month: '', year: '' })}
          className="btn-ghost h-[42px] px-3 text-sm"
        >
          <X size={15} /> Clear
        </button>
      )}
    </div>
  )
}
