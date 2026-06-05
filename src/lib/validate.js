// Shared input validation/formatting helpers.

export const onlyDigits = (s) => String(s || '').replace(/\D/g, '')

// Indian mobile: 10 digits, starts 6-9.
export const isValidMobile = (s) => /^[6-9]\d{9}$/.test(onlyDigits(s))

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
