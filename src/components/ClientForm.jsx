import { useEffect, useMemo, useState } from 'react'
import { Plus, Loader2, Search, X, ArrowRight, Pencil } from 'lucide-react'
import { createClient, updateClient } from '../lib/firestore'
import { isValidMobile } from '../lib/validate'
import { todayISO } from '../lib/format'
import { BASIC_SECTIONS, BASIC_KEYS } from '../lib/assessmentSchema'
import { consentDeclarationFor, FITNESS_GOALS } from '../lib/constants'
import { getCustomFitnessGoals, addCustomFitnessGoal, deleteCustomFitnessGoal } from '../lib/customFitnessGoals'
import { useUnsaved } from '../context/UnsavedContext'
import DateField from './DateField'
import AssessmentField from './AssessmentField'
import BodyPainSelector from './BodyPainSelector'

const goalChipCls = (active) =>
  `inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
    active ? 'border-brand-600 bg-brand-600 text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:bg-brand-50'
  }`

// New clients default to Physiotherapy as the primary service (changeable in the dropdown).
// `programs` defaults to W2W Treatment unless the caller (e.g. the Rehab module) overrides it.
const blankForm = (programs = ['W2W Treatment']) => ({ ...Object.fromEntries(BASIC_KEYS.map((k) => [k, ''])), service: 'Physiotherapy', programs })

// Front-desk client intake — Basic Details only. The clinical assessment is
// done by the physiotherapist in the Treatment module. onCreated(id) is called
// with the client id (new or returning) so the caller can open Treatment.
//
// Pass `editClient` to skip the "returning patient" search entirely and open
// straight into editing that one client's registration (used by the "Update
// Registration" popup inside Treatment/Rehab, where the client is already known).
//
// `variant="fitness"` swaps the Pain areas chart for a Fitness goals picker —
// used only by the Fitness module's registration flow. Every other module
// keeps the pain-areas chart, unchanged.
export default function ClientForm({ clients = [], onCreated, onClose, defaultPrograms, editClient, variant = 'clinical' }) {
  const isFitness = variant === 'fitness'
  const [form, setForm] = useState(() => {
    if (!editClient) return blankForm(defaultPrograms)
    const next = blankForm()
    BASIC_KEYS.forEach((k) => { next[k] = editClient[k] ?? '' })
    return next
  })
  const [regDate, setRegDate] = useState(todayISO())
  const [existing, setExisting] = useState(() => editClient || null)
  const [editing, setEditing] = useState(() => !!editClient)
  const [lookup, setLookup] = useState('')
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalidKey, setInvalidKey] = useState('')
  const [manualId, setManualId] = useState(false)
  const [customId, setCustomId] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [painAreas, setPainAreas] = useState(() => (editClient && Array.isArray(editClient.painAreas) ? editClient.painAreas : []))
  const [fitnessGoals, setFitnessGoals] = useState(() => (editClient && Array.isArray(editClient.fitnessGoals) ? editClient.fitnessGoals : []))
  const [customGoals, setCustomGoals] = useState(() => getCustomFitnessGoals())
  const [goalDraft, setGoalDraft] = useState('')
  const { setDirty } = useUnsaved()

  function toggleGoal(g) {
    setFitnessGoals((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]))
    setDirty(true)
  }
  function addGoal() {
    const g = goalDraft.trim()
    if (!g) return
    if (!FITNESS_GOALS.includes(g) && !customGoals.includes(g)) {
      addCustomFitnessGoal(g)
      setCustomGoals((gs) => [...gs, g])
    }
    setFitnessGoals((gs) => (gs.includes(g) ? gs : [...gs, g]))
    setGoalDraft('')
    setDirty(true)
  }
  function removeCustomGoal(g) {
    deleteCustomFitnessGoal(g)
    setCustomGoals((gs) => gs.filter((x) => x !== g))
    setFitnessGoals((gs) => gs.filter((x) => x !== g))
    setDirty(true)
  }

  // Clear the unsaved flag when this form unmounts (closed / navigated away).
  useEffect(() => () => setDirty(false), [setDirty])

  const set = (k) => (val) => { setForm((f) => ({ ...f, [k]: val })); setDirty(true); setInvalidKey('') }

  // Flag a field, scroll to it and focus it so the user sees what to fix.
  function flagInvalid(key, msg) {
    setInvalidKey(key); setError(msg)
    requestAnimationFrame(() => {
      const el = document.getElementById(`f-${key}`)
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }) }
    })
  }

  const matches = useMemo(() => {
    const q = lookup.trim().toLowerCase()
    if (!q || existing) return []
    return clients
      .filter((c) => [c.name, c.phone, c.clientId, c.email].filter(Boolean).join(' ').toLowerCase().includes(q))
      .slice(0, 6)
  }, [lookup, clients, existing])

  function selectReturning(c) { setExisting(c); setLookup(''); setError(''); setEditing(false) }
  function lookupKey(e) {
    if (!matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(matches.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[active]) selectReturning(matches[active]) }
  }
  // In the forced single-client edit mode (editClient), there's no "search
  // for a different patient" to fall back to — Cancel just closes the popup.
  function clearReturning() {
    if (editClient) { onClose(); return }
    setExisting(null); setEditing(false); setForm(blankForm(defaultPrograms)); setPainAreas([]); setFitnessGoals([])
  }
  function startEdit() {
    const next = blankForm()
    BASIC_KEYS.forEach((k) => { next[k] = existing[k] ?? '' })
    setForm(next); setEditing(true)
    setPainAreas(Array.isArray(existing.painAreas) ? existing.painAreas : [])
    setFitnessGoals(Array.isArray(existing.fitnessGoals) ? existing.fitnessGoals : [])
  }

  async function submit(dest) {
    setError(''); setInvalidKey('')
    const name = (form.name || '').trim()
    const phone = (form.phone || '').trim()
    const email = (form.email || '').trim()
    if (!name) return flagInvalid('name', 'Patient name is required.')
    if (!isValidMobile(phone)) return flagInvalid('phone', 'Enter a valid 10-digit contact number.')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return flagInvalid('email', 'Enter a valid email address.')
    if (!agreed) { setError('Please tick the Declaration & Consent at the top before saving.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const data = {}
    BASIC_KEYS.forEach((k) => { const v = form[k]; data[k] = typeof v === 'string' ? v.trim() : v })
    data.registeredOn = regDate || todayISO()
    if (isFitness) data.fitnessGoals = fitnessGoals
    else data.painAreas = painAreas
    setBusy(true)
    try {
      if (existing && editing) {
        await updateClient(existing.id, data)
        setDirty(false); onCreated(existing.id, dest)
      } else {
        const { id } = await createClient(data, manualId ? customId : '')
        setDirty(false); onCreated(id, dest)
      }
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
          <button onClick={() => onCreated(existing.id, 'treatment')} className="btn-primary">Continue to Treatment <ArrowRight size={16} /></button>
          <button onClick={() => onCreated(existing.id, 'client')} className="btn-outline">Open patient page</button>
          <button onClick={startEdit} className="btn-outline"><Pencil size={15} /> Update register details</button>
          <button onClick={clearReturning} className="btn-ghost">Different patient</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit('treatment') }} className="card animate-fade-in space-y-6 p-5 md:p-6">
      {!editing && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <label className="label text-xs">Returning patient? Search by name, phone or ID</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <input className="input pl-9" value={lookup} onChange={(e) => { setLookup(e.target.value); setActive(0) }} onKeyDown={lookupKey} placeholder="e.g. Ramesh, 98xxxxxxxx or W2W-0007" />
          </div>
          {matches.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {matches.map((c, i) => (
                <li key={c.id}>
                  <button type="button" onClick={() => selectReturning(c)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50 ${active === i ? 'bg-brand-50' : ''}`}>
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
          <div className="flex items-center justify-between">
            <label className="label text-xs">Reg. No</label>
            {!existing && (
              <button type="button" onClick={() => { setManualId((v) => !v); setDirty(true) }} className="text-[11px] font-medium text-brand-600 hover:underline">
                {manualId ? 'Use auto' : 'Set manually'}
              </button>
            )}
          </div>
          {existing ? (
            <input className="input cursor-not-allowed bg-slate-50 text-slate-500" value={existing.clientId} readOnly />
          ) : manualId ? (
            <input className="input" value={customId} onChange={(e) => { setCustomId(e.target.value); setDirty(true) }} placeholder="e.g. W2W-0001" />
          ) : (
            <input className="input cursor-not-allowed bg-slate-50 text-slate-500" value="Auto-generated (W2W-####)" readOnly />
          )}
        </div>
        <div>
          <label className="label text-xs">Date</label>
          <DateField value={regDate} onChange={(iso) => { setRegDate(iso); setDirty(true) }} max={todayISO()} />
        </div>
      </div>

      {BASIC_SECTIONS.map((s) => (
        <fieldset key={s.title} className="rounded-2xl border border-slate-100 p-4">
          <legend className="px-2 text-sm font-bold text-brand-700">{s.title}</legend>
          <div className={`grid gap-3 ${s.cols1 ? '' : 'sm:grid-cols-2'}`}>
            {s.fields.map((f) => <AssessmentField key={f.k} f={f} value={form[f.k]} onChange={set(f.k)} invalid={invalidKey === f.k} />)}
          </div>
        </fieldset>
      ))}

      {isFitness ? (
        <fieldset className="rounded-2xl border border-slate-100 p-4">
          <legend className="px-2 text-sm font-bold text-brand-700">Fitness goals</legend>
          <div className="flex flex-wrap gap-2">
            {FITNESS_GOALS.map((g) => (
              <button type="button" key={g} className={goalChipCls(fitnessGoals.includes(g))} onClick={() => toggleGoal(g)}>
                {g}
              </button>
            ))}
            {customGoals.map((g) => (
              <span key={g} className={`inline-flex items-center gap-1 rounded-full border pl-3.5 pr-1.5 py-1 text-xs font-semibold transition ${fitnessGoals.includes(g) ? 'border-brand-600 bg-brand-600 text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:bg-brand-50'}`}>
                <button type="button" onClick={() => toggleGoal(g)}>{g}</button>
                <button
                  type="button" title="Remove this goal option" onClick={() => removeCustomGoal(g)}
                  className={`grid h-5 w-5 place-items-center rounded-full ${fitnessGoals.includes(g) ? 'hover:bg-white/20' : 'text-slate-400 hover:bg-slate-200'}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="input h-9 text-sm" value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal() } }}
              placeholder="Add another goal…"
            />
            <button type="button" onClick={addGoal} className="btn-outline shrink-0 text-sm">Add</button>
          </div>
        </fieldset>
      ) : (
        <fieldset className="rounded-2xl border border-slate-100 p-4">
          <legend className="px-2 text-sm font-bold text-brand-700">Pain areas (tap on the body)</legend>
          <BodyPainSelector value={painAreas} onChange={(v) => { setPainAreas(v); setDirty(true) }} />
        </fieldset>
      )}

      {/* Declaration & consent — shown at the end, after the pain-areas chart */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
        <p className="text-sm font-bold text-brand-700">Declaration &amp; Consent</p>
        <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${isFitness ? 'text-justify' : ''}`}>{consentDeclarationFor(form.programs)}</p>
        <label className="mt-3 flex items-start gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setDirty(true) }} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
          <span>The information provided is accurate and the patient consents to the assessment &amp; treatment.</span>
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="button" onClick={() => submit('client')} disabled={busy} className="btn-outline">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {editing ? 'Save' : 'Create patient'}
        </button>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {editing ? 'Save & continue to Treatment' : 'Create & continue to Treatment'}
        </button>
      </div>
    </form>
  )
}
