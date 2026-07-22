// Admin-added exercise names for the Fitness module, mapped to an exercise
// TYPE only (not a region) — per-browser, so a trainer can extend the
// built-in library on the fly from the "Add exercise" step. Merged into that
// type's checklist everywhere. Full CRUD (add/rename/delete) — managed from
// the "Add your own" popup.
//
// Kept entirely separate from Rehab's customExercises.js (different
// localStorage keys) so a custom item added in one module never bleeds into
// the other, even where region/type names happen to overlap (e.g. "Shoulder").
const KEY = 'w2w_fitness_custom_exercises'

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function writeAll(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)) } catch { /* ignore */ }
}

export function getCustomExercises(type) {
  if (!type) return []
  const list = readAll()[type]
  return Array.isArray(list) ? list : []
}

export function addCustomExercise(type, name) {
  const n = String(name || '').trim()
  if (!type || !n) return
  const all = readAll()
  const list = Array.isArray(all[type]) ? all[type] : []
  if (!list.some((x) => x.toLowerCase() === n.toLowerCase())) all[type] = [...list, n]
  writeAll(all)
}

export function updateCustomExercise(type, oldName, newName) {
  const n = String(newName || '').trim()
  if (!type || !n) return
  const all = readAll()
  const list = Array.isArray(all[type]) ? all[type] : []
  all[type] = list.map((x) => (x === oldName ? n : x))
  writeAll(all)
}

export function deleteCustomExercise(type, name) {
  if (!type) return
  const all = readAll()
  const list = Array.isArray(all[type]) ? all[type] : []
  all[type] = list.filter((x) => x !== name)
  writeAll(all)
}

// Region + type scoped custom exercises — added inline in the picker under a
// specific region AND type, so they appear only there. Stored under a
// combined "region type" key, separate from the type-only store above.
const RT_KEY = 'w2w_fitness_custom_rt_exercises'
const rtKey = (region, type) => `${region} ${type}`
function readRT() {
  try { return JSON.parse(localStorage.getItem(RT_KEY) || '{}') } catch { return {} }
}
function writeRT(obj) {
  try { localStorage.setItem(RT_KEY, JSON.stringify(obj)) } catch { /* ignore */ }
}
export function getCustomExercisesForRegionType(region, type) {
  if (!region || !type) return []
  const list = readRT()[rtKey(region, type)]
  return Array.isArray(list) ? list : []
}
export function addCustomExerciseForRegionType(region, type, name) {
  const n = String(name || '').trim()
  if (!region || !type || !n) return
  const all = readRT()
  const k = rtKey(region, type)
  const list = Array.isArray(all[k]) ? all[k] : []
  if (!list.some((x) => x.toLowerCase() === n.toLowerCase())) { all[k] = [...list, n]; writeRT(all) }
}
export function updateCustomExerciseForRegionType(region, type, oldName, newName) {
  const n = String(newName || '').trim()
  if (!region || !type || !n) return
  const all = readRT()
  const k = rtKey(region, type)
  const list = Array.isArray(all[k]) ? all[k] : []
  all[k] = list.map((x) => (x === oldName ? n : x))
  writeRT(all)
}
export function deleteCustomExerciseForRegionType(region, type, name) {
  if (!region || !type) return
  const all = readRT()
  const k = rtKey(region, type)
  const list = Array.isArray(all[k]) ? all[k] : []
  all[k] = list.filter((x) => x !== name)
  writeRT(all)
}
// When a region-scoped TYPE is renamed, move its exercises to the new key so
// they aren't orphaned. Merges into any existing exercises at the new key.
export function renameRegionTypeExercises(region, oldType, newType) {
  if (!region || !oldType || !newType || oldType === newType) return
  const all = readRT()
  const oldK = rtKey(region, oldType)
  if (!(oldK in all)) return
  const newK = rtKey(region, newType)
  const merged = Array.isArray(all[newK]) ? [...all[newK]] : []
  for (const x of all[oldK] || []) if (!merged.some((m) => m.toLowerCase() === x.toLowerCase())) merged.push(x)
  all[newK] = merged
  delete all[oldK]
  writeRT(all)
}
// When a region-scoped TYPE is deleted, drop its exercises too.
export function deleteRegionTypeExercises(region, type) {
  if (!region || !type) return
  const all = readRT()
  delete all[rtKey(region, type)]
  writeRT(all)
}
