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

// True only for a real calendar date (rejects 31-02-2026 etc.)
export function isRealISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const dt = new Date(iso + 'T00:00:00')
  return !isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === iso
}

export const isSundayISO = (iso) => isRealISO(iso) && new Date(iso + 'T00:00:00').getDay() === 0
