import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Stethoscope, Search, Loader2, Save, ArrowRight, Plus, CheckCircle2, BadgeCheck, IndianRupee, Sparkles } from 'lucide-react'
import {
  watchClients, watchTreatments, addTreatment, updateTreatment, watchServiceCharges,
  setAccountingForTreatment, deleteAccountingForTreatment,
} from '../../lib/firestore'
import { CLINICAL_SECTIONS, CLINICAL_KEYS, formatAssessmentValue } from '../../lib/assessmentSchema'
import { todayISO, fmtDate } from '../../lib/format'
import { onlyDigits } from '../../lib/validate'
import { parseAssessment } from '../../lib/smartFill'
import DateField from '../../components/DateField'
import AssessmentField from '../../components/AssessmentField'
import VasScale from '../../components/VasScale'
import BodyPainSelector from '../../components/BodyPainSelector'
import TherapistSelect from '../../components/TherapistSelect'
import ServiceSelect from '../../components/ServiceSelect'
import MicButton from '../../components/MicButton'
import ContactActions from '../../components/ContactActions'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useUnsaved } from '../../context/UnsavedContext'

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']

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
  const [bill, setBill] = useState({ service: client.service || '', amount: '', paid: '', mode: 'Cash' })
  const [services, setServices] = useState([])
  const [smartOpen, setSmartOpen] = useState(false)
  const [smartText, setSmartText] = useState('')
  const [smartMsg, setSmartMsg] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [therapistInvalid, setTherapistInvalid] = useState(false)
  const { setDirty, guard } = useUnsaved()

  const editLoaded = useRef(false)
  useEffect(() => watchTreatments(client.id, setTreatments), [client.id])
  useEffect(() => watchServiceCharges(setServices), [])
  useEffect(() => () => setDirty(false), [setDirty])

  const billBalance = Math.max(0, (Number(bill.amount) || 0) - (Number(bill.paid) || 0))
  const setBillMoney = (k) => (e) => { setBill((b) => ({ ...b, [k]: onlyDigits(e.target.value).slice(0, 7) })); setDirty(true) }

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
    setBill({
      service: t.bill?.service || client.service || '',
      amount: t.bill?.amount != null ? String(t.bill.amount) : '',
      paid: t.bill?.paid != null ? String(t.bill.paid) : '',
      mode: t.bill?.mode || 'Cash',
    })
  }, [editId, treatments])

  const last = treatments[0] || null
  // Default the handler to the client's last therapist if none chosen yet.
  useEffect(() => { setTherapist((t) => t || last?.therapist || 'Sakthi Saravanan') }, [last])

  const set = (k) => (val) => { setForm((f) => ({ ...f, [k]: val })); setDirty(true) }
  const touch = () => setDirty(true)

  // Smart Fill (offline, keyword-based): best-guess fill from the consult text.
  function applySmart() {
    const { patch, filled } = parseAssessment(smartText)
    if (!filled.length) {
      setSmartMsg("Couldn't detect any fields. Try clear words like “pain sharp”, “VAS 6”, “knee flexion 100”, “built mesomorph”, “plan: dry needling”.")
      return
    }
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
    setSmartMsg(`Filled: ${filled.join(', ')}. Please review everything below and correct as needed before saving.`)
  }

  // AI Auto-fill: send the consult to the Groq-powered backend and apply the
  // validated result. Understands natural speech (no "proper inputs" needed).
  async function aiFill() {
    if (!smartText.trim()) { setSmartMsg('Type or dictate the consultation first, then tap AI Auto-fill.'); return }
    setAiBusy(true); setSmartMsg('')
    try {
      const res = await fetch('/api/ai-autofill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: smartText }) })
      const data = await res.json()
      if (data.error) {
        setSmartMsg(data.error === 'not-configured'
          ? 'AI isn’t set up yet — add GROQ_API_KEY in Vercel (see instructions). Meanwhile, “Offline fill” works.'
          : 'AI couldn’t process that — try again, or use “Offline fill”.')
      } else if (!data.keys?.length) {
        setSmartMsg('AI found nothing to fill — try describing the findings a bit more.')
      } else {
        setForm((f) => ({ ...f, ...data.patch }))
        setDirty(true)
        setSmartMsg(`AI filled ${data.keys.length} field group(s). Please review below and save.`)
      }
    } catch (_) {
      setSmartMsg('Couldn’t reach the AI (check internet). You can use “Offline fill” instead.')
    }
    setAiBusy(false)
  }

  async function save(e) {
    e.preventDefault(); setError('')
    if (!therapist) {
      setTherapistInvalid(true)
      setError('Please choose who is handling this patient.')
      requestAnimationFrame(() => document.getElementById('treat-therapist')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    setBusy(true)
    try {
      const billData = {
        service: (bill.service || '').trim(),
        amount: Number(bill.amount) || 0,
        paid: Number(bill.paid) || 0,
        balance: billBalance,
        mode: bill.mode,
      }
      const data = { date: date || todayISO(), therapist, nextSession: nextSession || '', bill: billData }
      CLINICAL_KEYS.forEach((k) => { const v = form[k]; data[k] = typeof v === 'string' ? v.trim() : v })

      let treatmentId = editId
      if (editId) await updateTreatment(client.id, editId, data)
      else { const ref = await addTreatment(client.id, data); treatmentId = ref.id }

      // Mirror the charge into Accounting (best-effort — a limited admin without
      // accounting access, or unpublished rules, must not break the save).
      try {
        if (billData.amount > 0 || billData.paid > 0) {
          await setAccountingForTreatment(treatmentId, {
            date: data.date,
            clientId: client.clientId, clientDocId: client.id, clientName: client.name,
            service: billData.service, therapist,
            amount: billData.amount, paid: billData.paid, balance: billData.balance, mode: billData.mode,
          })
        } else {
          await deleteAccountingForTreatment(treatmentId)
        }
      } catch (_) { /* accounting sync is best-effort */ }

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
            <button onClick={() => { if (editId) navigate(`/admin/treatment?client=${client.id}`); else { setForm(blank()); setNextSession(''); setBill({ service: client.service || '', amount: '', paid: '', mode: 'Cash' }); setSaved(false) } }} className="btn-outline">Add another session</button>
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

      {/* Smart Fill — dictate/paste the whole consult, then auto-fill the form */}
      <div className="card p-5">
        <button type="button" onClick={() => setSmartOpen((v) => !v)} className="flex w-full items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-base font-bold text-brand-700"><Sparkles size={17} /> Speak / paste the whole consult → auto-fill</span>
          <span className="text-xs font-medium text-slate-400">{smartOpen ? 'Hide' : 'Show'}</span>
        </button>
        {smartOpen && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500">
              Dictate (floating mic or your phone keyboard mic) or paste the full consultation here, then tap
              <span className="font-semibold"> AI Auto-fill</span> — it understands natural speech and fills the dropdowns, ROM, girth and text below.
              (<span className="font-semibold">Offline fill</span> is a no-internet keyword fallback.) Always review before saving.
            </p>
            <textarea
              className="input min-h-[130px]"
              value={smartText}
              onChange={(e) => setSmartText(e.target.value)}
              placeholder="e.g. 'Complaint: right knee pain 3 weeks after football. Pain sharp, VAS 6, aggravated by stairs, relieved by rest. Built mesomorph. Swelling present, no crepitus. Knee flexion 100, extension 0, pain end-range. Plan: dry needling, quads strengthening. Follow up in 5 days.'"
            />
            <div className="flex flex-wrap items-center gap-2">
              <MicButton onText={(txt) => { setSmartText((p) => (p ? `${p} ${txt}` : txt)); setDirty(true) }} label="Speak" />
              <button type="button" onClick={aiFill} disabled={aiBusy} className="btn-primary">
                {aiBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {aiBusy ? 'Thinking…' : 'AI Auto-fill'}
              </button>
              <button type="button" onClick={applySmart} className="btn-outline">Offline fill</button>
              <button type="button" onClick={() => { setSmartText(''); setSmartMsg('') }} className="btn-ghost">Clear</button>
            </div>
            {smartMsg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{smartMsg}</p>}
          </div>
        )}
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

      {/* Charges & billing — saved with the session, mirrored to Accounting and the report */}
      <div className="card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-700"><IndianRupee size={16} /> Charges &amp; Billing</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label text-sm">Service</label>
            <ServiceSelect value={bill.service} services={services} onChange={(name, amount) => { setBill((b) => ({ ...b, service: name, ...(amount != null ? { amount: String(amount) } : {}) })); setDirty(true) }} />
          </div>
          <div><label className="label text-sm">Amount charged (Rs.)</label><input className="input" inputMode="numeric" value={bill.amount} onChange={setBillMoney('amount')} placeholder="0" /></div>
          <div><label className="label text-sm">Amount paid (Rs.)</label><input className="input" inputMode="numeric" value={bill.paid} onChange={setBillMoney('paid')} placeholder="0" /></div>
          <div><label className="label text-sm">Mode</label><select className="input" value={bill.mode} onChange={(e) => { setBill((b) => ({ ...b, mode: e.target.value })); touch() }}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Balance due</span>
          <span className={`font-bold ${billBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Rs. {billBalance.toLocaleString('en-IN')}</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">Saved with this session and shown in Accounting &amp; the client report. Leave the amounts empty if there’s no charge.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => guard(() => navigate('/admin/clients'))} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {editId ? 'Update treatment' : 'Save treatment'}</button>
      </div>
    </form>
  )
}
