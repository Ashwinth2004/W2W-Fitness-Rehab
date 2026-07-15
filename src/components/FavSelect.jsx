import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import { useFavorites } from '../lib/useFavorites'

// Single-select dropdown (string options) with a per-option favorite star —
// favorited options sort to the top. Used throughout Rehab & Exercises so the
// admin's most-used picks (a region, a rep count, a rest interval…) are one
// click away instead of buried in a long list.
export default function FavSelect({ favKey, value, options, onChange, placeholder = '— Select —', disabled, id }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const { isFav, toggle, sortWithFavs } = useFavorites(favKey)
  const sorted = sortWithFavs(options)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        id={id} type="button" disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <ul className="max-h-60 overflow-y-auto py-1 text-sm">
            {sorted.length === 0 && <li className="px-3 py-2 text-slate-400">No options.</li>}
            {sorted.map((o) => (
              <li key={o} className="flex items-center gap-0.5 pr-1">
                <button
                  type="button" title={isFav(o) ? 'Unfavorite' : 'Mark as favorite'}
                  onClick={(e) => { e.stopPropagation(); toggle(o) }}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-300 hover:bg-amber-50 hover:text-amber-400"
                >
                  <Star size={13} className={isFav(o) ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
                <button
                  type="button" onClick={() => { onChange(o); setOpen(false) }}
                  className={`flex-1 truncate rounded px-1 py-1.5 text-left ${value === o ? 'font-semibold text-brand-700' : 'text-slate-700'} hover:bg-brand-50`}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
