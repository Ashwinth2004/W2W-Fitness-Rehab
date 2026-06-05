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

export function fmtDate(value, pattern = 'dd MMM yyyy') {
  const d = toDate(value)
  return d ? format(d, pattern) : '—'
}

export function fmtDateTime(value) {
  const d = toDate(value)
  return d ? format(d, 'dd MMM yyyy, h:mm a') : '—'
}

export function fmt12h(t) {
  if (!t) return '—'
  const [h, m] = String(t).split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`
}

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')
