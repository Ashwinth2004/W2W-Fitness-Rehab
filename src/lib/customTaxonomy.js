// Admin-added Regions and Exercise Types — per-browser, flat lists, merged
// into the built-in options everywhere the Rehab & Exercises picker is used.
// Full CRUD (add/rename/delete) — managed from the "Add your own" popup.
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
function renameOne(key, oldName, newName) {
  const n = String(newName || '').trim()
  if (!n) return
  writeList(key, readList(key).map((x) => (x === oldName ? n : x)))
}
function removeOne(key, name) {
  writeList(key, readList(key).filter((x) => x !== name))
}

export const getCustomRegions = () => readList(REGION_KEY)
export const addCustomRegion = (name) => addUnique(REGION_KEY, name)
export const updateCustomRegion = (oldName, newName) => renameOne(REGION_KEY, oldName, newName)
export const deleteCustomRegion = (name) => removeOne(REGION_KEY, name)

export const getCustomTypes = () => readList(TYPE_KEY)
export const addCustomType = (name) => addUnique(TYPE_KEY, name)
export const updateCustomType = (oldName, newName) => renameOne(TYPE_KEY, oldName, newName)
export const deleteCustomType = (name) => removeOne(TYPE_KEY, name)
