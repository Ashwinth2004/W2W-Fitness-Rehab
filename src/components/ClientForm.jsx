import { useMemo, useState } from 'react'
import { Plus, Loader2, Search, X, RotateCcw, Save } from 'lucide-react'
import { createClient, updateClient } from '../lib/firestore'
import { isValidMobile } from '../lib/validate'
import { SERVICE_OPTIONS } from '../lib/constants'
import { todayISO } from '../lib/format'
import DateField from './DateField'
import PhoneField from './PhoneField'

// Full physiotherapy assessment intake (mirrors the W2W paper form).
// Sections marked `ghost:true` are clinical fields: for a returning patient
// their previous values appear faintly as a placeholder — press Tab in an
// empty field to keep the old value, or just type to replace it. Untouched
// fields keep the old value on save.
const SECTIONS = [
  { title: 'Registration', fields: [
    { k: 'name', label: 'Name *' },
    { k: 'phone', label: 'Contact number *', type: 'phone' },
    { k: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
    { k: 'age', label: 'Age', num: true },
    { k: 'occupation', label: 'Occupation / Sports' },
    { k: 'height', label: 'Height (cm)' },
    { k: 'weight', label: 'Weight (kg)' },
    { k: 'email', label: 'Email', type: 'email' },
    { k: 'referredBy', label: 'Referred by' },
    { k: 'handDominance', label: 'Hand dominance', type: 'select', options: ['Right', 'Left', 'Ambidextrous'] },
    { k: 'service', label: 'Primary service', type: 'select', options: SERVICE_OPTIONS },
    { k: 'address', label: 'Address', full: true },
  ] },
  { title: 'Activity levels', ghost: true, fields: [
    { k: 'walking', label: 'Walking / steps per day' },
    { k: 'exercise', label: 'Exercise routines (if any)' },
    { k: 'deskWork', label: 'Desktop work or others' },
    { k: 'sleep', label: 'Sleeping hours per day & cycle' },
    { k: 'hydration', label: 'Hydration (water intake / day)', full: true },
  ] },
  { title: 'History', ghost: true, cols1: true, fields: [
    { k: 'pastHistory', label: 'Past Medical History (major illness, injury or surgery)', area: true },
    { k: 'presentHistory', label: 'Present Medical History (Diabetes, BP, Thyroid)', area: true },
    { k: 'complaint', label: 'Current chief complaints', area: true },
    { k: 'mechanism', label: 'Mechanism of injury', area: true },
  ] },
  { title: 'Pain Assessment', ghost: true, fields: [
    { k: 'painArea', label: 'Area (side & site) of pain' },
    { k: 'painDuration', label: 'Duration' },
    { k: 'painType', label: 'Nature / type of pain' },
    { k: 'painADL', label: 'Impact of pain on ADL' },
    { k: 'painAggravating', label: 'Pain aggravating factor' },
    { k: 'painRelieving', label: 'Pain relieving factor' },
    { k: 'vas', label: 'VAS — pain score (0–10)', num: true },
  ] },
  { title: 'Objective Assessment', ghost: true, fields: [
    { k: 'built', label: 'Built' },
    { k: 'deformities', label: 'Deformities / Edema / Wasting' },
    { k: 'gait', label: 'Gait' },
    { k: 'objectiveNotes', label: 'Notes', area: true, full: true },
  ] },
  { title: 'On Palpation', ghost: true, fields: [
    { k: 'tenderness', label: 'Tenderness' },
    { k: 'swelling', label: 'Swelling / Spasm' },
    { k: 'crepitus', label: 'Crepitus / Abnormal sounds' },
  ] },
  { title: 'On Examination', ghost: true, fields: [
    { k: 'rom', label: 'ROM', area: true, full: true },
    { k: 'endFeel', label: 'End Feel' },
    { k: 'grip', label: 'Grip' },
    { k: 'muscleTone', label: 'Muscle Tone' },
    { k: 'girth', label: 'Girth measurements' },
    { k: 'limbLength', label: 'Limb length discrepancies' },
    { k: 'reflexes', label: 'Reflexes' },
    { k: 'specialTests', label: 'Special tests & functional testing', area: true, full: true },
  ] },
  { title: 'Assessment & Plan', ghost: true, cols1: true, fields: [
    { k: 'opinion', label: 'Opinion about the patient & condition', area: true },
    { k: 'treatmentOptions', label: 'Treatment options (with evidence)', area: true },
    { k: 'expectedRecovery', label: 'Expected duration of recovery & outcomes', area: true },
    { k: 'treatmentPlan', label: 'Treatment plan', area: true },
    { k: 'followUp', label: 'Follow up', area: true },
  ] },
]

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.k))
const blankForm = () => Object.fromEntries(ALL_KEYS.map((k) => [k, '']))

function Field({ f, value, ghost, onChange }) {
  const onKey = (e) => { if (e.key === 'Tab' && !value && ghost) { e.preventDefault(); onChange(ghost) } }
  const wrap = f.full || f.area ? 'sm:col-span-2' : ''

  if (f.type === 'select') {
    return (
      <div className={wrap}>
        <label className="label text-xs">{f.label}</label>
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  if (f.type === 'phone') {
    return (
      <div className={wrap}>
        <label className="label text-xs">{f.label}</label>
        <PhoneField value={value} onChange={onChange} />
      </div>
    )
  }
  const T = f.area ? 'textarea' : 'input'
  return (
    <div className={wrap}>
      <label className="label text-xs">{f.label}</label>
      <T
        className={`input ${f.area ? 'min-h-[68px]' : ''}`}
        type={f.type === 'email' ? 'email' : 'text'}
        inputMode={f.num ? 'numeric' : undefined}
        value={value}
        placeholder={ghost || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
      />
    </div>
  )
}

export default function ClientForm({ clients = [], onCreated, onClose }) {
  const [form, setForm] = useState(blankForm)
  const [assessmentDate, setAssessmentDate] = useState(todayISO())
  const [existing, setExisting] = useState(null) // returning patient
  const [lookup, setLookup] = useState('')
  const [consent, setConsent] = useState(false)
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

  function selectReturning(c) {
    // Pre-fill demographics; leave clinical (ghost) fields empty so old values show faintly.
    const next = blankForm()
    SECTIONS.forEach((s) => { if (!s.ghost) s.fields.forEach((f) => { next[f.k] = c[f.k] ?? '' }) })
    setForm(next)
    setExisting(c)
    setLookup('')
    setError('')
  }

  function clearReturning() {
    setExisting(null)
    setForm(blankForm())
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const eff = (k) => {
      const v = form[k]
      const s = typeof v === 'string' ? v.trim() : v
      return s !== '' && s != null ? s : existing ? (existing[k] ?? '') : ''
    }
    const name = eff('name')
    const phone = eff('phone')
    if (!name) { setError('Patient name is required.'); return }
    if (!isValidMobile(phone)) { setError('Enter a valid 10-digit contact number.'); return }

    const data = {}
    ALL_KEYS.forEach((k) => { data[k] = eff(k) })
    data.assessmentDate = assessmentDate || todayISO()
    data.consent = consent

    setBusy(true)
    try {
      if (existing) { await updateClient(existing.id, data); onCreated(existing.id) }
      else { const { id } = await createClient(data); onCreated(id) }
    } catch (err) {
      console.error('save client failed:', err)
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card animate-fade-in space-y-6 p-5 md:p-6">
      {/* Returning patient lookup */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <label className="label text-xs">Returning patient? Search by name, phone or ID</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className="input pl-9"
            value={existing ? `${existing.name} · ${existing.clientId}` : lookup}
            onChange={(e) => setLookup(e.target.value)}
            disabled={!!existing}
            placeholder="e.g. Ramesh, 98xxxxxxxx or W2W-0007"
          />
          {existing && (
            <button type="button" onClick={clearReturning} className="absolute right-2 top-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200">
              <RotateCcw size={13} /> New patient
            </button>
          )}
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
        {existing && (
          <p className="mt-2 text-xs text-brand-700">
            Updating <strong>{existing.clientId}</strong> — previous clinical details show in grey. Press <kbd className="rounded bg-white px-1 ring-1 ring-slate-200">Tab</kbd> in an empty field to keep it, or type to change. Untouched fields keep the old value.
          </p>
        )}
      </div>

      {/* Reg No + Date */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label text-xs">Reg. No</label>
          <input className="input cursor-not-allowed bg-slate-50 text-slate-500" value={existing?.clientId || 'Auto-generated (W2W-####)'} readOnly />
        </div>
        <div>
          <label className="label text-xs">Date</label>
          <DateField value={assessmentDate} onChange={setAssessmentDate} max={todayISO()} />
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((s) => (
        <fieldset key={s.title} className="rounded-2xl border border-slate-100 p-4">
          <legend className="px-2 text-sm font-bold text-brand-700">{s.title}</legend>
          <div className={`grid gap-3 ${s.cols1 ? '' : 'sm:grid-cols-2'}`}>
            {s.fields.map((f) => (
              <Field
                key={f.k}
                f={f}
                value={form[f.k]}
                ghost={s.ghost && existing ? String(existing[f.k] ?? '') : ''}
                onChange={set(f.k)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      {/* Declaration */}
      <div className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
        <p className="font-semibold text-slate-700">Declaration</p>
        <p className="mt-1">
          Physiotherapy involves physical evaluation and treatment by qualified therapists at Way to Wellness. During
          treatment it may be necessary to expose and touch the area being treated; you may decline any part at any
          time. Every effort is made to preserve modesty and keep you comfortable.
        </p>
        <label className="mt-3 flex items-start gap-2 font-medium text-slate-700">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
          The procedure was explained and the patient consents to the assessment &amp; treatment.
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={18} className="animate-spin" /> : existing ? <Save size={18} /> : <Plus size={18} />}
          {existing ? 'Update patient' : 'Create patient'}
        </button>
      </div>
    </form>
  )
}
