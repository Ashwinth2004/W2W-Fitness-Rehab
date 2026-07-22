// Admin-added Fitness goal options — per-browser, merged into FITNESS_GOALS
// everywhere the goals picker is shown, so an admin can extend the list
// straight from client intake without touching code.
const KEY = 'w2w_fitness_custom_goals'

function readList() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch { return [] }
}
function writeList(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

export const getCustomFitnessGoals = () => readList()

export function addCustomFitnessGoal(name) {
  const n = String(name || '').trim()
  if (!n) return
  const list = readList()
  if (!list.some((x) => x.toLowerCase() === n.toLowerCase())) writeList([...list, n])
}

export function deleteCustomFitnessGoal(name) {
  writeList(readList().filter((x) => x !== name))
}
