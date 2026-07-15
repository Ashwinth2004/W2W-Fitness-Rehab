import { useCallback, useSyncExternalStore } from 'react'

// Per-browser starred options for the Rehab & Exercises dropdowns/chips
// (region, type, sets, reps, hold, resistance, frequency, rest, exercise
// names, progression, pay mode). Favorited values sort to the top wherever
// they're used, and the MOST RECENTLY favorited value is exposed as `latest`
// so new entries can default to it. Backed by a tiny shared store (not just
// per-component state) so favoriting in one field is immediately reflected
// everywhere else that reads the same key — no remount needed.
const PREFIX = 'w2w_fav_'
const listeners = new Map() // key -> Set<() => void>
const cache = new Map() // key -> string[] (favorited values, oldest first)

function read(key) {
  if (cache.has(key)) return cache.get(key)
  let arr = []
  try {
    const raw = JSON.parse(localStorage.getItem(PREFIX + key) || '[]')
    if (Array.isArray(raw)) arr = raw
  } catch { /* ignore */ }
  cache.set(key, arr)
  return arr
}

function write(key, arr) {
  cache.set(key, arr)
  try { localStorage.setItem(PREFIX + key, JSON.stringify(arr)) } catch { /* ignore */ }
  listeners.get(key)?.forEach((fn) => fn())
}

function subscribe(key, cb) {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(cb)
  return () => listeners.get(key)?.delete(cb)
}

const EMPTY = []

export function useFavorites(key) {
  const favs = useSyncExternalStore(
    (cb) => subscribe(key, cb),
    () => read(key),
    () => EMPTY
  )

  const toggle = useCallback((value) => {
    const cur = read(key)
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
    write(key, next)
  }, [key])

  const isFav = useCallback((value) => favs.includes(value), [favs])

  // Most recently favorited value for this key (null if none).
  const latest = favs.length ? favs[favs.length - 1] : null

  // Stable sort: favorites first, original relative order preserved otherwise.
  const sortWithFavs = useCallback((arr, getVal = (x) => x) => {
    return [...arr].sort((a, b) => {
      const fa = favs.includes(getVal(a)), fb = favs.includes(getVal(b))
      return fa === fb ? 0 : fa ? -1 : 1
    })
  }, [favs])

  return { favs, isFav, toggle, sortWithFavs, latest }
}
