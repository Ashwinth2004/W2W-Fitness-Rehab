import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Stethoscope, Search, Loader2, Save, ArrowRight, Plus, CheckCircle2, BadgeCheck } from 'lucide-react'
import { watchClients, watchTreatments, addTreatment, updateTreatment } from '../../lib/firestore'
import { CLINICAL_SECTIONS, CLINICAL_KEYS, formatAssessmentValue } from '../../lib/assessmentSchema'
import { todayISO, fmtDate } from '../../lib/format'
import DateField from '../../components/DateField'
import AssessmentField from '../../components/AssessmentField'
import VasScale from '../../components/VasScale'
import BodyPainSelector from '../../components/BodyPainSelector'
import TherapistSelect from '../../components/TherapistSelect'
import ContactActions from '../../components/ContactActions'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useUnsaved } from '../../context/UnsavedContext'

const blank = () => Object.fromEntries(CLINICAL_KEYS.map((k) => [k, '']))

export default function Treatment() {
  const [clients, setClients] = useState([])
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => watchClients(setClients), [])

  const clientId = params.get('client') || ''
  const client = useMemo(() => clients.find((c) => c.id === clientId) || null, [clients, clientId])

  if (!clientId) return <ClientPicker clients={clients} onPick={(id) => setParams({ client: id })} onNew={() => navigate('/admin/clients?new=1')} />
  if (!clients.length) return <div className="grid place-items-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
  if (!client) return <ClientPicker clients={clients} note="That patient could not be found — pick again." onPick={(id) => setParams({ client: id })} onNew={() => navigate('/admin/clients?new=1')} />

  return <TreatmentForm key={`${client.id}:${params.get('session') || ''}`} client={client} editId={params.get('session') || ''} onChangeClient={() => setParams({})} navigate={navigate} />
}

function ClientPicker({ clients, onPick, onNew, note }) {
  const [q, setQ] = useState('')
  const filtered = q
    ? clients.filter((c) => [c.name, c.phone, c.clientId, c.email].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()))
    : clients

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Treatment" />
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Stethoscope size={22} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Choose a patient</h2>
            <p className="text-sm text-slate-500">Tap a patient below to start their treatment, or create a new one.</p>
          </div>
        </div>
        {note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{note}</p>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <input
              className="input pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && filtered[0]) { e.preventDefault(); onPick(filtered[0].id) } }}
              placeholder="Search by name, phone or ID…"
              autoFocus
            />
          </div>
          <button onClick={onNew} className="btn-outline shrink-0"><Plus size={16} /> Create new patient</button>
        </div>
      </div>

      {/* Patient cards — same as the Clients page; tap one to begin treatment. */}
      {clients.length === 0 ? (
        <p className="card py-12 text-center text-sm text-slate-400">No patients yet. Create your first patient above.</p>
      ) : filtered.length === 0 ? (
        <p className="card py-12 text-center text-sm text-slate-400">No patients match “{q}”.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onPick(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(c.id) } }}
              className="card cursor-pointer p-5 transition hover:shadow-soft hover:ring-1 hover:ring-brand-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
                    {c.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs font-medium text-brand-600"><BadgeCheck size={13} /> {c.clientId}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">Since {fmtDate(c.createdAt)}</p>
                <div onClick={(e) => e.stopPropagation()}><ContactActions phone={c.phone} size="sm" /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Read-only snapshot of the patient's registration details, so the therapist
// has the full picture before starting the session.
const SUMMARY_FACTS = [
  ['age', 'Age'], ['gender', 'Gender'], ['email', 'Email'], ['occupation', 'Occupation / Sports'],
  ['height', 'Height (cm)'], ['weight', 'Weight (kg)'], ['handDominance', 'Hand dominance'],
  ['service', 'Primary service'], ['referredBy', 'Referred by'],
]
const SUMMARY_NOTES = [
  ['complaint', 'Chief complaint / goal'], ['pastHistory', 'Past medical history'],
  ['presentHistory', 'Present medical history'], ['mechanism', 'Mechanism of injury'],
]
function PatientSummary({ client }) {
  const facts = SUMMARY_FACTS.filter(([k]) => client[k])
  const notes = SUMMARY_NOTES.filter(([k]) => client[k])
  const hasArea = Array.isArray(client.painAreas) && client.painAreas.length > 0
  const hasAny = facts.length > 0 || notes.length > 0 || client.address || hasArea
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-700">Patient details</p>
        <Link to={`/admin/clients/${client.id}`} className="text-xs font-semibold text-brand-600 hover:underline">Full profile →</Link>
      </div>
      {!hasAny ? (
        <p className="mt-2 text-sm text-slate-400">No extra registration details yet — add them on the patient page.</p>
      ) : (
        <>
          {(facts.length > 0 || client.address) && (
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {facts.map(([k, label]) => (
                <div key={k}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm text-slate-800">{formatAssessmentValue(client[k])}</dd>
                </div>
              ))}
              {client.address && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Address</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">{client.address}</dd>
                </div>
              )}
            </dl>
          )}
          {notes.length > 0 && (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
              {notes.map(([k, label]) => (
                <div key={k}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{formatAssessmentValue(client[k])}</p>
                </div>
              ))}
            </div>
          )}
          {hasArea && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Pain areas marked ({client.painAreas.length})</p>
              <BodyPainSelector value={client.painAreas} readonly />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TreatmentForm({ client, editId = '', onChangeClient, navigate }) {
  const [treatments, setTreatments] = useState([])
  const [form, setForm] = useState(blank)
  const [date, setDate] = useState(todayISO())
  const [nextSession, setNextSession] = useState('')
  const [therapist, setTherapist] = useState(client.therapist || 'Sakthi Saravanan')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [therapistInvalid, setTherapistInvalid] = useState(false)
  const { setDirty, guard } = useUnsaved()

  const editLoaded = useRef(false)
  useEffect(() => watchTreatments(client.id, setTreatments), [client.id])
  useEffect(() => () => setDirty(false), [setDirty])

  // Edit mode: load the chosen saved session into the form (once, when it arrives).
  useEffect(() => {
    if (!editId || editLoaded.current || !treatments.length) return
    const t = treatments.find((x) => x.id === editId)
    if (!t) return
    editLoaded.current = true
    const next = blank()
    CLINICAL_KEYS.forEach((k) => { next[k] = t[k] ?? '' })
    setForm(next)
    setDate(t.date || todayISO())
    setNextSession(t.nextSession || '')
    setTherapist(t.therapist || '')
    setConsent(Boolean(t.consent))
  }, [editId, treatments])

  const last = treatments[0] || null
  // Default the handler to the client's last therapist if none chosen yet.
  useEffect(() => { setTherapist((t) => t || last?.therapist || 'Sakthi Saravanan') }, [last])

  const set = (k) => (val) => { setForm((f) => ({ ...f, [k]: val })); setDirty(true) }
  const touch = () => setDirty(true)

  async function save(e) {
    e.preventDefault(); setError('')
    if (!therapist) {
      setTherapistInvalid(true)
      setError('Please choose who is handling this patient.')
      requestAnimationFrame(() => document.getElementById('treat-therapist')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    if (!consent) {
      setError('Please tick the consent confirmation before saving.')
      requestAnimationFrame(() => document.getElementById('treat-consent')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    setBusy(true)
    try {
      const data = { date: date || todayISO(), therapist, nextSession: nextSession || '', consent }
      CLINICAL_KEYS.forEach((k) => { const v = form[k]; data[k] = typeof v === 'string' ? v.trim() : v })
      if (editId) await updateTreatment(client.id, editId, data)
      else await addTreatment(client.id, data)
      setDirty(false)
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
        <AdminPageHeader title="Treatment" />
        <div className="card mx-auto max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-500" size={48} />
          <h2 className="mt-3 text-xl font-bold">{editId ? 'Treatment updated' : 'Treatment saved'}</h2>
          <p className="mt-1 text-slate-500">Session {editId ? 'updated' : 'recorded'} for {client.name} ({client.clientId}).</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to={`/admin/clients/${client.id}`} className="btn-primary">Open patient &amp; generate report <ArrowRight size={16} /></Link>
            <button onClick={() => { if (editId) navigate(`/admin/treatment?client=${client.id}`); else { setForm(blank()); setNextSession(''); setConsent(false); setSaved(false) } }} className="btn-outline">Add another session</button>
            <button onClick={onChangeClient} className="btn-ghost">Another patient</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={save} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault() }} className="space-y-5">
      <AdminPageHeader title="Treatment">
        <button type="button" onClick={() => guard(() => navigate(`/admin/clients/${client.id}`))} className="text-sm font-medium text-brand-600 hover:underline">Open patient page →</button>
      </AdminPageHeader>

      <div className="card space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-4">
          <div>
            <p className="text-lg font-bold text-slate-900">{client.name}</p>
            <p className="text-sm text-slate-500">{client.clientId} · {client.phone}</p>
          </div>
          <button type="button" onClick={() => guard(onChangeClient)} className="btn-ghost px-3 py-1.5 text-sm">Change patient</button>
        </div>

        <PatientSummary client={client} />

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label text-sm">Treatment given by (Physiotherapist) *</label>
            <TherapistSelect id="treat-therapist" invalid={therapistInvalid} value={therapist} onChange={(v) => { setTherapist(v); touch(); setTherapistInvalid(false) }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label text-sm">Session date</label><DateField value={date} onChange={(iso) => { setDate(iso); touch() }} max={todayISO()} /></div>
            <div><label className="label text-sm">Next session date</label><DateField value={nextSession} onChange={(iso) => { setNextSession(iso); touch() }} /></div>
          </div>
        </div>
        {last && (
          <p className="text-sm text-slate-400">
            Previous session: {fmtDate(last.date)}{last.therapist ? ` · ${last.therapist}` : ''} — its values show faintly below; press Tab in a field to keep them.
          </p>
        )}
      </div>

      <div className="card p-5 text-sm leading-relaxed text-slate-600">
        <h3 className="mb-2 text-base font-bold uppercase tracking-wide text-slate-900">Declaration</h3>
        <p>
          Physiotherapy involves physical evaluation and treatment by qualified therapists at Way to Wellness. During
          treatment it may be necessary to expose and touch the area being treated; the patient may decline any part at
          any time. Every effort is made to preserve modesty and keep the patient comfortable.
        </p>
        <label className="mt-3 flex items-start gap-2 font-medium text-slate-700">
          <input id="treat-consent" type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); touch() }} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
          The procedure was explained and the patient consents to the assessment &amp; treatment.
        </label>
      </div>

      {CLINICAL_SECTIONS.map((s) => (
        <fieldset key={s.title} className="card p-5">
          <legend className="px-2 text-base font-bold text-brand-700">{s.title}</legend>
          <div className={`grid gap-3 ${s.cols1 ? '' : 'sm:grid-cols-2'}`}>
            {s.fields.map((f) => (
              <Fragment key={f.k}>
                <AssessmentField f={f} value={form[f.k]} ghost={last ? String(last[f.k] ?? '') : ''} onChange={set(f.k)} big />
                {f.k === 'vas' && (
                  <div className="sm:col-span-2">
                    <VasScale value={form.vas} onChange={set('vas')} />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </fieldset>
      ))}

      {/* Next session date — repeated at the end; bound to the same value as the
          one up top, so editing either keeps both in sync. */}
      <div className="card p-5">
        <label className="label text-sm">Next session date</label>
        <div className="max-w-xs">
          <DateField value={nextSession} onChange={(iso) => { setNextSession(iso); touch() }} min={todayISO()} />
        </div>
        <p className="mt-1 text-xs text-slate-400">Same as the “Next session date” at the top — updating either keeps both in sync.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => guard(() => navigate('/admin/clients'))} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {editId ? 'Update treatment' : 'Save treatment'}</button>
      </div>
    </form>
  )
}
