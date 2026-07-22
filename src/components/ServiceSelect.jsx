import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Pencil, Trash2, Check, X, Plus, Star } from 'lucide-react'
import { addServiceCharge, updateServiceCharge, deleteServiceCharge, setServiceChargeFavorite } from '../lib/firestore'
import { PRESET_SERVICE_CHARGES } from '../lib/constants'

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN')
const digits = (s) => String(s).replace(/\D/g, '')

// Service-charge picker: choose a saved service (auto-fills its amount and, for
// rehab/fitness packages, its class count), add new ones, rename/re-price/
// delete existing ones inline, and star favorites to pin them to the top.
// `services` is [{ id, name, amount, classes?, favorite? }] from watchServiceCharges.
// onChange is called as onChange(name, amount, classes) — amount/classes are
// undefined for a free-typed name.
export default function ServiceSelect({ value, services = [], onChange, showClasses = true }) {
  const [open, setOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addAmt, setAddAmt] = useState('')
  const [addClasses, setAddClasses] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAmt, setEditAmt] = useState('')
  const [editClasses, setEditClasses] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) { setOpen(false); setEditId(null) } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Show saved services (favorites first); if none saved yet, show the presets
  // so the dropdown is never empty (they get persisted once seeded / rules published).
  const base = services.length ? services : PRESET_SERVICE_CHARGES
  const list = [...base].sort((a, b) => (a.favorite === b.favorite ? 0 : a.favorite ? -1 : 1))

  const pick = (item) => { onChange(item.name, item.amount, item.classes); setOpen(false) }

  async function add() {
    const n = addName.trim(); if (!n) return
    const extra = addClasses ? { classes: Number(addClasses) } : {}
    try { await addServiceCharge(n, addAmt, extra) } catch (_) { /* rules may need publishing */ }
    onChange(n, Number(addAmt) || 0, extra.classes)
    setAddName(''); setAddAmt(''); setAddClasses('')
  }
  async function saveEdit(c) {
    const n = editName.trim(); if (!n) return
    const extra = editClasses ? { classes: Number(editClasses) } : { classes: null }
    try { await updateServiceCharge(c.id, n, editAmt, extra) } catch (_) {}
    if (value === c.name) onChange(n, Number(editAmt) || 0, extra.classes ?? undefined)
    setEditId(null)
  }
  async function remove(c) {
    if (!window.confirm(`Delete service "${c.name}"?`)) return
    try { await deleteServiceCharge(c.id) } catch (_) {}
    if (value === c.name) onChange('', undefined, undefined)
  }
  async function toggleFavorite(c, e) {
    e.stopPropagation()
    try { await setServiceChargeFavorite(c.id, !c.favorite) } catch (_) {}
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="input flex items-center justify-between gap-2 text-left">
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || '— Select service —'}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-[23rem] max-w-[92vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <ul className="max-h-72 overflow-y-auto py-1 text-sm">
            {list.length === 0 && <li className="px-3 py-2 text-slate-400">No services yet.</li>}
            {list.map((c) => (
              <li key={c.id || c.name} className="flex items-center justify-between gap-0.5 pr-1">
                {editId === c.id ? (
                  <div className="flex w-full flex-wrap items-center gap-1.5 px-2 py-2">
                    <input className="input h-8 min-w-[8rem] flex-1 text-sm" value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} placeholder="Service" />
                    <input className="input h-8 w-20 shrink-0 text-sm" inputMode="numeric" value={editAmt} onChange={(e) => setEditAmt(digits(e.target.value).slice(0, 8))} placeholder="Rs." />
                    {showClasses && <input className="input h-8 w-20 shrink-0 text-sm" inputMode="numeric" value={editClasses} onChange={(e) => setEditClasses(digits(e.target.value).slice(0, 3))} placeholder="Classes" />}
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button type="button" onClick={() => saveEdit(c)} className="p-1 text-green-600"><Check size={15} /></button>
                      <button type="button" onClick={() => setEditId(null)} className="p-1 text-slate-400"><X size={15} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    {c.id && (
                      <button
                        type="button" title={c.favorite ? 'Unfavorite' : 'Mark as favorite'} onClick={(e) => toggleFavorite(c, e)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-300 hover:bg-amber-50 hover:text-amber-400"
                      >
                        <Star size={14} className={c.favorite ? 'fill-amber-400 text-amber-400' : ''} />
                      </button>
                    )}
                    <button
                      type="button" onClick={() => pick(c)}
                      className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-2 text-left ${value === c.name ? 'font-semibold text-brand-700' : 'text-slate-700'} hover:bg-brand-50`}
                    >
                      <span className="min-w-0 truncate">{c.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{rs(c.amount)}{c.classes ? ` · ${c.classes} class${c.classes > 1 ? 'es' : ''}` : ''}</span>
                    </button>
                    {c.id && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" title="Edit" onClick={() => { setEditId(c.id); setEditName(c.name); setEditAmt(String(c.amount ?? '')); setEditClasses(c.classes != null ? String(c.classes) : '') }} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={13} /></button>
                        <button type="button" title="Delete" onClick={() => remove(c)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 p-2">
            <input className="input h-9 min-w-[8rem] flex-1 text-sm" value={addName} placeholder="Add service…" onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
            <input className="input h-9 w-20 shrink-0 text-sm" inputMode="numeric" value={addAmt} placeholder="Rs." onChange={(e) => setAddAmt(digits(e.target.value).slice(0, 8))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
            {showClasses && <input className="input h-9 w-20 shrink-0 text-sm" inputMode="numeric" value={addClasses} placeholder="Classes" onChange={(e) => setAddClasses(digits(e.target.value).slice(0, 3))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />}
            <button type="button" onClick={add} className="btn-outline shrink-0 px-2.5 py-1.5 text-xs"><Plus size={14} /> Add</button>
          </div>
        </div>
      )}
    </div>
  )
}
