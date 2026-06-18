import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BadgeCheck, FileDown, Pencil, Trash2, Plus, Save, X, Loader2,
  NotebookPen, TrendingUp, User, Calendar,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  getClient, updateClient, deleteClient, watchClientNotes, addClientNote, deleteClientNote,
  watchProgress, addProgress, deleteProgress, getClientNotesOnce, getClientProgressOnce,
} from '../../lib/firestore'
import { fmtDate, todayISO } from '../../lib/format'
import { SERVICE_OPTIONS } from '../../lib/constants'
import { onlyDigits } from '../../lib/validate'
import ContactActions from '../../components/ContactActions'
import DateField from '../../components/DateField'
import PhoneField from '../../components/PhoneField'
import { generateClientReport } from '../../lib/pdf'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(undefined)
  const [notes, setNotes] = useState([])
  const [progress, setProgress] = useState([])
  const [editing, setEditing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    getClient(id).then(setClient)
    const u1 = watchClientNotes(id, setNotes)
    const u2 = watchProgress(id, setProgress)
    return () => { u1(); u2() }
  }, [id])

  if (client === undefined) return <div className="grid place-items-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>
  if (client === null) return (
    <div className="py-20 text-center">
      <p className="text-slate-500">Client not found.</p>
      <Link to="/admin/clients" className="btn-outline mt-4">Back to clients</Link>
    </div>
  )

  async function handleReport() {
    setDownloading(true)
    try {
      const [n, p] = await Promise.all([getClientNotesOnce(id), getClientProgressOnce(id)])
      await generateClientReport(client, n, p)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${client.name} (${client.clientId}) permanently? This cannot be undone.`)) return
    await deleteClient(id)
    navigate('/admin/clients')
  }

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
          <div className="flex flex-wrap gap-2">
            <button onClick={handleReport} disabled={downloading} className="btn-primary">
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} Generate Report
            </button>
            <button onClick={() => setEditing(true)} className="btn-outline"><Pencil size={16} /> Edit</button>
            <button onClick={handleDelete} className="btn-ghost text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
          </div>
        </div>

        {/* Quick facts */}
        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={User} label="Age / Gender" value={`${client.age || '—'} / ${client.gender || '—'}`} />
          <Fact icon={Calendar} label="Registered" value={fmtDate(client.createdAt)} />
          <Fact icon={NotebookPen} label="Primary Service" value={client.service || '—'} />
          <Fact icon={User} label="Email" value={client.email || '—'} />
        </div>
        {client.address && <p className="mt-3 text-sm text-slate-500">📍 {client.address}</p>}
      </div>

      {/* Complaint + history */}
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

      {/* Physiotherapy assessment (from the intake form) */}
      <AssessmentSection client={client} />

      {/* Progress */}
      <ProgressSection clientId={id} progress={progress} />

      {/* Notes */}
      <NotesSection clientId={id} notes={notes} />

      {editing && <EditClientModal client={client} onClose={() => setEditing(false)} onSaved={(d) => { setClient((c) => ({ ...c, ...d })); setEditing(false) }} />}
    </div>
  )
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon size={18} /></div>
      <div className="min-w-0"><p className="text-xs text-slate-400">{label}</p><p className="truncate font-medium text-slate-800">{value}</p></div>
    </div>
  )
}

// ---- Physiotherapy assessment (read-only view of intake fields) -----------
const ASSESS_GROUPS = [
  ['Activity levels', [['walking', 'Walking / steps'], ['exercise', 'Exercise'], ['deskWork', 'Desk work'], ['sleep', 'Sleep'], ['hydration', 'Hydration']]],
  ['Pain assessment', [['painArea', 'Area'], ['painDuration', 'Duration'], ['painType', 'Type'], ['painADL', 'Impact on ADL'], ['painAggravating', 'Aggravating'], ['painRelieving', 'Relieving'], ['vas', 'VAS (0–10)']]],
  ['Objective', [['built', 'Built'], ['deformities', 'Deformities / Edema'], ['gait', 'Gait'], ['objectiveNotes', 'Notes']]],
  ['On palpation', [['tenderness', 'Tenderness'], ['swelling', 'Swelling / Spasm'], ['crepitus', 'Crepitus']]],
  ['On examination', [['rom', 'ROM'], ['endFeel', 'End feel'], ['grip', 'Grip'], ['muscleTone', 'Muscle tone'], ['girth', 'Girth'], ['limbLength', 'Limb length'], ['reflexes', 'Reflexes'], ['specialTests', 'Special tests']]],
  ['Assessment & plan', [['opinion', 'Opinion'], ['treatmentOptions', 'Treatment options'], ['expectedRecovery', 'Expected recovery'], ['treatmentPlan', 'Treatment plan'], ['followUp', 'Follow up']]],
]

function AssessmentSection({ client }) {
  const groups = ASSESS_GROUPS
    .map(([title, pairs]) => [title, pairs.filter(([k]) => client[k])])
    .filter(([, pairs]) => pairs.length > 0)

  if (groups.length === 0) return null

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><NotebookPen size={18} className="text-brand-600" /> Physiotherapy Assessment</h2>
        {client.assessmentDate && <span className="text-xs text-slate-400">Assessed {fmtDate(client.assessmentDate)}</span>}
      </div>
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {groups.map(([title, pairs]) => (
          <div key={title}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-600">{title}</p>
            <dl className="space-y-1.5">
              {pairs.map(([k, label]) => (
                <div key={k} className="flex gap-2 text-sm">
                  <dt className="shrink-0 text-slate-400">{label}:</dt>
                  <dd className="whitespace-pre-line text-slate-700">{String(client[k])}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
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

// ---- Progress (charts + measurements) -------------------------------------
function ProgressSection({ clientId, progress }) {
  const [form, setForm] = useState({ date: todayISO(), pain: '', rom: '', weight: '' })
  const [open, setOpen] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function add(e) {
    e.preventDefault()
    await addProgress(clientId, {
      date: form.date || todayISO(),
      pain: form.pain === '' ? null : Number(form.pain),
      rom: form.rom,
      weight: form.weight === '' ? null : Number(form.weight),
    })
    setForm({ date: todayISO(), pain: '', rom: '', weight: '' })
    setOpen(false)
  }

  const chartData = progress.map((p) => ({ date: fmtDate(p.date, 'dd MMM'), Pain: p.pain, Weight: p.weight }))

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><TrendingUp size={18} className="text-brand-600" /> Progress Tracking</h2>
        <button onClick={() => setOpen((v) => !v)} className="btn-ghost px-3 py-1.5 text-sm">{open ? <X size={16} /> : <Plus size={16} />} {open ? 'Close' : 'Add Entry'}</button>
      </div>

      {open && (
        <form onSubmit={add} className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-5">
          <div><label className="label text-xs">Date (DD-MM-YYYY)</label><DateField value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} max={todayISO()} /></div>
          <div><label className="label text-xs">Pain (0-10)</label><input className="input" inputMode="numeric" value={form.pain} onChange={(e) => setForm((f) => ({ ...f, pain: onlyDigits(e.target.value).slice(0, 2) }))} placeholder="0-10" /></div>
          <div className="sm:col-span-2"><label className="label text-xs">ROM / Notes</label><input className="input" value={form.rom} onChange={set('rom')} placeholder="e.g. Knee flexion 110°" /></div>
          <div><label className="label text-xs">Weight (kg)</label><input className="input" inputMode="decimal" value={form.weight} onChange={set('weight')} /></div>
          <div className="sm:col-span-5 flex justify-end"><button className="btn-primary px-4 py-2 text-sm"><Save size={16} /> Save</button></div>
        </form>
      )}

      {progress.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No progress entries yet. Add the first measurement to start tracking.</p>
      ) : (
        <>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Pain" stroke="#0e8ba1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="Weight" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr><th className="py-2">Date</th><th>Pain</th><th>ROM / Notes</th><th>Weight</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...progress].reverse().map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 text-slate-700">{fmtDate(p.date)}</td>
                    <td>{p.pain ?? '—'}</td>
                    <td className="text-slate-600">{p.rom || '—'}</td>
                    <td>{p.weight ?? '—'}</td>
                    <td className="text-right"><button onClick={() => deleteProgress(clientId, p.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
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
      <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><NotebookPen size={18} className="text-brand-600" /> Visit Notes & Report Entries</h2>
      <form onSubmit={add} className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[160px,1fr,auto] sm:items-end">
        <div><label className="label text-xs">Date (DD-MM-YYYY)</label><DateField value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} max={todayISO()} /></div>
        <div><label className="label text-xs">Note / Report text</label><textarea className="input min-h-[44px]" value={form.text} onChange={set('text')} placeholder="Assessment, treatment given, observations, next plan…" /></div>
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

// ---- Edit modal -----------------------------------------------------------
function EditClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({ ...client })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    const data = {
      name: form.name, phone: form.phone, email: form.email || '', age: form.age || '',
      gender: form.gender || '', address: form.address || '', service: form.service || '',
      complaint: form.complaint || '', history: form.history || '',
    }
    await updateClient(client.id, data)
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl animate-pop-in space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Client</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={22} /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" value={form.name || ''} onChange={set('name')} /></div>
          <div><label className="label">Phone</label><PhoneField value={form.phone || ''} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} /></div>
          <div><label className="label">Email</label><input className="input" value={form.email || ''} onChange={set('email')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Age</label><input className="input" value={form.age || ''} onChange={(e) => setForm((f) => ({ ...f, age: onlyDigits(e.target.value).slice(0, 3) }))} /></div>
            <div><label className="label">Gender</label><select className="input" value={form.gender || ''} onChange={set('gender')}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></div>
          </div>
          <div><label className="label">Address</label><input className="input" value={form.address || ''} onChange={set('address')} /></div>
          <div><label className="label">Primary Service</label><select className="input" value={form.service || ''} onChange={set('service')}>{SERVICE_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div><label className="label">Chief Complaint / Goal</label><textarea className="input min-h-[70px]" value={form.complaint || ''} onChange={set('complaint')} /></div>
        <div><label className="label">Medical History / Previous Reports</label><textarea className="input min-h-[100px]" value={form.history || ''} onChange={set('history')} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes</button>
        </div>
      </form>
    </div>
  )
}
