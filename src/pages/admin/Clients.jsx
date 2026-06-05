import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Plus, Search, X, Loader2, BadgeCheck } from 'lucide-react'
import { watchClients, createClient, findClientByClientId } from '../../lib/firestore'
import { fmtDate } from '../../lib/format'
import { SERVICE_OPTIONS } from '../../lib/constants'
import ContactActions from '../../components/ContactActions'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [lookupMsg, setLookupMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => watchClients(setClients), [])

  const filtered = clients.filter((c) =>
    !search ? true : [c.name, c.clientId, c.phone, c.email].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  // Direct lookup by exact client ID (e.g. W2W-0007)
  async function handleLookup(e) {
    e.preventDefault()
    if (!/w2w-\d+/i.test(search)) return
    setLookupMsg('')
    const found = await findClientByClientId(search)
    if (found) navigate(`/admin/clients/${found.id}`)
    else setLookupMsg(`No client found with ID "${search}".`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Clients / Patients</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Close' : 'New Client'}
        </button>
      </div>

      {showForm && <NewClientForm onCreated={(id) => { setShowForm(false); navigate(`/admin/clients/${id}`) }} />}

      <form onSubmit={handleLookup} className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Search by name, phone, or enter Client ID (e.g. W2W-0007) and press Enter"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setLookupMsg('') }}
        />
      </form>
      {lookupMsg && <p className="text-sm text-red-500">{lookupMsg}</p>}

      {filtered.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center">
          <Users className="text-slate-300" size={48} />
          <p className="mt-3 text-slate-400">{clients.length ? 'No matches.' : 'No clients yet. Add your first client.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/admin/clients/${c.id}`} className="card p-5 transition hover:shadow-soft">
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
                <div onClick={(e) => e.preventDefault()}><ContactActions phone={c.phone} size="sm" /></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function NewClientForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', age: '', gender: '', address: '', service: SERVICE_OPTIONS[0], complaint: '', history: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.phone) { setError('Name and phone are required.'); return }
    setBusy(true)
    try {
      const { id, clientId } = await createClient(form)
      onCreated(id, clientId)
    } catch {
      setError('Could not create client. Try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card animate-fade-in space-y-4 p-5">
      <p className="text-sm text-slate-500">A unique Client ID (e.g. <strong>W2W-0001</strong>) is generated automatically.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={set('name')} required /></div>
        <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" required /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Age</label><input className="input" value={form.age} onChange={set('age')} inputMode="numeric" /></div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={set('gender')}>
              <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>
        <div><label className="label">Address</label><input className="input" value={form.address} onChange={set('address')} /></div>
        <div>
          <label className="label">Primary Service</label>
          <select className="input" value={form.service} onChange={set('service')}>{SERVICE_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      </div>
      <div><label className="label">Chief Complaint / Goal</label><textarea className="input min-h-[70px]" value={form.complaint} onChange={set('complaint')} placeholder="Reason for visit, injury, goal…" /></div>
      <div><label className="label">Medical History / Previous Reports (paste old report text here)</label><textarea className="input min-h-[100px]" value={form.history} onChange={set('history')} placeholder="Past diagnoses, surgeries, previous report notes, medications…" /></div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Create Client</button>
      </div>
    </form>
  )
}
