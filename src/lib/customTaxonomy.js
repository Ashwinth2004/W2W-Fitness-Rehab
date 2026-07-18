// Admin-added Regions and Exercise Types — per-browser, flat lists, merged
// into the built-in options everywhere the Rehab & Exercises picker is used.
const REGION_KEY = 'w2w_custom_regions'
const TYPE_KEY = 'w2w_custom_types'

function readList(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v : []
  } catch { return [] }
}
function writeList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* ignore */ }
}
function addUnique(key, name) {
  const n = String(name || '').trim()
  if (!n) return
  const list = readList(key)
  if (!list.some((x) => x.toLowerCase() === n.toLowerCase())) writeList(key, [...list, n])
}

export const getCustomRegions = () => readList(REGION_KEY)
export const addCustomRegion = (name) => addUnique(REGION_KEY, name)
export const getCustomTypes = () => readList(TYPE_KEY)
export const addCustomType = (name) => addUnique(TYPE_KEY, name)
