import { useMemo, useState } from 'react'
import { Plus, Loader2, Search, X, ArrowRight, Pencil } from 'lucide-react'
import { createClient, updateClient } from '../lib/firestore'
import { isValidMobile } from '../lib/validate'
import { todayISO } from '../lib/format'
import { BASIC_SECTIONS, BASIC_KEYS } from '../lib/assessmentSchema'
import DateField from './DateField'
import AssessmentField from './AssessmentField'

const blankForm = () => Object.fromEntries(BASIC_KEYS.map((k) => [k, '']))

// Front-desk client intake — Basic Details only. The clinical assessment is
// done by the physiotherapist in the Treatment module. onCreated(id) is called
// with the client id (new or returning) so the caller can open Treatment.
export default function ClientForm({ clients = [], onCreated, onClose }) {
  const [form, setForm] = useState(blankForm)
  const [regDate, setRegDate] = useState(todayISO())
  const [existing, setExisting] = useState(null)
  const [editing, setEditing] = useState(false)
  const [lookup, setLookup] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (val) => setForm((f) => ({ ...f, [k]: val }))

  const matches = useMemo(() => {
    const q = lookup.trim().toLowerCase()
    if (!q || existing) return []
    return clients
      .filter((c) => [c.name, c.phone, c.clientId, c.email].filter(Boolean).join(' ').toLowerCase().includes(q))
      .slice(0, 6)
  }, [lookup, clients, existing])

  function selectReturning(c) { setExisting(c); setLookup(''); setError(''); setEditing(false) }
  function clearReturning() { setExisting(null); setEditing(false); setForm(blankForm()) }
  function startEdit() {
    const next = blankForm()
    BASIC_KEYS.forEach((k) => { next[k] = existing[k] ?? '' })
    setForm(next); setEditing(true)
  }

  async function submit(e) {
    e.preventDefault(); setError('')
    const name = (form.name || '').trim()
    const phone = (form.phone || '').trim()
    if (!name) return setError('Patient name is required.')
    if (!isValidMobile(phone)) return setError('Enter a valid 10-digit contact number.')
    const data = {}
    BASIC_KEYS.forEach((k) => { const v = form[k]; data[k] = typeof v === 'string' ? v.trim() : v })
    data.registeredOn = regDate || todayISO()
    setBusy(true)
    try {
      if (existing && editing) { await updateClient(existing.id, data); onCreated(existing.id) }
      else { const { id } = await createClient(data); onCreated(id) }
    } catch (err) {
      console.error('save client failed:', err)
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  // Returning patient picked (not editing) → quick "continue" card.
  if (existing && !editing) {
    return (
      <div className="card animate-fade-in space-y-4 p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Returning patient</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="rounded-xl bg-brand-50 p-4">
          <p className="font-semibold text-slate-900">{existing.name}</p>
          <p className="text-sm text-slate-500">
            {existing.clientId} · {existing.phone}{existing.therapist ? ` · Last handled by ${existing.therapist}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onCreated(existing.id)} className="btn-primary">Continue to Treatment <ArrowRight size={16} /></button>
          <button onClick={startEdit} className="btn-outline"><Pencil size={15} /> Edit details</button>
          <button onClick={clearReturning} className="btn-ghost">Different patient</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card animate-fade-in space-y-6 p-5 md:p-6">
      {!editing && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <label className="label text-xs">Returning patient? Search by name, phone or ID</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <input className="input pl-9" value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="e.g. Ramesh, 98xxxxxxxx or W2W-0007" />
          </div>
          {matches.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {matches.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => selectReturning(c)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.clientId} · {c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>Editing details for <strong>{existing.clientId}</strong></span>
          <button type="button" onClick={clearReturning} className="text-xs font-medium hover:underline">Cancel</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label text-xs">Reg. No</label>
          <input className="input cursor-not-allowed bg-slate-50 text-slate-500" value={existing?.clientId || 'Auto-generated (W2W-####)'} readOnly />
        </div>
        <div>
          <label className="label text-xs">Date</label>
          <DateField value={regDate} onChange={setRegDate} max={todayISO()} />
        </div>
      </div>

      {BASIC_SECTIONS.map((s) => (
        <fieldset key={s.title} className="rounded-2xl border border-slate-100 p-4">
          <legend className="px-2 text-sm font-bold text-brand-700">{s.title}</legend>
          <div className={`grid gap-3 ${s.cols1 ? '' : 'sm:grid-cols-2'}`}>
            {s.fields.map((f) => <AssessmentField key={f.k} f={f} value={form[f.k]} onChange={set(f.k)} />)}
          </div>
        </fieldset>
      ))}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {editing ? 'Save & continue to Treatment' : 'Create & continue to Treatment'}
        </button>
      </div>
    </form>
  )
}
