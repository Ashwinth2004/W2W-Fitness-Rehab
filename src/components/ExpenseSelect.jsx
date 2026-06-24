import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Pencil, Trash2, Check, X, Plus } from 'lucide-react'
import { addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '../lib/firestore'

// Expense-title picker: choose a saved title, add new ones, and rename/delete
// existing ones inline (each row has Edit + Delete). Mirrors the therapist
// picker's UX. `categories` is [{ id, name }] from watchExpenseCategories.
export default function ExpenseSelect({ value, categories, onChange }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) { setOpen(false); setEditId(null) } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pick = (name) => { onChange(name); setOpen(false) }

  async function add() {
    const n = adding.trim(); if (!n) return
    if (!categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) await addExpenseCategory(n)
    onChange(n); setAdding('')
  }
  async function saveEdit(c) {
    const n = editName.trim(); if (!n) return
    await updateExpenseCategory(c.id, n)
    if (value === c.name) onChange(n)
    setEditId(null)
  }
  async function remove(c) {
    if (!window.confirm(`Delete expense title "${c.name}"?`)) return
    await deleteExpenseCategory(c.id)
    if (value === c.name) onChange('')
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="input flex items-center justify-between gap-2 text-left">
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || '— Select expense —'}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <ul className="max-h-56 overflow-y-auto py-1 text-sm">
            {categories.length === 0 && <li className="px-3 py-2 text-slate-400">No expense titles yet.</li>}
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-1 pr-1">
                {editId === c.id ? (
                  <div className="flex w-full items-center gap-1 px-2 py-1">
                    <input
                      className="input h-8 text-sm" value={editName} autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(c) } if (e.key === 'Escape') setEditId(null) }}
                    />
                    <button type="button" onClick={() => saveEdit(c)} className="p-1 text-green-600"><Check size={15} /></button>
                    <button type="button" onClick={() => setEditId(null)} className="p-1 text-slate-400"><X size={15} /></button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button" onClick={() => pick(c.name)}
                      className={`flex-1 px-3 py-2 text-left ${value === c.name ? 'font-semibold text-brand-700' : 'text-slate-700'} hover:bg-brand-50`}
                    >
                      {c.name}
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button type="button" title="Rename" onClick={() => { setEditId(c.id); setEditName(c.name) }} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={13} /></button>
                      <button type="button" title="Delete" onClick={() => remove(c)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5 border-t border-slate-100 p-2">
            <input
              className="input h-9 text-sm" value={adding} placeholder="Add expense title…"
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            />
            <button type="button" onClick={add} className="btn-outline shrink-0 px-2.5 py-1.5 text-xs"><Plus size={14} /> Add</button>
          </div>
        </div>
      )}
    </div>
  )
}
