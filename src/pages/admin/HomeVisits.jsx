import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Home, Search, Loader2, Save, ArrowRight, Plus, CheckCircle2, BadgeCheck, IndianRupee, Send, FileDown,
  Pencil, MapPin, Filter,
} from 'lucide-react'
import {
  watchClients, watchHomeVisits, addHomeVisit, updateHomeVisit, watchServiceCharges,
  setAccountingForHomeVisit, deleteAccountingForHomeVisit, getClientNotesOnce, updateClient,
} from '../../lib/firestore'
import { useAuth } from '../../context/AuthContext'
import { HOME_VISIT_SECTIONS, HOME_VISIT_KEYS, formatAssessmentValue } from '../../lib/assessmentSchema'
import { todayISO, fmtDate } from '../../lib/format'
import { onlyDigits } from '../../lib/validate'
import { generateHomeVisitReport } from '../../lib/pdf'
import DateField from '../../components/DateField'
import AssessmentField from '../../components/AssessmentField'
import VasScale from '../../components/VasScale'
import BodyPainSelector from '../../components/BodyPainSelector'
import TherapistSelect from '../../components/TherapistSelect'
import ServiceSelect from '../../components/ServiceSelect'
import ContactActions from '../../components/ContactActions'
import AdminPageHeader from '../../components/AdminPageHeader'
import RehabBadge from '../../components/RehabBadge'
import FitnessBadge from '../../components/FitnessBadge'
import HomeVisitBadge from '../../components/HomeVisitBadge'
import PatientAvatar from '../../components/PatientAvatar'
import ClientForm from '../../components/ClientForm'
import { useUnsaved } from '../../context/UnsavedContext'

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']

const blank = () => Object.fromEntries(HOME_VISIT_KEYS.map((k) => [k, '']))

export default function HomeVisits() {
  const { role } = useAuth()
  const [clients, setClients] = useState([])
  const [params, setParams] = useSearchParams()
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  useEffect(() => watchClients(setClients), [])

  const clientId = params.get('client') || ''
  const client = useMemo(() => clients.find((c) => c.id === clientId) || null, [clients, clientId])

  if (!clientId) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Home Visits">
          {showForm && <button onClick={() => setShowForm(false)} className="text-sm font-medium text-brand-600 hover:underline">Back to patient list</button>}
        </AdminPageHeader>
        {showForm ? (
          <ClientForm
            clients={clients}
            defaultPrograms={['W2W Home Visit']}
            lockProgram={role === 'homevisit' ? 'W2W Home Visit' : undefined}
            onCreated={(id) => { setShowForm(false); setParams({ client: id }) }}
            onClose={() => setShowForm(false)}
          />
        ) : (
          <HomeVisitClientPicker clients={clients} role={role} onPick={(id) => setParams({ client: id })} onNew={() => setShowForm(true)} />
        )}
      </div>
    )
  }

  if (!clients.length) return <div className="grid place-items-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>

  if (!client) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Home Visits" />
        <HomeVisitClientPicker clients={clients} role={role} note="That patient could not be found — pick again." onPick={(id) => setParams({ client: id })} onNew={() => setShowForm(true)} />
      </div>
    )
  }

  return (
    <HomeVisitForm
      key={`${client.id}:${params.get('visit') || ''}`}
      client={client}
      editId={params.get('visit') || ''}
      role={role}
      onChangeClient={() => setParams({})}
      navigate={navigate}
    />
  )
}

const isHomeVisitClient = (c) => Array.isArray(c?.programs) && c.programs.includes('W2W Home Visit')

function HomeVisitClientPicker({ clients, role, onPick, onNew, note }) {
  const [q, setQ] = useState('')
  // Default to Home-Visit-registered patients only — a Treatment-only client
  // shouldn't clutter this list. "Show all clients" reveals everyone when a
  // clinic patient needs a home visit added for the first time — hidden for
  // the freelancer login, which can only ever see Home Visit patients anyway.
  const [showAll, setShowAll] = useState(false)
  const [therapistFilter, setTherapistFilter] = useState('')
  const hvClients = clients.filter(isHomeVisitClient)
  const pool = role === 'homevisit' ? hvClients : (showAll ? clients : hvClients)
  // Which freelance/handling physiotherapist has been assigned each patient —
  // `client.therapist` is kept current as the latest visit's therapist
  // (see addHomeVisit), so no extra reads are needed to filter by it.
  const therapistOptions = [...new Set(hvClients.map((c) => c.therapist).filter(Boolean))].sort()
  const byTherapist = therapistFilter ? pool.filter((c) => c.therapist === therapistFilter) : pool
  const filtered = q
    ? byTherapist.filter((c) => [c.name, c.phone, c.clientId, c.email].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()))
    : byTherapist

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Home size={22} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Choose a patient</h2>
            <p className="text-sm text-slate-500">Tap a patient below to record their home visit, or register a new one.</p>
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
            />
          </div>
          <button onClick={onNew} className="btn-outline shrink-0"><Plus size={16} /> Register new patient</button>
        </div>
        {therapistOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-400"><Filter size={13} /> Physiotherapist</span>
            <button type="button" onClick={() => setTherapistFilter('')} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${!therapistFilter ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</button>
            {therapistOptions.map((t) => (
              <button key={t} type="button" onClick={() => setTherapistFilter(t)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${therapistFilter === t ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
            ))}
          </div>
        )}
        {role !== 'homevisit' && hvClients.length > 0 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-semibold text-brand-600 hover:underline">
            {showAll ? 'Show only Home Visit patients' : 'Show all clients'}
          </button>
        )}
      </div>

      {clients.length === 0 ? (
        <p className="card py-12 text-center text-sm text-slate-400">No patients yet. Register your first patient above.</p>
      ) : filtered.length === 0 ? (
        <p className="card py-12 text-center text-sm text-slate-400">
          {therapistFilter ? `No patients assigned to ${therapistFilter}.` : showAll ? `No patients match “${q}”.` : hvClients.length === 0 ? 'No patients registered for Home Visits yet.' : `No home visit patients match “${q}”.`}
        </p>
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
                  <PatientAvatar client={c} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs font-medium text-brand-600"><BadgeCheck size={13} /> {c.clientId}<RehabBadge client={c} /><FitnessBadge client={c} /><HomeVisitBadge client={c} /></p>
                  </div>
                </div>
              </div>
              {c.address && <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0" /> {c.address}</p>}
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
// has the full picture (and the visit address) before heading out.
const SUMMARY_FACTS = [
  ['age', 'Age'], ['gender', 'Gender'], ['email', 'Email'], ['occupation', 'Occupation / Sports'],
  ['height', 'Height (cm)'], ['weight', 'Weight (kg)'], ['handDominance', 'Hand dominance'], ['referredBy', 'Referred by'],
]
function PatientSummary({ client, role }) {
  const facts = SUMMARY_FACTS.filter(([k]) => client[k])
  const hasArea = Array.isArray(client.painAreas) && client.painAreas.length > 0
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-700">Patient details</p>
        {role !== 'homevisit' && <Link to={`/admin/clients/${client.id}`} className="text-xs font-semibold text-brand-600 hover:underline">Full profile →</Link>}
      </div>
      {client.address && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <MapPin size={15} className="mt-0.5 shrink-0" /> <span><span className="font-semibold">Visit address:</span> {client.address}</span>
        </p>
      )}
      {facts.length > 0 && (
        <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([k, label]) => (
            <div key={k}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-0.5 break-words text-sm text-slate-800">{formatAssessmentValue(client[k])}</dd>
            </div>
          ))}
        </dl>
      )}
      {hasArea && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Pain areas marked ({client.painAreas.length})</p>
          <BodyPainSelector value={client.painAreas} readonly />
        </div>
      )}
    </div>
  )
}

function HomeVisitForm({ client, editId = '', role, onChangeClient, navigate }) {
  const [visits, setVisits] = useState([])
  const [form, setForm] = useState(blank)
  const [date, setDate] = useState(todayISO())
  const [nextSession, setNextSession] = useState('')
  // No default therapist — a home visit must always name the physiotherapist
  // who actually conducted it (freelancers vary per client/per visit), so
  // this is deliberately never pre-filled, unlike the clinic's own therapist field.
  const [therapist, setTherapist] = useState('')
  const [bill, setBill] = useState({ service: 'Home Visit', amount: '', paid: '', mode: 'Cash', addToAccounting: true })
  const [services, setServices] = useState([])
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reportBusy, setReportBusy] = useState('')
  const [reportMsg, setReportMsg] = useState('')
  const [error, setError] = useState('')
  const [therapistInvalid, setTherapistInvalid] = useState(false)
  const [editRegOpen, setEditRegOpen] = useState(false)
  const { setDirty, guard } = useUnsaved()

  const editLoaded = useRef(false)
  useEffect(() => watchHomeVisits(client.id, setVisits), [client.id])
  // No Accounting access (and no Charges & Billing section shown) for the
  // freelancer login — skip the read entirely rather than error on it.
  useEffect(() => { if (role !== 'homevisit') return watchServiceCharges(setServices) }, [role])
  useEffect(() => () => setDirty(false), [setDirty])

  const billBalance = Math.max(0, (Number(bill.amount) || 0) - (Number(bill.paid) || 0))
  const setBillMoney = (k) => (e) => { setBill((b) => ({ ...b, [k]: onlyDigits(e.target.value).slice(0, 7) })); setDirty(true) }

  // Edit mode: load the chosen saved visit into the form (once, when it arrives).
  useEffect(() => {
    if (!editId || editLoaded.current || !visits.length) return
    const v = visits.find((x) => x.id === editId)
    if (!v) return
    editLoaded.current = true
    const next = blank()
    HOME_VISIT_KEYS.forEach((k) => { next[k] = v[k] ?? '' })
    setForm(next)
    setDate(v.date || todayISO())
    setNextSession(v.nextSession || '')
    setTherapist(v.therapist || '')
    setBill({
      service: v.bill?.service || 'Home Visit',
      amount: v.bill?.amount != null ? String(v.bill.amount) : '',
      paid: v.bill?.paid != null ? String(v.bill.paid) : '',
      mode: v.bill?.mode || 'Cash',
      addToAccounting: v.bill?.addToAccounting !== false,
    })
  }, [editId, visits])

  const last = visits[0] || null

  const set = (k) => (val) => { setForm((f) => ({ ...f, [k]: val })); setDirty(true) }
  const touch = () => setDirty(true)

  async function save(e) {
    e.preventDefault(); setError('')
    if (!therapist) {
      setTherapistInvalid(true)
      setError('Please choose who is handling this patient.')
      requestAnimationFrame(() => document.getElementById('hv-therapist')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
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
        addToAccounting: bill.addToAccounting !== false,
      }
      const data = { date: date || todayISO(), therapist, nextSession: nextSession || '', bill: billData }
      HOME_VISIT_KEYS.forEach((k) => { const v = form[k]; data[k] = typeof v === 'string' ? v.trim() : v })

      let visitId = editId
      if (editId) await updateHomeVisit(client.id, editId, data)
      else { visitId = await addHomeVisit(client.id, data) }

      // The freelancer login never sees Charges & Billing (and has no
      // Firestore access to `accounting`), so skip this sync entirely for it.
      if (role !== 'homevisit') {
        try {
          if (billData.addToAccounting && (billData.amount > 0 || billData.paid > 0)) {
            await setAccountingForHomeVisit(visitId, {
              date: data.date,
              clientId: client.clientId, clientDocId: client.id, clientName: client.name,
              service: billData.service, therapist,
              amount: billData.amount, paid: billData.paid, balance: billData.balance, mode: billData.mode,
            })
          } else {
            await deleteAccountingForHomeVisit(visitId)
          }
        } catch (_) { /* accounting sync is best-effort */ }
      }

      // A patient visited at home is, by definition, a Home Visit patient —
      // tag it automatically (best-effort, never blocks the save).
      try {
        if (!Array.isArray(client.programs) || !client.programs.includes('W2W Home Visit')) {
          await updateClient(client.id, { programs: [...(Array.isArray(client.programs) ? client.programs : []), 'W2W Home Visit'] })
        }
      } catch (_) { /* best-effort */ }

      setDirty(false)
      setSaved(true)
    } catch (err) {
      console.error('save home visit failed:', err)
      setError('Could not save the home visit. Please try again.')
    }
    setBusy(false)
  }

  async function sendOrDownloadReport(action) {
    setReportBusy(action); setReportMsg('')
    try {
      const notes = await getClientNotesOnce(client.id)
      const sessions = [...visits].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const baseClient = { ...client, assessmentDate: sessions[0]?.date || todayISO() }
      const reportBill = billBalance >= 0 && (Number(bill.amount) > 0 || Number(bill.paid) > 0)
        ? { amount: Number(bill.amount) || 0, paid: Number(bill.paid) || 0, balance: billBalance, mode: bill.mode }
        : null
      const res = await generateHomeVisitReport(baseClient, { notes, progress: [], therapist, bill: reportBill, action, sessions, signature: null })
      setReportMsg(res === 'shared' ? 'Report shared.' : res === 'downloaded' ? 'Report downloaded.' : '')
    } catch (err) {
      console.error('report failed:', err)
      setReportMsg('Could not generate the report. Please try again.')
    }
    setReportBusy('')
  }

  if (saved) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Home Visits" />
        <div className="card mx-auto max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-500" size={48} />
          <h2 className="mt-3 text-xl font-bold">{editId ? 'Home visit updated' : 'Home visit saved'}</h2>
          <p className="mt-1 text-slate-500">Visit {editId ? 'updated' : 'recorded'} for {client.name} ({client.clientId}).</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {role !== 'homevisit' && <Link to={`/admin/clients/${client.id}`} className="btn-primary">Open patient page <ArrowRight size={16} /></Link>}
            <button onClick={() => sendOrDownloadReport('share')} disabled={!!reportBusy} className="btn-outline">{reportBusy === 'share' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send report</button>
            <button onClick={() => sendOrDownloadReport('download')} disabled={!!reportBusy} className="btn-outline">{reportBusy === 'download' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Download report</button>
            <button onClick={() => { if (editId) navigate(`/admin/home-visits?client=${client.id}`); else { setForm(blank()); setNextSession(''); setBill({ service: 'Home Visit', amount: '', paid: '', mode: 'Cash' }); setSaved(false) } }} className="btn-outline">Add another visit</button>
            <button onClick={onChangeClient} className="btn-ghost">Another patient</button>
          </div>
          {reportMsg && <p className="mt-3 text-sm text-slate-500">{reportMsg}</p>}
        </div>
      </div>
    )
  }

  return (
    <>
    <form onSubmit={save} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault() }} className="space-y-5">
      <AdminPageHeader title="Home Visits">
        {role !== 'homevisit' && (
          <button type="button" onClick={() => guard(() => navigate(`/admin/clients/${client.id}`))} className="text-sm font-medium text-brand-600 hover:underline">Open patient page →</button>
        )}
      </AdminPageHeader>

      <div className="card space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-4">
          <div>
            <p className="text-lg font-bold text-slate-900">{client.name}</p>
            <p className="flex items-center text-sm text-slate-500">{client.clientId}<RehabBadge client={client} /><FitnessBadge client={client} /><HomeVisitBadge client={client} /> · {client.phone}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditRegOpen(true)} className="btn-outline px-3 py-1.5 text-sm"><Pencil size={14} /> Update Registration</button>
            <button type="button" onClick={() => guard(onChangeClient)} className="btn-ghost px-3 py-1.5 text-sm">Change patient</button>
          </div>
        </div>

        <PatientSummary client={client} role={role} />

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label text-sm">Visit conducted by (Physiotherapist) *</label>
            <TherapistSelect id="hv-therapist" source="homeVisit" placeholder="— Select or add physiotherapist —" invalid={therapistInvalid} value={therapist} onChange={(v) => { setTherapist(v); touch(); setTherapistInvalid(false) }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label text-sm">Visit date</label><DateField value={date} onChange={(iso) => { setDate(iso); touch() }} max={todayISO()} /></div>
            <div><label className="label text-sm">Next visit date</label><DateField value={nextSession} onChange={(iso) => { setNextSession(iso); touch() }} /></div>
          </div>
        </div>
        {last && (
          <p className="text-sm text-slate-400">
            Previous visit: {fmtDate(last.date)}{last.therapist ? ` · ${last.therapist}` : ''} — its values show faintly below; press Tab in a field to keep them.
          </p>
        )}
      </div>

      {HOME_VISIT_SECTIONS.map((s) => (
        <fieldset key={s.title} className="card p-5">
          <legend className="px-2 text-base font-bold text-brand-700">{s.title}</legend>
          <div className={`grid gap-3 ${s.cols1 ? '' : 'sm:grid-cols-2'}`}>
            {s.fields.map((f) => (
              <Fragment key={f.k}>
                <AssessmentField f={f} value={form[f.k]} ghost={last ? last[f.k] : undefined} onChange={set(f.k)} big />
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

      <div className="card p-5">
        <label className="label text-sm">Next visit date</label>
        <div className="max-w-xs">
          <DateField value={nextSession} onChange={(iso) => { setNextSession(iso); touch() }} min={todayISO()} />
        </div>
        <p className="mt-1 text-xs text-slate-400">Same as the “Next visit date” at the top — updating either keeps both in sync.</p>
      </div>

      {role !== 'homevisit' && (
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
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={bill.addToAccounting !== false} onChange={(e) => { setBill((b) => ({ ...b, addToAccounting: e.target.checked })); setDirty(true) }} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Also record a separate charge in Accounting (visits already record theirs)
        </label>
        <p className="mt-2 text-xs text-slate-400">Saved with this visit and shown in Accounting &amp; the client report. Leave the amounts empty if there’s no charge.</p>
      </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => sendOrDownloadReport('share')} disabled={!!reportBusy} className="btn-outline">{reportBusy === 'share' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send report</button>
        <button type="button" onClick={() => sendOrDownloadReport('download')} disabled={!!reportBusy} className="btn-outline">{reportBusy === 'download' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Download report</button>
        <button type="button" onClick={() => guard(() => navigate(role === 'homevisit' ? '/admin/home-visits' : '/admin/clients'))} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {editId ? 'Update visit' : 'Save visit'}</button>
      </div>
      {reportMsg && <p className="text-right text-sm text-slate-500">{reportMsg}</p>}
    </form>

    {editRegOpen && (
      <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="mx-auto my-4 max-w-3xl">
          <ClientForm editClient={client} lockProgram={role === 'homevisit' ? 'W2W Home Visit' : undefined} onCreated={() => setEditRegOpen(false)} onClose={() => setEditRegOpen(false)} />
        </div>
      </div>
    )}
    </>
  )
}
