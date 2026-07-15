// Date/number formatting helpers. Tolerant of Firestore Timestamps, JS Dates,
// ISO strings and "YYYY-MM-DD".
import { format, parseISO } from 'date-fns'

export function toDate(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate() // Firestore Timestamp
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    try { return value.length === 10 ? parseISO(value) : new Date(value) } catch { return null }
  }
  if (typeof value === 'number') return new Date(value)
  return null
}

export function fmtDate(value, pattern = 'dd-MM-yyyy') {
  const d = toDate(value)
  return d ? format(d, pattern) : '—'
}

export function fmtDateTime(value) {
  const d = toDate(value)
  return d ? format(d, 'dd-MM-yyyy, h:mm a') : '—'
}

export function fmt12h(t) {
  if (!t) return '—'
  const [h, m] = String(t).split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`
}

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')

// Add N days to an ISO date string, returning a new ISO string ('' if invalid).
export function addDaysISO(iso, days) {
  const d = toDate(iso)
  if (!d) return ''
  const nd = new Date(d)
  nd.setDate(nd.getDate() + days)
  return format(nd, 'yyyy-MM-dd')
}

// Normalise any date-like value to 'yyyy-MM-dd' (for filtering).
export const isoOf = (value) => { const d = toDate(value); return d ? format(d, 'yyyy-MM-dd') : '' }

// Tests an item's date against a filter.
// Shape: { day:'yyyy-MM-dd', month:'MM' (01–12), year:'yyyy' } — any combo.
export function matchesDateFilter(value, filter) {
  if (!filter) return true
  // Back-compat: month previously came as 'yyyy-MM'.
  let { day, month, year } = filter
  if (month && month.includes('-')) { const [y, m] = month.split('-'); year = year || y; month = m }
  if (!day && !month && !year) return true
  const iso = isoOf(value)
  if (!iso) return false
  if (day) return iso === day
  if (year && iso.slice(0, 4) !== year) return false
  if (month && iso.slice(5, 7) !== month) return false
  return true
}
