import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Stethoscope, Search, UserPlus, Loader2, Save, ArrowRight, Plus, CheckCircle2 } from 'lucide-react'
import { watchClients, watchTherapists, createTherapist, watchTreatments, addTreatment } from '../../lib/firestore'
import { CLINICAL_SECTIONS, CLINICAL_KEYS } from '../../lib/assessmentSchema'
import { FOUNDERS } from '../../lib/constants'
import { todayISO, fmtDate } from '../../lib/format'
import DateField from '../../components/DateField'
import AssessmentField from '../../components/AssessmentField'

const blank = () => Object.fromEntries(CLINICAL_KEYS.map((k) => [k, '']))

export default function Treatment() {
  const [clients, setClients] = useState([])
  const [therapists, setTherapists] = useState([])
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => watchClients(setClients), [])
  useEffect(() => watchTherapists(setTherapists), [])

  const clientId = params.get('client') || ''
  const client = useMemo(() => clients.find((c) => c.id === clientId) || null, [clients, clientId])

  if (!clientId) return <ClientPicker clients={clients} onPick={(id) => setParams({ client: id })} onNew={() => navigate('/admin/clients?new=1')} />
  if (!clients.length) return <div className="grid place-items-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
  if (!client) return <ClientPicker clients={clients} note="That patient could not be found — pick again." onPick={(id) => setParams({ client: id })} onNew={() => navigate('/admin/clients?new=1')} />

  return <TreatmentForm key={client.id} client={client} therapists={therapists} onChangeClient={() => setParams({})} navigate={navigate} />
}

function ClientPicker({ clients, onPick, onNew, note }) {
  const [q, setQ] = useState('')
  const matches = q
    ? clients.filter((c) => [c.name, c.phone, c.clientId, c.email].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : []
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">Treatment</h1>
      <div className="card max-w-xl space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Stethoscope size={22} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Choose a patient</h2>
            <p className="text-sm text-slate-500">Search an existing patient, or create a new one.</p>
          </div>
        </div>
        {note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{note}</p>}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or ID…" autoFocus />
        </div>
        {matches.length > 0 && (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {matches.map((c) => (
              <li key={c.id}>
                <button onClick={() => onPick(c.id)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-brand-50">
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.clientId} · {c.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={onNew} className="btn-outline w-full"><Plus size={16} /> Create new patient</button>
      </div>
    </div>
  )
}

function TreatmentForm({ client, therapists, onChangeClient, navigate }) {
  const [treatments, setTreatments] = useState([])
  const [form, setForm] = useState(blank)
  const [date, setDate] = useState(todayISO())
  const [nextSession, setNextSession] = useState('')
  const [therapist, setTherapist] = useState(client.therapist || '')
  const [adding, setAdding] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => watchTreatments(client.id, setTreatments), [client.id])

  const last = treatments[0] || null
  // Default the handler to the client's last therapist if none chosen yet.
  useEffect(() => { setTherapist((t) => t || last?.therapist || '') }, [last])

  const names = Array.from(new Set([...FOUNDERS.map((f) => f.name), ...therapists.map((t) => t.name)]))
  const set = (k) => (val) => setForm((f) => ({ ...f, [k]: val }))

  async function addTherapist() {
    const n = adding.trim()
    if (!n) return
    await createTherapist(n)
    setTherapist(n); setAdding('')
  }

  async function save(e) {
    e.preventDefault(); setError('')
    if (!therapist) return setError('Please choose who is handling this patient.')
    setBusy(true)
    try {
      const data = { date: date || todayISO(), therapist, nextSession: nextSession || '', consent }
      CLINICAL_KEYS.forEach((k) => { const v = form[k]; data[k] = typeof v === 'string' ? v.trim() : v })
      await addTreatment(client.id, data)
      setSaved(true)
    } catch (err) {
      console.error('save treatment failed:', err)
      setError('Could not save the treatment. Please try again.')
    }
    setBusy(false)
  }

  if (saved) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold md:text-3xl">Treatment</h1>
        <div className="card mx-auto max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-500" size={48} />
          <h2 className="mt-3 text-xl font-bold">Treatment saved</h2>
          <p className="mt-1 text-slate-500">Session recorded for {client.name} ({client.clientId}).</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to={`/admin/clients/${client.id}`} className="btn-primary">Open patient &amp; generate report <ArrowRight size={16} /></Link>
            <button onClick={() => { setForm(blank()); setNextSession(''); setConsent(false); setSaved(false) }} className="btn-outline">Add another session</button>
            <button onClick={onChangeClient} className="btn-ghost">Another patient</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Treatment</h1>
        <Link to={`/admin/clients/${client.id}`} className="text-sm font-medium text-brand-600 hover:underline">Open patient page →</Link>
      </div>

      <div className="card space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-4">
          <div>
            <p className="font-semibold text-slate-900">{client.name}</p>
            <p className="text-sm text-slate-500">{client.clientId} · {client.phone}</p>
          </div>
          <button type="button" onClick={onChangeClient} className="btn-ghost px-3 py-1.5 text-sm">Change patient</button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label text-xs">Treatment given by (Physiotherapist) *</label>
            <select className="input" value={therapist} onChange={(e) => setTherapist(e.target.value)}>
              <option value="">— Select therapist —</option>
              {names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <div className="mt-2 flex gap-2">
              <input className="input" value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add another therapist…" />
              <button type="button" onClick={addTherapist} className="btn-outline shrink-0"><UserPlus size={15} /> Add</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label text-xs">Session date</label><DateField value={date} onChange={setDate} max={todayISO()} /></div>
            <div><label className="label text-xs">Next session date</label><DateField value={nextSession} onChange={setNextSession} /></div>
          </div>
        </div>
        {last && (
          <p className="text-xs text-slate-400">
            Previous session: {fmtDate(last.date)}{last.therapist ? ` · ${last.therapist}` : ''} — its values show faintly below; press Tab in a field to keep them.
          </p>
        )}
      </div>

      {CLINICAL_SECTIONS.map((s) => (
        <fieldset key={s.title} className="card p-5">
          <legend className="px-2 text-sm font-bold text-brand-700">{s.title}</legend>
          <div className={`grid gap-3 ${s.cols1 ? '' : 'sm:grid-cols-2'}`}>
            {s.fields.map((f) => (
              <AssessmentField key={f.k} f={f} value={form[f.k]} ghost={last ? String(last[f.k] ?? '') : ''} onChange={set(f.k)} />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="card p-5 text-xs leading-relaxed text-slate-600">
        <p>
          Physiotherapy involves physical evaluation and treatment by qualified therapists at Way to Wellness. During
          treatment it may be necessary to expose and touch the area being treated; the patient may decline any part at
          any time. Every effort is made to preserve modesty and keep the patient comfortable.
        </p>
        <label className="mt-3 flex items-start gap-2 font-medium text-slate-700">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
          The procedure was explained and the patient consents to the assessment &amp; treatment.
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => navigate('/admin/clients')} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save treatment</button>
      </div>
    </form>
  )
}
