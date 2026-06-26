import { useEffect, useMemo, useState } from 'react'
import { Plus, Loader2, Search, X, ArrowRight, Pencil, PenLine, Check } from 'lucide-react'
import { createClient, updateClient, saveSignature } from '../lib/firestore'
import { isValidMobile } from '../lib/validate'
import { todayISO } from '../lib/format'
import { BASIC_SECTIONS, BASIC_KEYS } from '../lib/assessmentSchema'
import { CONSENT_DECLARATION } from '../lib/constants'
import { useUnsaved } from '../context/UnsavedContext'
import DateField from './DateField'
import AssessmentField from './AssessmentField'
import SignaturePad from './SignaturePad'
import BodyPainSelector from './BodyPainSelector'

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
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalidKey, setInvalidKey] = useState('')
  const [manualId, setManualId] = useState(false)
  const [customId, setCustomId] = useState('')
  const [signatureUrl, setSignatureUrl] = useState('')
  const [signOpen, setSignOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [painAreas, setPainAreas] = useState([])
  const { setDirty } = useUnsaved()

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
  function clearReturning() { setExisting(null); setEditing(false); setForm(blankForm()); setPainAreas([]); setSignatureUrl('') }
  function startEdit() {
    const next = blankForm()
    BASIC_KEYS.forEach((k) => { next[k] = existing[k] ?? '' })
    setForm(next); setEditing(true)
    setPainAreas(Array.isArray(existing.painAreas) ? existing.painAreas : [])
  }

  async function submit(dest) {
    setError(''); setInvalidKey('')
    const name = (form.name || '').trim()
    const phone = (form.phone || '').trim()
    const email = (form.email || '').trim()
    if (!name) return flagInvalid('name', 'Patient name is required.')
    if (!isValidMobile(phone)) return flagInvalid('phone', 'Enter a valid 10-digit contact number.')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return flagInvalid('email', 'Enter a valid email address.')
    const data = {}
    BASIC_KEYS.forEach((k) => { const v = form[k]; data[k] = typeof v === 'string' ? v.trim() : v })
    data.registeredOn = regDate || todayISO()
    data.painAreas = painAreas
    setBusy(true)
    try {
      if (existing && editing) {
        await updateClient(existing.id, data)
        if (signatureUrl) await saveSignature(existing.id, name, signatureUrl).catch(() => {})
        setDirty(false); onCreated(existing.id, dest)
      } else {
        const { id } = await createClient(data, manualId ? customId : '')
        if (signatureUrl) await saveSignature(id, name, signatureUrl).catch(() => {})
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

      <fieldset className="rounded-2xl border border-slate-100 p-4">
        <legend className="px-2 text-sm font-bold text-brand-700">Pain areas (tap on the body)</legend>
        <BodyPainSelector value={painAreas} onChange={(v) => { setPainAreas(v); setDirty(true) }} />
      </fieldset>

      {/* Consent declaration + optional digital signature */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="text-sm font-bold text-brand-700">Treatment Consent &amp; Declaration</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{CONSENT_DECLARATION}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {signatureUrl ? (
            <>
              <img src={signatureUrl} alt="signature" className="h-12 max-w-[160px] rounded border border-slate-200 bg-white object-contain p-1" />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Check size={14} /> Signed</span>
              <button type="button" onClick={() => { setAgreed(true); setSignOpen(true) }} className="btn-outline text-xs"><PenLine size={14} /> Re-sign</button>
              <button type="button" onClick={() => { setSignatureUrl(''); setDirty(true) }} className="text-xs font-medium text-red-500 hover:underline">Remove</button>
            </>
          ) : (
            <button type="button" onClick={() => { setAgreed(false); setSignOpen(true) }} className="btn-outline text-sm"><PenLine size={16} /> Sign digitally (optional)</button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Optional now — you can also capture or update the signature anytime from the Signatures module. Once signed, it appears on all of this patient's reports.</p>
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

      {signOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4" onClick={() => setSignOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <h3 className="font-bold text-slate-900">Patient signature</h3>
              <button type="button" onClick={() => setSignOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <p className="max-h-32 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{CONSENT_DECLARATION}</p>
            <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
              <span>The patient has read and agrees to the above declaration, and is signing of their own free will.</span>
            </label>
            {agreed ? (
              <div className="mt-3">
                <SignaturePad initial={signatureUrl} onSave={(url) => { setSignatureUrl(url); setDirty(true); setSignOpen(false) }} onCancel={() => setSignOpen(false)} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Tick the confirmation above to start signing.</p>
            )}
          </div>
        </div>
      )}
    </form>
  )
}
