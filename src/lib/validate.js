// Shared input validation/formatting helpers.

export const onlyDigits = (s) => String(s || '').replace(/\D/g, '')

// Normalise a pasted/typed mobile to the 10-digit local number. Handles the
// common cases where a copied number carries the +91 country code (12 digits)
// or a leading 0 — so pasting "917200043621" / "+91 72000 43621" / "07200043621"
// all become "7200043621". A genuine 10-digit number is left untouched.
export function normalizeMobile(s) {
  let d = onlyDigits(s)
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2)
  if (d.length > 10 && d.startsWith('0')) d = d.replace(/^0+/, '')
  return d.slice(0, 10)
}

// Indian mobile: 10 digits, starts 6-9 (country code stripped first).
export const isValidMobile = (s) => /^[6-9]\d{9}$/.test(normalizeMobile(s))

// ISO (yyyy-mm-dd) <-> display (dd-mm-yyyy)
export function isoToDisplay(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

export function displayToIso(disp) {
  const m = String(disp).match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!m) return ''
  const [, d, mo, y] = m
  return `${y}-${mo}-${d}`
}

// True only for a real calendar date (rejects 31-02-2026 etc.).
// Compares parts directly to avoid any timezone/UTC shift.
export function isRealISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [y, m, d] = iso.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

export function isSundayISO(iso) {
  if (!isRealISO(iso)) return false
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 0
}
