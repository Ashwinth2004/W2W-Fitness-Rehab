import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BadgeCheck, FileDown, Pencil, Trash2, Plus, Save, X, Loader2,
  NotebookPen, Stethoscope, User, Calendar, Send, IndianRupee, MapPin,
  CalendarClock, Activity, ChevronRight,
} from 'lucide-react'
import {
  getClient, updateClient, deleteClient, watchClientNotes, addClientNote, deleteClientNote,
  watchTreatments, deleteTreatment, updateTreatment, getClientNotesOnce, addAccountingEntry,
} from '../../lib/firestore'
import { fmtDate, fmtDateTime, todayISO } from '../../lib/format'
import { onlyDigits, isValidMobile } from '../../lib/validate'
import { BASIC_SECTIONS, BASIC_KEYS } from '../../lib/assessmentSchema'
import ContactActions from '../../components/ContactActions'
import DateField from '../../components/DateField'
import AssessmentField from '../../components/AssessmentField'
import TherapistSelect from '../../components/TherapistSelect'
import { generateClientReport } from '../../lib/pdf'

const SESSION_GROUPS = [
  ['Pain assessment', [['painArea', 'Area'], ['painDuration', 'Duration'], ['painType', 'Type'], ['painADL', 'Impact on ADL'], ['painAggravating', 'Aggravating'], ['painRelieving', 'Relieving'], ['vas', 'VAS (0–10)']]],
  ['Objective', [['built', 'Built'], ['deformities', 'Deformities / Edema'], ['gait', 'Gait'], ['objectiveNotes', 'Notes']]],
  ['On palpation', [['tenderness', 'Tenderness'], ['swelling', 'Swelling / Spasm'], ['crepitus', 'Crepitus']]],
  ['On examination', [['rom', 'ROM'], ['endFeel', 'End feel'], ['grip', 'Grip'], ['muscleTone', 'Muscle tone'], ['girth', 'Girth'], ['limbLength', 'Limb length'], ['reflexes', 'Reflexes'], ['specialTests', 'Special tests']]],
  ['Assessment & plan', [['opinion', 'Opinion'], ['treatmentOptions', 'Treatment options'], ['expectedRecovery', 'Expected recovery'], ['treatmentPlan', 'Treatment plan'], ['followUp', 'Follow up']]],
]
const ACTIVITY = [['walking', 'Walking / steps'], ['exercise', 'Exercise'], ['deskWork', 'Desk work'], ['sleep', 'Sleep'], ['hydration', 'Hydration']]
const REG_FIELDS = [['email', 'Email'], ['occupation', 'Occupation / Sports'], ['height', 'Height (cm)'], ['weight', 'Weight (kg)'], ['handDominance', 'Hand dominance'], ['referredBy', 'Referred by']]

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(undefined)
  const [notes, setNotes] = useState([])
  const [treatments, setTreatments] = useState([])
  const [editing, setEditing] = useState(false)
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    getClient(id).then(setClient)
    const u1 = watchClientNotes(id, setNotes)
    const u2 = watchTreatments(id, setTreatments)
    return () => { u1(); u2() }
  }, [id])

  if (client === undefined) return <div className="grid place-items-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
  if (client === null) return (
    <div className="py-20 text-center">
      <p className="text-slate-500">Client not found.</p>
      <Link to="/admin/clients" className="btn-outline mt-4">Back to clients</Link>
    </div>
  )

  async function handleDelete() {
    if (!window.confirm(`Delete ${client.name} (${client.clientId}) permanently? This cannot be undone.`)) return
    await deleteClient(id)
    navigate('/admin/clients')
  }

  const activity = ACTIVITY.filter(([k]) => client[k])
  const reg = REG_FIELDS.filter(([k]) => client[k])

  return (
    <div className="space-y-6">
      <Link to="/admin/clients" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:gap-2">
        <ArrowLeft size={16} /> All clients
      </Link>

      {/* Header */}
      <div className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <p className="flex items-center gap-1.5 text-sm font-medium text-brand-600"><BadgeCheck size={15} /> {client.clientId}</p>
              <div className="mt-2"><ContactActions phone={client.phone} showNumber /></div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            <Link to={`/admin/treatment?client=${id}`} className="btn-outline"><Stethoscope size={16} /> New Treatment</Link>
            <button onClick={() => setReporting(true)} className="btn-primary"><FileDown size={18} /> Generate Report</button>
            <button onClick={() => setEditing(true)} className="btn-ghost"><Pencil size={16} /> Update Registration</button>
            <button onClick={handleDelete} className="btn-ghost text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
          </div>
        </div>

        {/* Quick facts */}
        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={User} label="Age / Gender" value={`${client.age || '—'} / ${client.gender || '—'}`} />
          <Fact icon={Calendar} label="Registered" value={fmtDate(client.registeredOn || client.createdAt)} />
          <Fact icon={NotebookPen} label="Primary Service" value={client.service || '—'} />
          <Fact icon={Stethoscope} label="Handled by" value={client.therapist || '—'} />
        </div>
        {client.address && <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={14} className="shrink-0" /> {client.address}</p>}
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1"><Calendar size={12} /> First registered: <span className="font-medium text-slate-500">{fmtDate(client.registeredOn || client.createdAt)}</span></span>
          {client.updatedAt && <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> Last updated: <span className="font-medium text-slate-500">{fmtDateTime(client.updatedAt)}</span></span>}
        </p>
      </div>

      {/* Registration details — every field entered at intake */}
      {reg.length > 0 && (
        <div className="card p-5 md:p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900">Registration Details</h3>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {reg.map(([k, label]) => (
              <div key={k}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-0.5 text-sm text-slate-800">{client[k]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Complaint + history (basic details) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoBlock title="Chief Complaint / Goal" text={client.complaint} empty="No complaint recorded." />
        <InfoBlock
          title="Medical History / Previous Reports"
          text={[
            client.pastHistory ? `Past medical history:\n${client.pastHistory}` : '',
            client.presentHistory ? `Present medical history:\n${client.presentHistory}` : '',
            client.mechanism ? `Mechanism of injury:\n${client.mechanism}` : '',
          ].filter(Boolean).join('\n\n') || client.history}
          empty="No history recorded."
        />
      </div>

      {activity.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><Activity size={18} className="text-brand-600" /> Lifestyle &amp; Activity</h2>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {activity.map(([k, label]) => (
              <div key={k} className="flex gap-2 text-sm"><dt className="shrink-0 text-slate-400">{label}:</dt><dd className="text-slate-700">{String(client[k])}</dd></div>
            ))}
          </dl>
        </div>
      )}

      {/* Treatment sessions (per visit) */}
      <TreatmentSessions clientId={id} treatments={treatments} />

      {/* Notes */}
      <NotesSection clientId={id} notes={notes} />

      {editing && <EditClientModal client={client} onClose={() => setEditing(false)} onSaved={async () => { setClient(await getClient(id)); setEditing(false) }} />}
      {reporting && <ReportModal client={client} treatments={treatments} onClose={() => setReporting(false)} />}
    </div>
  )
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center md:flex-row md:gap-3 md:text-left">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon size={18} /></div>
      <div className="min-w-0"><p className="text-xs text-slate-400">{label}</p><p className="truncate font-medium text-slate-800">{value}</p></div>
    </div>
  )
}

function InfoBlock({ title, text, empty }) {
  return (
    <div className="card p-5">
      <h2 className="font-bold text-slate-900">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{text || <span className="text-slate-400">{empty}</span>}</p>
    </div>
  )
}

// ---- Treatment sessions (per-visit clinical records) ----------------------
function TreatmentSessions({ clientId, treatments }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><Stethoscope size={18} className="text-brand-600" /> Treatment Sessions {treatments.length > 0 && <span className="text-sm font-medium text-slate-400">({treatments.length})</span>}</h2>
        <Link to={`/admin/treatment?client=${clientId}`} className="btn-ghost px-3 py-1.5 text-sm"><Plus size={16} /> New session</Link>
      </div>
      {treatments.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No treatment sessions yet. Record one from the Treatment module.</p>
      ) : (
        <div className="space-y-3">
          {treatments.map((t, i) => <SessionItem key={t.id} clientId={clientId} t={t} defaultOpen={i === 0} />)}
        </div>
      )}
    </div>
  )
}

// One treatment session — collapsible, with an editable per-session note.
function SessionItem({ clientId, t, defaultOpen }) {
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(t.note || '')
  const [savingNote, setSavingNote] = useState(false)
  const groups = SESSION_GROUPS.map(([title, pairs]) => [title, pairs.filter(([k]) => t[k])]).filter(([, p]) => p.length)

  async function saveNote() {
    setSavingNote(true)
    try { await updateTreatment(clientId, t.id, { note: noteText.trim() }); setEditingNote(false) } finally { setSavingNote(false) }
  }

  return (
    <details open={defaultOpen} className="rounded-2xl border border-slate-100 [&[open]_.chev]:rotate-90">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4">
        <span className="flex flex-wrap items-center gap-x-3 text-sm">
          <ChevronRight size={16} className="chev shrink-0 text-slate-400 transition-transform" />
          <span className="font-semibold text-brand-700">{fmtDate(t.date)}</span>
          {t.therapist && <span className="text-slate-500">{t.therapist}</span>}
          {t.nextSession && <span className="inline-flex items-center gap-1 text-slate-500"><CalendarClock size={13} /> Next: {fmtDate(t.nextSession)}</span>}
          {t.note && <span className="inline-flex items-center gap-1 text-xs text-amber-600"><NotebookPen size={12} /> note</span>}
        </span>
        <span className="text-xs text-slate-400">view</span>
      </summary>

      <div className="border-t border-slate-100 p-4 pt-3">
        {groups.length > 0 && (
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {groups.map(([title, pairs]) => (
              <div key={title}>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">{title}</p>
                <dl className="space-y-1">
                  {pairs.map(([k, label]) => (
                    <div key={k} className="flex gap-2 text-sm"><dt className="shrink-0 text-slate-400">{label}:</dt><dd className="whitespace-pre-line text-slate-700">{String(t[k])}</dd></div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}

        {/* Per-session note */}
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Session note</p>
          {editingNote ? (
            <div>
              <textarea className="input min-h-[60px]" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note for this session…" autoFocus />
              <div className="mt-2 flex gap-2">
                <button onClick={saveNote} disabled={savingNote} className="btn-primary px-3 py-1.5 text-xs">{savingNote ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save note</button>
                <button onClick={() => { setNoteText(t.note || ''); setEditingNote(false) }} className="btn-ghost px-3 py-1.5 text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-line text-sm text-slate-700">{t.note || <span className="text-slate-400">No note yet.</span>}</p>
              <button onClick={() => { setNoteText(t.note || ''); setEditingNote(true) }} className="shrink-0 text-xs font-semibold text-brand-600 hover:underline">{t.note ? 'Edit' : '+ Add note'}</button>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button onClick={() => window.confirm('Delete this treatment session?') && deleteTreatment(clientId, t.id)} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"><Trash2 size={14} /> Delete session</button>
        </div>
      </div>
    </details>
  )
}

// ---- Notes ----------------------------------------------------------------
function NotesSection({ clientId, notes }) {
  const [form, setForm] = useState({ date: todayISO(), text: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function add(e) {
    e.preventDefault()
    if (!form.text.trim()) return
    await addClientNote(clientId, { date: form.date || todayISO(), text: form.text.trim() })
    setForm({ date: todayISO(), text: '' })
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><NotebookPen size={18} className="text-brand-600" /> Visit Notes</h2>
      <form onSubmit={add} className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[160px,1fr,auto] sm:items-end">
        <div><label className="label text-xs">Date</label><DateField value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} max={todayISO()} /></div>
        <div><label className="label text-xs">Note text</label><textarea className="input min-h-[44px]" value={form.text} onChange={set('text')} placeholder="Observations, follow-up notes…" /></div>
        <button className="btn-primary"><Plus size={16} /> Add</button>
      </form>

      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-700">{fmtDate(n.date)}</p>
                <button onClick={() => deleteClientNote(clientId, n.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---- Report + billing modal ----------------------------------------------
const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']

function ReportModal({ client, treatments, onClose }) {
  const [selectedIds, setSelectedIds] = useState(() => treatments.map((t) => t.id)) // all by default
  const [therapist, setTherapist] = useState(client.therapist || 'Sakthi Saravanan')
  const [chargeDate, setChargeDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [paid, setPaid] = useState('')
  const [mode, setMode] = useState('Cash')
  const [withBilling, setWithBilling] = useState(true)
  const [record, setRecord] = useState(true)
  const [busy, setBusy] = useState('')
  const [recorded, setRecorded] = useState(false)
  const [msg, setMsg] = useState('')

  const allSelected = treatments.length > 0 && selectedIds.length === treatments.length
  const toggleSession = (id) => setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const toggleAll = () => setSelectedIds(allSelected ? [] : treatments.map((t) => t.id))

  const balance = Math.max(0, (Number(amount) || 0) - (Number(paid) || 0))
  const money = (set) => (e) => set(onlyDigits(e.target.value).slice(0, 7))

  async function go(action) {
    setBusy(action); setMsg('')
    try {
      const notes = await getClientNotesOnce(client.id)
      // Combine the selected sessions (one, several, or all) into a single report.
      const sessions = treatments
        .filter((t) => selectedIds.includes(t.id))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const baseClient = { ...client, assessmentDate: sessions[0]?.date || todayISO() }
      const bill = withBilling ? { amount: Number(amount) || 0, paid: Number(paid) || 0, balance, mode } : null
      const res = await generateClientReport(baseClient, { notes, progress: [], therapist, bill, action, sessions })
      if (withBilling && record && !recorded && (bill.amount > 0 || bill.paid > 0)) {
        await addAccountingEntry({
          date: chargeDate || todayISO(),
          clientId: client.clientId, clientDocId: client.id, clientName: client.name,
          service: client.service || '', therapist,
          amount: bill.amount, paid: bill.paid, balance: bill.balance, mode,
        })
        setRecorded(true)
      }
      if (res === 'shared') setMsg('Report shared.')
      else if (res === 'downloaded') setMsg('Report downloaded.')
    } catch (err) {
      console.error('report failed:', err)
      setMsg('Could not generate the report. Please try again.')
    }
    setBusy('')
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg animate-pop-in space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Generate Report</h2>
            <p className="text-sm text-slate-500">{client.name} · {client.clientId}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={22} /></button>
        </div>

        {/* Sessions to include — tick one, several, or all (combined into one report) */}
        <div>
          <div className="flex items-center justify-between">
            <label className="label text-xs">Sessions to include</label>
            {treatments.length > 0 && (
              <button type="button" onClick={toggleAll} className="text-xs font-semibold text-brand-600 hover:underline">
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>
          {treatments.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">No treatment sessions yet — this report will include basic details only.</p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {treatments.map((t, i) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSession(t.id)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                  <span className="font-medium text-slate-700">{fmtDate(t.date)}</span>
                  {t.therapist && <span className="text-xs text-slate-400">· {t.therapist}</span>}
                  {i === 0 && <span className="text-[11px] font-semibold text-brand-500">latest</span>}
                </label>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">Tick one, several, or all sessions — they're combined into a single report.</p>
        </div>

        {/* Therapist */}
        <div>
          <label className="label text-xs">Treatment given by (Physiotherapist)</label>
          <TherapistSelect value={therapist} onChange={setTherapist} />
        </div>

        {/* Billing */}
        <div className="rounded-2xl border border-slate-100 p-4">
          <label className="flex items-center gap-2 text-sm font-bold text-brand-700">
            <input type="checkbox" checked={withBilling} onChange={(e) => setWithBilling(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            <IndianRupee size={15} /> Include billing in report
          </label>
          {withBilling ? (
            <div className="mt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label text-xs">Date</label><DateField value={chargeDate} onChange={setChargeDate} max={todayISO()} /></div>
                <div><label className="label text-xs">Mode of payment</label><select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
                <div><label className="label text-xs">Amount charged (Rs.)</label><input className="input" inputMode="numeric" value={amount} onChange={money(setAmount)} placeholder="0" /></div>
                <div><label className="label text-xs">Amount paid (Rs.)</label><input className="input" inputMode="numeric" value={paid} onChange={money(setPaid)} placeholder="0" /></div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-500">Balance due</span>
                <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Rs. {balance.toLocaleString('en-IN')}</span>
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                Record this charge in Accounting {recorded && <span className="text-emerald-600">· saved</span>}
              </label>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400">The report will be generated without any billing section.</p>
          )}
        </div>

        {msg && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{msg}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Close</button>
          <button onClick={() => go('share')} disabled={!!busy} className="btn-outline">{busy === 'share' ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />} Send</button>
          <button onClick={() => go('download')} disabled={!!busy} className="btn-primary">{busy === 'download' ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} Download</button>
        </div>
      </div>
    </div>
  )
}

// ---- Update registration modal --------------------------------------------
// Edits ALL of the first-time registration fields (same schema as New Client),
// so the admin can correct or complete any detail later.
function EditClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const f = {}
    BASIC_KEYS.forEach((k) => { f[k] = client[k] ?? '' })
    return f
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (val) => { setForm((f) => ({ ...f, [k]: val })); setError('') }

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!(form.name || '').trim()) { setError('Patient name is required.'); return }
    if (!isValidMobile(form.phone || '')) { setError('Enter a valid 10-digit contact number.'); return }
    setBusy(true)
    try {
      const data = {}
      BASIC_KEYS.forEach((k) => { const v = form[k]; data[k] = typeof v === 'string' ? v.trim() : v })
      await updateClient(client.id, data) // also stamps updatedAt
      onSaved(data)
    } catch (err) {
      console.error('update client failed:', err)
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl animate-pop-in space-y-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Update Registration</h2>
            <p className="text-sm text-slate-500">{client.name} · {client.clientId}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={22} /></button>
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
          <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes</button>
        </div>
      </form>
    </div>
  )
}
