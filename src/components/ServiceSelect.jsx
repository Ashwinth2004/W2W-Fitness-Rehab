import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Pencil, Trash2, Check, X, Plus } from 'lucide-react'
import { addServiceCharge, updateServiceCharge, deleteServiceCharge } from '../lib/firestore'
import { PRESET_SERVICE_CHARGES } from '../lib/constants'

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN')

// Service-charge picker: choose a saved service (auto-fills its amount), add new
// ones with an amount, and rename/re-price/delete existing ones inline.
// `services` is [{ id, name, amount }] from watchServiceCharges. onChange is
// called as onChange(name, amount) — amount is undefined for a free-typed name.
// Falls back to the built-in presets for selection if none are saved yet.
export default function ServiceSelect({ value, services = [], onChange }) {
  const [open, setOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addAmt, setAddAmt] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAmt, setEditAmt] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) { setOpen(false); setEditId(null) } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Show saved services; if none saved yet, show the presets so the dropdown is
  // never empty (they get persisted once seeded / rules are published).
  const list = services.length ? services : PRESET_SERVICE_CHARGES
  const digits = (s) => String(s).replace(/\D/g, '').slice(0, 8)

  const pick = (item) => { onChange(item.name, item.amount); setOpen(false) }

  async function add() {
    const n = addName.trim(); if (!n) return
    try { await addServiceCharge(n, addAmt) } catch (_) { /* rules may need publishing */ }
    onChange(n, Number(addAmt) || 0)
    setAddName(''); setAddAmt('')
  }
  async function saveEdit(c) {
    const n = editName.trim(); if (!n) return
    try { await updateServiceCharge(c.id, n, editAmt) } catch (_) {}
    if (value === c.name) onChange(n, Number(editAmt) || 0)
    setEditId(null)
  }
  async function remove(c) {
    if (!window.confirm(`Delete service "${c.name}"?`)) return
    try { await deleteServiceCharge(c.id) } catch (_) {}
    if (value === c.name) onChange('', undefined)
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="input flex items-center justify-between gap-2 text-left">
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || '— Select service —'}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <ul className="max-h-60 overflow-y-auto py-1 text-sm">
            {list.length === 0 && <li className="px-3 py-2 text-slate-400">No services yet.</li>}
            {list.map((c) => (
              <li key={c.id || c.name} className="flex items-center justify-between gap-1 pr-1">
                {editId === c.id ? (
                  <div className="flex w-full items-center gap-1 px-2 py-1">
                    <input className="input h-8 flex-1 text-sm" value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} placeholder="Service" />
                    <input className="input h-8 w-24 text-sm" inputMode="numeric" value={editAmt} onChange={(e) => setEditAmt(digits(e.target.value))} placeholder="Rs." />
                    <button type="button" onClick={() => saveEdit(c)} className="p-1 text-green-600"><Check size={15} /></button>
                    <button type="button" onClick={() => setEditId(null)} className="p-1 text-slate-400"><X size={15} /></button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button" onClick={() => pick(c)}
                      className={`flex flex-1 items-center justify-between gap-2 px-3 py-2 text-left ${value === c.name ? 'font-semibold text-brand-700' : 'text-slate-700'} hover:bg-brand-50`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{rs(c.amount)}</span>
                    </button>
                    {c.id && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" title="Edit" onClick={() => { setEditId(c.id); setEditName(c.name); setEditAmt(String(c.amount ?? '')) }} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={13} /></button>
                        <button type="button" title="Delete" onClick={() => remove(c)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5 border-t border-slate-100 p-2">
            <input className="input h-9 flex-1 text-sm" value={addName} placeholder="Add service…" onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
            <input className="input h-9 w-24 text-sm" inputMode="numeric" value={addAmt} placeholder="Rs." onChange={(e) => setAddAmt(digits(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
            <button type="button" onClick={add} className="btn-outline shrink-0 px-2.5 py-1.5 text-xs"><Plus size={14} /> Add</button>
          </div>
        </div>
      )}
    </div>
  )
}
