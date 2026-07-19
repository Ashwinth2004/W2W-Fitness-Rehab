// Admin-added exercise names, mapped to an exercise TYPE only (not a region) —
// per-browser, so a therapist can extend the built-in library on the fly from
// the "Add exercise" step. Merged into that type's checklist everywhere.
// Full CRUD (add/rename/delete) — managed from the "Add your own" popup.
const KEY = 'w2w_custom_exercises'

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
