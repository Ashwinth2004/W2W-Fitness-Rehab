import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Trash2, Pencil, Loader2, GraduationCap, Users, Check, X,
  CalendarDays, ClipboardList, Eye, Copy, Link2,
} from 'lucide-react'
import {
  watchWorkshops, createWorkshop, updateWorkshop, deleteWorkshop, watchWorkshopSeats,
  watchWorkshopRegistrations, approveRegistration, unapproveRegistration, deleteRegistration,
  updateRegistration, addRegistrationByAdmin,
} from '../../lib/firestore'
import ContactActions from '../../components/ContactActions'
import DateField from '../../components/DateField'
import PhoneField from '../../components/PhoneField'
import AdminFilter from '../../components/AdminFilter'
import AdminPageHeader from '../../components/AdminPageHeader'
import { fmtDate, matchesDateFilter } from '../../lib/format'
import { workshopShareMessage, BUSINESS } from '../../lib/constants'
import { useUnsaved } from '../../context/UnsavedContext'

const QUALIFICATIONS = ['BPT', 'MPT', 'Intern', 'Student', 'Others']

// Sensible defaults for the common case — the admin can backspace and change
// any of these per workshop.
const EMPTY = {
  title: '', description: '', date: '', startTime: '', endTime: '',
  venue: 'Balaiah Avenue, Mylapore',
  mapUrl: 'https://maps.app.goo.gl/r15LukodqtmcwqKk9',
  fee: '500', slots: '', upiId: 'vyapar.169653437474@hdfcbank', paymentNumber: '7200043621', status: 'draft',
  shareMessage: '', whatsappGroup: '',
}

// 12-hour time picker → value like "10:00 AM".
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINS = ['00', '15', '30', '45']
function parse12(v) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(v || '')
  return m ? { h: String(+m[1]), min: m[2], ap: m[3].toUpperCase() } : { h: '', min: '00', ap: 'AM' }
}
function Time12({ value, onChange }) {
  const p = parse12(value)
  const upd = (k, val) => { const n = { ...p, [k]: val }; onChange(n.h ? `${n.h}:${n.min} ${n.ap}` : '') }
  return (
    <div className="flex gap-1.5">
      <select className="input px-2" value={p.h} onChange={(e) => upd('h', e.target.value)}><option value="">Hr</option>{HOURS.map((h) => <option key={h}>{h}</option>)}</select>
      <select className="input px-2" value={p.min} onChange={(e) => upd('min', e.target.value)}>{MINS.map((m) => <option key={m}>{m}</option>)}</select>
      <select className="input px-2" value={p.ap} onChange={(e) => upd('ap', e.target.value)}><option>AM</option><option>PM</option></select>
    </div>
  )
}

// Confirmation message sent to a student (via the WhatsApp icon). When the
// workshop has a WhatsApp group link set, it's appended so the student can join.
const regWhatsApp = (r, groupLink) =>
  `Hi ${r.fullName || 'there'}, greetings from W2W Fitness & Rehab! Your slot for *${r.workshopTitle || 'the workshop'}* is *confirmed*. We look forward to seeing you.` +
  (groupLink ? `\n\nPlease join this WhatsApp group for further updates & contact:\n${groupLink}` : '') +
  `\n\n— Team W2W`

export default function Workshops() {
  const [tab, setTab] = useState('workshops')
  return (
    <div className="space-y-5">
      <AdminPageHeader title="W2W Workshop" />
      <div className="flex flex-wrap justify-center gap-2 md:justify-start">
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

function StatusPill({ status, full }) {
  // A workshop whose seats are all booked is effectively closed on the website —
  // show that clearly (in red) even though its stored status is still "open".
  if (full) return <span className="badge bg-red-100 text-red-700">All slots booked &amp; closed</span>
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
  const { setDirty } = useUnsaved()
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true) }
  // Digits-only setter (no spinner / scroll-to-change number inputs).
  const setDigits = (k) => (e) => { const v = e.target.value.replace(/\D/g, ''); setForm((f) => ({ ...f, [k]: v })); setDirty(true) }
  // Fill the share message from the current form details (admin can then edit it).
  const fillShare = () => {
    const w = { ...form, time: [form.startTime, form.endTime].filter(Boolean).join(' – ') }
    setForm((f) => ({ ...f, shareMessage: workshopShareMessage(w) }))
    setDirty(true)
  }

  useEffect(() => watchWorkshops(setItems), [])
  useEffect(() => () => setDirty(false), [setDirty])

  function resetForm() {
    setForm(EMPTY)
    setEditingId(null)
    setError('')
    setDirty(false)
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
      startTime: form.startTime,
      endTime: form.endTime,
      time: [form.startTime, form.endTime].filter(Boolean).join(' – '),
      venue: form.venue.trim(),
      mapUrl: form.mapUrl.trim(),
      fee: form.fee === '' ? '' : Number(form.fee),
      slots: form.slots === '' ? '' : Number(form.slots),
      upiId: form.upiId.trim(),
      paymentNumber: form.paymentNumber.trim(),
      status: form.status,
      shareMessage: form.shareMessage.trim(),
      whatsappGroup: form.whatsappGroup.trim(),
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
      title: w.title || '', description: w.description || '', date: w.date || '',
      startTime: w.startTime || '', endTime: w.endTime || '', venue: w.venue || '', mapUrl: w.mapUrl || '',
      fee: w.fee ?? '', slots: w.slots ?? '', upiId: w.upiId || '', paymentNumber: w.paymentNumber || '', status: w.status || 'draft',
      shareMessage: w.shareMessage || '', whatsappGroup: w.whatsappGroup || '',
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
          <div><label className="label text-xs">Date</label><DateField value={form.date} onChange={(iso) => { setForm((f) => ({ ...f, date: iso })); setDirty(true) }} /></div>
        </div>
        <div>
          <label className="label text-xs">Time (start – end)</label>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-9 shrink-0 text-xs font-medium text-slate-400">Start</span>
              <Time12 value={form.startTime} onChange={(v) => { setForm((f) => ({ ...f, startTime: v })); setDirty(true) }} />
            </div>
            <span className="hidden font-semibold text-slate-400 sm:inline">–</span>
            <div className="flex items-center gap-1.5">
              <span className="w-9 shrink-0 text-xs font-medium text-slate-400">End</span>
              <Time12 value={form.endTime} onChange={(v) => { setForm((f) => ({ ...f, endTime: v })); setDirty(true) }} />
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label text-xs">Venue</label><input className="input" value={form.venue} onChange={set('venue')} placeholder="Balaiah Avenue, Mylapore" /></div>
          <div><label className="label text-xs">Google Maps location link</label><input className="input" value={form.mapUrl} onChange={set('mapUrl')} placeholder="https://maps.app.goo.gl/…" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label text-xs">Fee (₹)</label><input inputMode="numeric" className="input" value={form.fee} onChange={setDigits('fee')} placeholder="500" /></div>
          <div><label className="label text-xs">Number of Slots</label><input inputMode="numeric" className="input" value={form.slots} onChange={setDigits('slots')} placeholder="12" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label text-xs">UPI ID (for payment QR)</label><input className="input" value={form.upiId} onChange={set('upiId')} placeholder="name@okhdfcbank" /></div>
          <div><label className="label text-xs">Payment mobile number</label><input className="input" value={form.paymentNumber} onChange={set('paymentNumber')} placeholder="7200043621" /></div>
        </div>
        <div>
          <label className="label text-xs">WhatsApp group link <span className="font-normal text-slate-400">(admin only — never shown on the website)</span></label>
          <input className="input" value={form.whatsappGroup} onChange={set('whatsappGroup')} placeholder="https://chat.whatsapp.com/…" />
          <p className="mt-1 text-xs text-slate-400">Auto-added to the confirmation WhatsApp message you send a student after approving their slot.</p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label text-xs">Share message (used by the Copy button)</label>
            <button type="button" onClick={fillShare} className="text-xs font-semibold text-brand-600 hover:underline">Fill from details</button>
          </div>
          <textarea className="input min-h-[140px] whitespace-pre-wrap" value={form.shareMessage} onChange={set('shareMessage')} placeholder="Leave blank to auto-generate from the details above. Or click “Fill from details” and edit it." />
          <p className="mt-1 text-xs text-slate-400">Leave blank to auto-generate from the workshop details (updates automatically when you edit them). Type your own copy here to override it.</p>
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
            <WorkshopCard
              key={w.id}
              w={w}
              onOpen={() => setStatus(w, 'open')}
              onClose={() => setStatus(w, 'closed')}
              onEdit={() => edit(w)}
              onRemove={() => remove(w)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Copies the workshop's share message (custom override, or auto-generated from
// its details so it always reflects the latest edits).
function CopyShareButton({ workshop }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const text = workshop.shareMessage?.trim() || workshopShareMessage(workshop)
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }
  return (
    <button
      onClick={copy}
      title="Copy share message"
      className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
    >
      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy to share</>}
    </button>
  )
}

function WorkshopCard({ w, onOpen, onClose, onEdit, onRemove }) {
  const [seats, setSeats] = useState(0)
  useEffect(() => watchWorkshopSeats(w.id, setSeats), [w.id])
  const slots = Number(w.slots) || 0
  const full = w.status === 'open' && slots > 0 && seats >= slots

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-900">{w.title}</p>
            <StatusPill status={w.status} full={full} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {w.date && <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {fmtDate(w.date)}</span>}
            {w.time && <span>{w.time}</span>}
            {w.fee !== '' && w.fee != null && <span>₹{w.fee}</span>}
            {w.slots !== '' && w.slots != null && <span className="inline-flex items-center gap-1"><Users size={13} /> {slots > 0 ? `${seats}/${slots}` : w.slots} slots</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <CopyShareButton workshop={w} />
          {w.status !== 'open' ? (
            <button onClick={onOpen} className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"><Eye size={14} /> Open Workshop</button>
          ) : (
            <button onClick={onClose} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"><X size={14} /> Close Workshop</button>
          )}
          <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button>
          <button onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  )
}

function Registrations() {
  const [regs, setRegs] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [filter, setFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState({ day: '', month: '' })
  const [editReg, setEditReg] = useState(null) // registration being edited
  const [adding, setAdding] = useState(false)   // add-student modal open
  const [linkCopied, setLinkCopied] = useState(false)

  const copyRegLink = () => {
    navigator.clipboard?.writeText(`${BUSINESS.website}/workshop`)
      .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500) })
      .catch(() => {})
  }

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
    regs.forEach((r) => {
      if (!m[r.workshopId]) m[r.workshopId] = { total: 0, confirmed: 0 }
      m[r.workshopId].total++
      if (r.status === 'confirmed') m[r.workshopId].confirmed++
    })
    return m
  }, [regs])

  const selected = filter !== 'all' ? workshops.find((w) => w.id === filter) : null
  const sc = filter !== 'all' ? (counts[filter] || { total: 0, confirmed: 0 }) : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setAdding(true)} className="btn-primary"><Plus size={18} /> Add student</button>
        <button onClick={copyRegLink} className="btn-outline" title="Copy the public workshop registration link to share">
          {linkCopied ? <><Check size={18} /> Copied</> : <><Link2 size={18} /> Copy registration link</>}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Filter:</label>
        <select className="input max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All workshops ({regs.length})</option>
          {workshops.map((w) => (
            <option key={w.id} value={w.id}>{w.title} ({counts[w.id]?.confirmed || 0}{w.slots ? `/${w.slots}` : ''} confirmed)</option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="card flex flex-wrap gap-x-6 gap-y-2 p-4 text-sm">
          <span>Confirmed (booked): <strong className="text-green-700">{sc.confirmed}{selected.slots ? ` / ${selected.slots}` : ''}</strong></span>
          <span>Pending approval: <strong className="text-amber-700">{sc.total - sc.confirmed}</strong></span>
          {selected.slots ? <span>Seats left: <strong className={selected.slots - sc.confirmed <= 0 ? 'text-red-600' : 'text-slate-800'}>{Math.max(0, selected.slots - sc.confirmed)}</strong></span> : null}
          {selected.slots && sc.confirmed >= selected.slots ? <span className="badge bg-red-100 text-red-700">Full — registration closed</span> : null}
        </div>
      )}

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
                      {r.status === 'confirmed' ? 'Confirmed (booked)' : 'Pending approval'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{[r.workshopTitle, r.email, fmtDate(r.createdAt)].filter(Boolean).join(' · ')}</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">Phone: {r.phone}{r.paidVia ? ` · Paid via ${r.paidVia}` : ''}</p>
                  {r.reason && <p className="mt-1 text-xs italic text-slate-500">“{r.reason}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <ContactActions phone={r.phone} size="sm" message={regWhatsApp(r, workshops.find((w) => w.id === r.workshopId)?.whatsappGroup)} />
                  <button onClick={() => setEditReg(r)} title="Edit details" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={15} /></button>
                  {r.status !== 'confirmed' ? (
                    <button onClick={() => approveRegistration(r)} title="Approve & book seat" className="grid h-8 w-8 place-items-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Check size={16} /></button>
                  ) : (
                    <button onClick={() => unapproveRegistration(r)} title="Revert to pending (frees seat)" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={16} /></button>
                  )}
                  <button onClick={() => window.confirm('Delete this registration?') && deleteRegistration(r)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(adding || editReg) && (
        <RegistrationFormModal
          reg={editReg}
          workshops={workshops}
          defaultWorkshopId={filter !== 'all' ? filter : ''}
          onClose={() => { setAdding(false); setEditReg(null) }}
        />
      )}
    </div>
  )
}

// Add a new registration manually, or edit an existing one's details.
function RegistrationFormModal({ reg, workshops, defaultWorkshopId, onClose }) {
  const editing = Boolean(reg)
  const [workshopId, setWorkshopId] = useState(reg?.workshopId || defaultWorkshopId || workshops[0]?.id || '')
  const [fullName, setFullName] = useState(reg?.fullName || '')
  const [phone, setPhone] = useState(reg?.phone || '')
  const [email, setEmail] = useState(reg?.email || '')
  const [qualification, setQualification] = useState(reg?.qualification || '')
  const [paidVia, setPaidVia] = useState(reg?.paidVia || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!fullName.trim()) return setError('Name is required.')
    if (!/^\d{10}$/.test(phone.trim())) return setError('Enter a valid 10-digit mobile number.')
    setBusy(true)
    try {
      const data = { fullName: fullName.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), qualification, paidVia: paidVia.trim() }
      if (editing) {
        await updateRegistration(reg.id, data)
      } else {
        const w = workshops.find((x) => x.id === workshopId)
        if (!w) { setError('Please choose a workshop.'); setBusy(false); return }
        await addRegistrationByAdmin(w, data)
      }
      onClose()
    } catch (err) {
      setError(err.message === 'DUPLICATE' ? 'This phone or email is already registered for that workshop.' : 'Could not save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-pop-in space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{editing ? 'Edit registration' : 'Add student'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        {!editing && (
          <div>
            <label className="label text-xs">Workshop *</label>
            <select className="input" value={workshopId} onChange={(e) => setWorkshopId(e.target.value)}>
              <option value="">Select a workshop…</option>
              {workshops.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
          </div>
        )}
        <div><label className="label text-xs">Full name *</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus /></div>
        <div><label className="label text-xs">Phone *</label><PhoneField value={phone} onChange={setPhone} /></div>
        <div><label className="label text-xs">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label text-xs">Qualification</label><select className="input" value={qualification} onChange={(e) => setQualification(e.target.value)}><option value="">—</option>{QUALIFICATIONS.map((q) => <option key={q}>{q}</option>)}</select></div>
          <div><label className="label text-xs">Paid via</label><input className="input" value={paidVia} onChange={(e) => setPaidVia(e.target.value)} placeholder="GPay / PhonePe…" /></div>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={busy} className="btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {editing ? 'Save' : 'Add student'}</button>
        </div>
      </form>
    </div>
  )
}
