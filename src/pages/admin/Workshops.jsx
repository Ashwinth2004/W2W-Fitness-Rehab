import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Trash2, Pencil, Loader2, GraduationCap, Users, Check, X,
  CalendarDays, ClipboardList, Eye,
} from 'lucide-react'
import {
  watchWorkshops, createWorkshop, updateWorkshop, deleteWorkshop,
  watchWorkshopRegistrations, setRegistrationStatus, deleteRegistration,
} from '../../lib/firestore'
import ContactActions from '../../components/ContactActions'
import AdminFilter from '../../components/AdminFilter'
import { fmtDate, matchesDateFilter } from '../../lib/format'

const EMPTY = {
  title: '', description: '', date: '', time: '', venue: '',
  fee: '', slots: '', upiId: '', paymentNumber: '', status: 'draft',
}

export default function Workshops() {
  const [tab, setTab] = useState('workshops')
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">W2W Workshop</h1>
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'workshops', label: 'Workshops', icon: GraduationCap },
          { id: 'registrations', label: 'Registrations', icon: ClipboardList },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'workshops' ? <WorkshopManager /> : <Registrations />}
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    open: 'bg-green-100 text-green-700',
    closed: 'bg-slate-200 text-slate-600',
    draft: 'bg-amber-100 text-amber-700',
  }
  return <span className={`badge ${map[status] || map.draft}`}>{status === 'open' ? 'Registrations Open' : status === 'closed' ? 'Closed' : 'Draft'}</span>
}

function WorkshopManager() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => watchWorkshops(setItems), [])

  function resetForm() {
    setForm(EMPTY)
    setEditingId(null)
    setError('')
  }

  function validate() {
    if (!form.title.trim()) return 'Workshop title is required.'
    if (form.slots !== '' && (!/^\d+$/.test(String(form.slots)) || Number(form.slots) < 1)) return 'Slots must be a whole number of 1 or more.'
    if (form.fee !== '' && (isNaN(Number(form.fee)) || Number(form.fee) < 0)) return 'Fee must be a valid amount.'
    return ''
  }

  async function save(e) {
    e.preventDefault()
    const v = validate()
    if (v) { setError(v); return }
    setBusy(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      time: form.time.trim(),
      venue: form.venue.trim(),
      fee: form.fee === '' ? '' : Number(form.fee),
      slots: form.slots === '' ? '' : Number(form.slots),
      upiId: form.upiId.trim(),
      paymentNumber: form.paymentNumber.trim(),
      status: form.status,
    }
    try {
      if (form.status === 'open') {
        // keep a single live workshop — close any other open ones first
        await Promise.all(
          items.filter((w) => w.status === 'open' && w.id !== editingId).map((w) => updateWorkshop(w.id, { status: 'closed' }))
        )
      }
      if (editingId) await updateWorkshop(editingId, payload)
      else await createWorkshop(payload)
      resetForm()
    } catch (_) {
      setError('Could not save. Please try again.')
    }
    setBusy(false)
  }

  function edit(w) {
    setEditingId(w.id)
    setForm({
      title: w.title || '', description: w.description || '', date: w.date || '', time: w.time || '',
      venue: w.venue || '', fee: w.fee ?? '', slots: w.slots ?? '', upiId: w.upiId || '',
      paymentNumber: w.paymentNumber || '', status: w.status || 'draft',
    })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function setStatus(w, status) {
    if (status === 'open') {
      await Promise.all(items.filter((x) => x.status === 'open' && x.id !== w.id).map((x) => updateWorkshop(x.id, { status: 'closed' })))
    }
    await updateWorkshop(w.id, { status })
  }

  async function remove(w) {
    if (window.confirm(`Delete "${w.title}"? This cannot be undone.`)) await deleteWorkshop(w.id)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">{editingId ? 'Edit workshop' : 'Create a workshop'}</h2>
          {editingId && <button type="button" onClick={resetForm} className="text-sm text-slate-500 hover:underline">Cancel edit</button>}
        </div>
        <div><label className="label text-xs">Workshop Name *</label><input className="input" value={form.title} onChange={set('title')} placeholder="Step Up – The Advanced Ankle Workshop" /></div>
        <div><label className="label text-xs">Details / Description</label><textarea className="input min-h-[90px]" value={form.description} onChange={set('description')} placeholder="What the workshop covers, who it's for, notes…" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label text-xs">Date</label><input type="date" className="input" value={form.date} onChange={set('date')} /></div>
          <div><label className="label text-xs">Time</label><input className="input" value={form.time} onChange={set('time')} placeholder="10:00 AM – 1:00 PM" /></div>
        </div>
        <div><label className="label text-xs">Venue</label><input className="input" value={form.venue} onChange={set('venue')} placeholder="Balaiah Avenue, Mylapore" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label text-xs">Fee (₹)</label><input type="number" min="0" className="input" value={form.fee} onChange={set('fee')} placeholder="500" /></div>
          <div><label className="label text-xs">Number of Slots</label><input type="number" min="1" className="input" value={form.slots} onChange={set('slots')} placeholder="12" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label text-xs">UPI ID (for payment QR)</label><input className="input" value={form.upiId} onChange={set('upiId')} placeholder="name@okhdfcbank" /></div>
          <div><label className="label text-xs">Payment Number</label><input className="input" value={form.paymentNumber} onChange={set('paymentNumber')} placeholder="7200043621" /></div>
        </div>
        <div>
          <label className="label text-xs">Status</label>
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="draft">Draft (hidden from website)</option>
            <option value="open">Open Registration (live on website)</option>
            <option value="closed">Closed</option>
          </select>
          <p className="mt-1 text-xs text-slate-400">Setting a workshop to “Open Registration” shows it on the website and closes any other open workshop.</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button disabled={busy} className="btn-primary">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {editingId ? 'Save changes' : 'Create workshop'}
          </button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="card py-10 text-center text-sm text-slate-400">No workshops yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {items.map((w) => (
            <div key={w.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{w.title}</p>
                    <StatusPill status={w.status} />
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {w.date && <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {fmtDate(w.date)}</span>}
                    {w.time && <span>{w.time}</span>}
                    {w.fee !== '' && w.fee != null && <span>₹{w.fee}</span>}
                    {w.slots !== '' && w.slots != null && <span className="inline-flex items-center gap-1"><Users size={13} /> {w.slots} slots</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {w.status !== 'open' ? (
                    <button onClick={() => setStatus(w, 'open')} className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"><Eye size={14} /> Open</button>
                  ) : (
                    <button onClick={() => setStatus(w, 'closed')} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"><X size={14} /> Close</button>
                  )}
                  <button onClick={() => edit(w)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button>
                  <button onClick={() => remove(w)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Registrations() {
  const [regs, setRegs] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [filter, setFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState({ day: '', month: '' })

  useEffect(() => {
    const u1 = watchWorkshopRegistrations(setRegs)
    const u2 = watchWorkshops(setWorkshops)
    return () => { u1(); u2() }
  }, [])

  const filtered = useMemo(
    () => regs.filter((r) => (filter === 'all' || r.workshopId === filter) && matchesDateFilter(r.createdAt, dateFilter)),
    [regs, filter, dateFilter]
  )

  const counts = useMemo(() => {
    const m = {}
    regs.forEach((r) => { m[r.workshopId] = (m[r.workshopId] || 0) + 1 })
    return m
  }, [regs])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Filter:</label>
        <select className="input max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All workshops ({regs.length})</option>
          {workshops.map((w) => (
            <option key={w.id} value={w.id}>{w.title} ({counts[w.id] || 0}{w.slots ? ` / ${w.slots}` : ''})</option>
          ))}
        </select>
      </div>

      <div className="card p-4"><AdminFilter filter={dateFilter} setFilter={setDateFilter} /></div>

      {filtered.length === 0 ? (
        <p className="card py-10 text-center text-sm text-slate-400">No registrations yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{r.fullName}</p>
                    <span className={`badge ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.status === 'confirmed' ? 'Confirmed' : 'Pending payment'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.workshopTitle} · {r.qualification} · {r.email} · {fmtDate(r.createdAt)}
                  </p>
                  {r.reason && <p className="mt-1 text-xs text-slate-500">“{r.reason}”</p>}
                  <p className="mt-1 text-xs text-slate-400">Attended before: {r.attendedBefore || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ContactActions phone={r.phone} size="sm" />
                  {r.status !== 'confirmed' ? (
                    <button onClick={() => setRegistrationStatus(r.id, 'confirmed')} title="Mark confirmed" className="grid h-8 w-8 place-items-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Check size={16} /></button>
                  ) : (
                    <button onClick={() => setRegistrationStatus(r.id, 'pending')} title="Mark pending" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={16} /></button>
                  )}
                  <button onClick={() => window.confirm('Delete this registration?') && deleteRegistration(r.id)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
