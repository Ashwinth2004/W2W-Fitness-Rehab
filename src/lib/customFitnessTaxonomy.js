// Admin-added Regions and Exercise Types for the Fitness module — per-browser,
// flat lists, merged into the built-in options everywhere the Fitness picker
// is used. Full CRUD (add/rename/delete) — managed from the "Add your own"
// popup. Kept entirely separate from Rehab's customTaxonomy.js (different
// localStorage keys) so a custom region/type never leaks between modules.
const REGION_KEY = 'w2w_fitness_custom_regions'
const TYPE_KEY = 'w2w_fitness_custom_types'

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

// Region-scoped custom types — added inline in the exercise picker for ONE
// region only, so they show up under that region and nowhere else. Stored as
// { [region]: [types] }, kept separate from the global TYPE_KEY list above.
const REGION_TYPE_KEY = 'w2w_fitness_custom_region_types'
function readMap(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {} }
  catch { return {} }
}
function writeMap(key, m) {
  try { localStorage.setItem(key, JSON.stringify(m)) } catch { /* ignore */ }
}
export function getCustomTypesForRegion(region) {
  const l = readMap(REGION_TYPE_KEY)[region]
  return Array.isArray(l) ? l : []
}
export function addCustomTypeForRegion(region, name) {
  const n = String(name || '').trim()
  if (!region || !n) return
  const map = readMap(REGION_TYPE_KEY)
  const list = Array.isArray(map[region]) ? map[region] : []
  if (!list.some((x) => x.toLowerCase() === n.toLowerCase())) { map[region] = [...list, n]; writeMap(REGION_TYPE_KEY, map) }
}
export function updateCustomTypeForRegion(region, oldName, newName) {
  const n = String(newName || '').trim()
  if (!region || !n) return
  const map = readMap(REGION_TYPE_KEY)
  if (!Array.isArray(map[region])) return
  map[region] = map[region].map((x) => (x === oldName ? n : x))
  writeMap(REGION_TYPE_KEY, map)
}
export function deleteCustomTypeForRegion(region, name) {
  const map = readMap(REGION_TYPE_KEY)
  if (!Array.isArray(map[region])) return
  map[region] = map[region].filter((x) => x !== name)
  writeMap(REGION_TYPE_KEY, map)
}
// Every region that currently has at least one region-scoped custom type.
export function getRegionsWithCustomTypes() {
  const map = readMap(REGION_TYPE_KEY)
  return Object.keys(map).filter((r) => Array.isArray(map[r]) && map[r].length > 0)
}
