import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Pencil, Trash2, Check, X, UserPlus } from 'lucide-react'
import { watchTherapists, createTherapist, updateTherapist, deleteTherapist } from '../lib/firestore'
import { FOUNDERS } from '../lib/constants'

// Therapist picker: select from founders + saved therapists, add new ones, and
// edit/delete the saved ones inline. Keyboard: ↑/↓ to move, Enter to select,
// Esc to close. Renders the menu in a portal so it's never clipped by a modal.
export default function TherapistSelect({ value, onChange, placeholder = '— Select therapist —', id, invalid }) {
  const [therapists, setTherapists] = useState([])
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [adding, setAdding] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [active, setActive] = useState(-1)
  const btnRef = useRef(null)
  const popRef = useRef(null)

  useEffect(() => watchTherapists(setTherapists), [])

  const founders = FOUNDERS.map((f) => f.name)
  const options = [...founders, ...therapists.map((t) => t.name)]

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const b = btnRef.current
      if (!b) return
      const r = b.getBoundingClientRect()
      const popH = popRef.current?.offsetHeight || 320
      const gap = 6
      let top = r.bottom + gap
      if (top + popH > window.innerHeight - 8 && r.top - gap - popH > 8) top = r.top - gap - popH
      setPos({ top, left: r.left, width: r.width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, therapists, editId])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return
      if (popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function choose(name) { onChange(name); setOpen(false); setActive(-1) }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); setOpen(true); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && options[active]) choose(options[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }

  async function add() {
    const n = adding.trim(); if (!n) return
    await createTherapist(n); onChange(n); setAdding('')
  }
  async function saveEdit(t) {
    const n = editName.trim(); if (!n) return
    await updateTherapist(t.id, n)
    if (value === t.name) onChange(n)
    setEditId(null)
  }
  async function remove(t) {
    if (!window.confirm(`Delete therapist "${t.name}"?`)) return
    await deleteTherapist(t.id)
    if (value === t.name) onChange('')
  }

  const item = (name, i, extra) => (
    <button
      type="button"
      onMouseEnter={() => setActive(i)}
      onClick={() => choose(name)}
      className={`${extra || 'w-full px-3'} py-2 text-left ${active === i ? 'bg-brand-50' : ''} ${value === name ? 'font-semibold text-brand-700' : 'text-slate-700'} hover:bg-brand-50`}
    >
      {name}
    </button>
  )

  const popover = (
    <div
      ref={popRef}
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width ?? 240 }}
      className="z-[200] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      <ul className="max-h-56 overflow-y-auto py-1 text-sm">
        {founders.map((n, i) => <li key={n}>{item(n, i)}</li>)}
        {therapists.map((t, j) => {
          const i = founders.length + j
          return (
            <li key={t.id} className="flex items-center justify-between gap-1 pr-1">
              {editId === t.id ? (
                <div className="flex w-full items-center gap-1 px-2 py-1">
                  <input
                    className="input h-8 text-sm" value={editName} autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(t) } if (e.key === 'Escape') setEditId(null) }}
                  />
                  <button type="button" onClick={() => saveEdit(t)} className="p-1 text-green-600"><Check size={15} /></button>
                  <button type="button" onClick={() => setEditId(null)} className="p-1 text-slate-400"><X size={15} /></button>
                </div>
              ) : (
                <>
                  {item(t.name, i, 'flex-1 px-3')}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button type="button" title="Edit" onClick={() => { setEditId(t.id); setEditName(t.name) }} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={13} /></button>
                    <button type="button" title="Delete" onClick={() => remove(t)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </>
              )}
            </li>
          )
        })}
        {options.length === 0 && <li className="px-3 py-2 text-slate-400">No therapists yet.</li>}
      </ul>
      <div className="flex gap-1.5 border-t border-slate-100 p-2">
        <input
          className="input h-9 text-sm" value={adding} placeholder="Add therapist…"
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button type="button" onClick={add} className="btn-outline shrink-0 px-2.5 py-1.5 text-xs"><UserPlus size={14} /> Add</button>
      </div>
    </div>
  )

  return (
    <>
      <button ref={btnRef} id={id} type="button" onClick={() => setOpen((v) => !v)} onKeyDown={onKeyDown} className={`input flex items-center justify-between gap-2 text-left ${invalid ? '!border-red-400 ring-2 ring-red-200' : ''}`}>
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(popover, document.body)}
    </>
  )
}
