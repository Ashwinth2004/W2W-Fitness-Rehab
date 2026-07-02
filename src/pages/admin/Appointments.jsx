import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, Plus, Check, X, Loader2, CalendarClock, MessageSquarePlus, Pencil, Copy, Trash2,
  CalendarOff, Ban, RotateCcw, Lock,
} from 'lucide-react'
import {
  watchAppointments, addAppointmentByAdmin, setAppointmentStatus, cancelAppointment,
  rescheduleAppointment, setAppointmentRemarks, updateAppointment, getBookedTimes, deleteAppointment,
  blockSlots, unblockSlots, watchBlockedDays, migrateLegacyBlocks,
} from '../../lib/firestore'
import { fmt12h, fmtDate, todayISO, matchesDateFilter } from '../../lib/format'
import { SERVICE_OPTIONS, BOOKABLE_SERVICES, SLOT_TIMES, BUSINESS } from '../../lib/constants'

const SERVICE_FILTERS = ['All', ...BOOKABLE_SERVICES]
import { isValidMobile } from '../../lib/validate'
import SlotPicker, { formatSlot } from '../../components/SlotPicker'
import DateField from '../../components/DateField'
import PhoneField from '../../components/PhoneField'
import ContactActions from '../../components/ContactActions'
import StatusBadge from '../../components/StatusBadge'
import AdminFilter from '../../components/AdminFilter'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useUnsaved } from '../../context/UnsavedContext'

// Ready-to-send WhatsApp confirmation for an appointment.
const apptWhatsApp = (a) =>
  `Hi ${a.name}, greetings from W2W Fitness & Rehab!\n\n` +
  `Thank you for booking with us. Your ${a.service || 'appointment'} is *confirmed* for ` +
  `${fmtDate(a.date)} at ${fmt12h(a.time)}.\n\n` +
  `Kindly arrive 15 minutes prior to your appointment. To reschedule, just reply to this message.\n\n— Team W2W (Way to Wellness)`

export default function Appointments() {
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('today')
  const [showForm, setShowForm] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [reschedule, setReschedule] = useState(null) // appt being rescheduled
  const [remarkOf, setRemarkOf] = useState(null) // appt whose remark is being edited
  const [editOf, setEditOf] = useState(null) // appt whose details are being edited
  const [filter, setFilter] = useState({ day: '', month: '' })
  const [serviceFilter, setServiceFilter] = useState('All')

  useEffect(() => watchAppointments(setItems), [])
  // One-time cleanup of any legacy `blocked` field left in availability docs
  // (moved to the slotBlocks collection) so those dates can be booked again.
  useEffect(() => { migrateLegacyBlocks() }, [])

  const today = todayISO()
  const groups = useMemo(() => {
    // Cancelled / visited appointments stay visible — their status badge and
    // action buttons reflect the state instead of removing the row.
    return {
      today: items.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time)),
      upcoming: items.filter((a) => a.date > today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
      past: items.filter((a) => a.date < today).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
      all: [...items].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    }
  }, [items, today])

  const list = groups[tab]
    .filter((a) => matchesDateFilter(a.date, filter))
    .filter((a) => serviceFilter === 'All' || (a.service || '') === serviceFilter)
  const tabs = [
    { id: 'today', label: `Today (${groups.today.length})` },
    { id: 'upcoming', label: `Upcoming (${groups.upcoming.length})` },
    { id: 'past', label: 'Past' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Appointments">
        <button onClick={() => { setShowManage((v) => !v); setShowForm(false) }} className="btn-outline">
          {showManage ? <X size={18} /> : <CalendarOff size={18} />} {showManage ? 'Close' : 'Block time off'}
        </button>
        <button onClick={() => { setShowForm((v) => !v); setShowManage(false) }} className="btn-primary">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Close' : 'Add Appointment'}
        </button>
        <ShareBookingLink />
      </AdminPageHeader>

      {showManage && <ManageAvailability />}
      {showForm && <AddAppointmentForm onDone={() => setShowForm(false)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap justify-center gap-2 md:justify-start">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Physio / Rehab / All filter */}
        <div className="flex items-center gap-1.5 rounded-full bg-white p-1 ring-1 ring-slate-200">
          {SERVICE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setServiceFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                serviceFilter === s ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4"><AdminFilter filter={filter} setFilter={setFilter} /></div>

      {list.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center">
          <CalendarDays className="text-slate-300" size={48} />
          <p className="mt-3 text-slate-400">No appointments in this view.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{fmtDate(a.date)}</p>
                    <p className="text-xs text-slate-500">{fmt12h(a.time)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{a.name}</p>
                    <ContactActions phone={a.phone} size="sm" message={apptWhatsApp(a)} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.service}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3"><RemarkCell appt={a} onEdit={() => setRemarkOf(a)} /></td>
                  <td className="px-4 py-3"><RowActions appt={a} onReschedule={setReschedule} onEdit={setEditOf} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {list.map((a) => (
              <li key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-500">{fmtDate(a.date)} · {fmt12h(a.time)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{a.service}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-2"><RemarkCell appt={a} onEdit={() => setRemarkOf(a)} /></div>
                <div className="mt-3 flex items-center justify-between">
                  <ContactActions phone={a.phone} size="sm" message={apptWhatsApp(a)} />
                  <RowActions appt={a} onReschedule={setReschedule} onEdit={setEditOf} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reschedule && <RescheduleModal appt={reschedule} onClose={() => setReschedule(null)} />}
      {remarkOf && <RemarkModal appt={remarkOf} onClose={() => setRemarkOf(null)} />}
      {editOf && <EditApptModal appt={editOf} onClose={() => setEditOf(null)} />}
    </div>
  )
}

// Copies the public booking page link (with a short message) so the admin can
// share it on WhatsApp / SMS for clients to self-book.
function ShareBookingLink() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const link = `${BUSINESS.website}/appointment`
    const msg = `Book your appointment at ${BUSINESS.name}:\n${link}`
    navigator.clipboard?.writeText(msg)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }
  return (
    <button onClick={copy} className="btn-outline" title="Copy the public booking link to share with clients">
      {copied ? <><Check size={18} /> Copied</> : <><Copy size={18} /> Copy booking link</>}
    </button>
  )
}

function RemarkCell({ appt, onEdit }) {
  if (appt.remarks) {
    return (
      <button
        onClick={onEdit}
        title="Edit remark"
        className="group flex max-w-[15rem] items-start gap-1.5 text-left text-xs text-slate-600 hover:text-brand-700"
      >
        <span className="line-clamp-2">{appt.remarks}</span>
        <Pencil size={12} className="mt-0.5 shrink-0 text-slate-300 group-hover:text-brand-600" />
      </button>
    )
  }
  return (
    <button onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-brand-600">
      <MessageSquarePlus size={14} /> Add
    </button>
  )
}

function RowActions({ appt, onReschedule, onEdit }) {
  const visited = appt.status === 'completed'
  const cancelled = appt.status === 'cancelled'

  // Tick toggles "visited"; X toggles "cancelled". Neither removes the row —
  // the active state is shown by a filled, highlighted button.
  const toggleVisited = () => setAppointmentStatus(appt.id, visited ? 'confirmed' : 'completed')
  const toggleCancelled = () => {
    if (cancelled) {
      if (window.confirm('Restore this appointment? The time slot will be re-booked.')) rescheduleAppointment(appt, appt.date, appt.time)
    } else if (window.confirm('Mark this appointment as cancelled and free the slot?')) {
      cancelAppointment(appt)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => onEdit(appt)}
        title="Edit details"
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => !cancelled && window.confirm('Do you want to reschedule this appointment?') && onReschedule(appt)}
        disabled={cancelled}
        title={cancelled ? 'Reschedule (restore first)' : 'Reschedule'}
        className="grid h-8 w-8 place-items-center rounded-lg text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
      >
        <CalendarClock size={17} />
      </button>
      <button
        onClick={toggleVisited}
        title={visited ? 'Visited ✓ — click to undo' : 'Mark as visited'}
        className={`grid h-8 w-8 place-items-center rounded-lg transition ${
          visited ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700' : 'text-emerald-600 hover:bg-emerald-50'
        }`}
      >
        <Check size={17} />
      </button>
      <button
        onClick={toggleCancelled}
        title={cancelled ? 'Cancelled — click to restore' : 'Mark as cancelled'}
        className={`grid h-8 w-8 place-items-center rounded-lg transition ${
          cancelled ? 'bg-red-600 text-white shadow-sm hover:bg-red-700' : 'text-red-500 hover:bg-red-50'
        }`}
      >
        <X size={17} />
      </button>
      <button
        onClick={() => window.confirm('Delete this appointment permanently? It will no longer appear in reports.') && deleteAppointment(appt)}
        title="Delete permanently"
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

// ---- Modal shell ----------------------------------------------------------
function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`relative max-h-[92vh] w-full ${wide ? 'max-w-lg' : 'max-w-md'} animate-pop-in overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
          <X size={20} />
        </button>
        <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  )
}

// ---- Edit appointment details ---------------------------------------------
function EditApptModal({ appt, onClose }) {
  const [name, setName] = useState(appt.name || '')
  const [phone, setPhone] = useState(appt.phone || '')
  const [email, setEmail] = useState(appt.email || '')
  const [service, setService] = useState(appt.service || SERVICE_OPTIONS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Name is required.')
    if (!isValidMobile(phone)) return setError('Enter a valid 10-digit mobile number.')
    setBusy(true)
    try {
      await updateAppointment(appt.id, { name: name.trim(), phone: phone.trim(), email: email.trim(), service })
      onClose()
    } catch {
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Edit appointment details" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">{fmtDate(appt.date)} · {fmt12h(appt.time)}</div>
        <div><label className="label">Full Name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div><label className="label">Phone / Mobile *</label><PhoneField value={phone} onChange={setPhone} /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></div>
        <div><label className="label">Service</label><select className="input" value={service} onChange={(e) => setService(e.target.value)}>{BOOKABLE_SERVICES.map((s) => <option key={s}>{s}</option>)}</select></div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={busy} className="btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save changes</button>
        </div>
      </form>
    </Modal>
  )
}

// ---- Remarks editor -------------------------------------------------------
function RemarkModal({ appt, onClose }) {
  const [text, setText] = useState(appt.remarks || '')
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    try { await setAppointmentRemarks(appt.id, text.trim()); onClose() } catch { setBusy(false) }
  }
  return (
    <Modal title="Remarks" onClose={onClose}>
      <p className="text-sm text-slate-500">{appt.name} · {fmtDate(appt.date)} · {fmt12h(appt.time)}</p>
      <textarea
        className="input mt-3 min-h-[120px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add any note about this appointment (e.g. follow-up needed, paid in advance, brought reports…)"
        autoFocus
      />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save remark
        </button>
      </div>
    </Modal>
  )
}

// ---- Reschedule -----------------------------------------------------------
function RescheduleModal({ appt, onClose }) {
  const [date, setDate] = useState(appt.date)
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!date) { setError('Pick a date.'); return }
    if (!time) { setError('Pick a time slot.'); return }
    setError(''); setBusy(true)
    try { await rescheduleAppointment(appt, date, time); onClose() }
    catch { setError('Could not reschedule. Please try again.'); setBusy(false) }
  }

  return (
    <Modal title="Reschedule appointment" onClose={onClose} wide>
      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <p className="font-semibold text-slate-800">{appt.name} · {appt.service}</p>
        <p className="text-slate-500">Currently booked for {fmtDate(appt.date)} at {fmt12h(appt.time)}</p>
      </div>

      <div className="mt-4">
        <label className="label">New date <span className="font-normal text-slate-400">(DD-MM-YYYY)</span></label>
        <DateField value={date} onChange={(iso) => { setDate(iso); setTime(''); setError('') }} min={todayISO()} blockSunday />
      </div>

      {date && (
        <div className="mt-4">
          <label className="label">New time slot</label>
          <AdminSlotGrid date={date} value={time} onChange={(t) => { setTime(t); setError('') }} currentAppt={appt} />
          <p className="mt-2 text-xs text-slate-400">
            Amber slots are already booked — you can still place this client there (this overrides availability).
          </p>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy || !time} className="btn-primary">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />} Confirm reschedule
        </button>
      </div>
    </Modal>
  )
}

// Admin slot grid — shows ALL slots; booked ones are flagged but still selectable.
function AdminSlotGrid({ date, value, onChange, currentAppt }) {
  const [booked, setBooked] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let on = true
    setLoading(true)
    getBookedTimes(date)
      .then((t) => { if (on) { setBooked(t); setLoading(false) } })
      .catch(() => { if (on) { setBooked([]); setLoading(false) } })
    return () => { on = false }
  }, [date])

  if (loading) return <p className="text-sm text-slate-400">Loading slots…</p>

  const now = new Date()
  const isToday = date === now.toISOString().slice(0, 10)
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  // the appointment's own current slot isn't "taken" (it's being moved)
  const taken = booked.filter((t) => !(currentAppt && currentAppt.date === date && t === currentAppt.time))

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SLOT_TIMES.map((t) => {
        const isBooked = taken.includes(t)
        const past = isToday && t <= nowHM
        const selected = value === t
        return (
          <button
            key={t}
            type="button"
            disabled={past}
            onClick={() => onChange(t)}
            className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center text-sm font-medium leading-tight transition ${
              selected
                ? 'border-brand-600 bg-brand-600 text-white shadow'
                : past
                ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through'
                : isBooked
                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400'
                : 'border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50'
            }`}
          >
            {formatSlot(t)}
            {isBooked && !selected && <span className="block text-[10px] font-normal">Booked</span>}
          </button>
        )
      })}
    </div>
  )
}

function AddAppointmentForm({ onDone }) {
  const [form, setForm] = useState({ name: '', phone: '', service: BOOKABLE_SERVICES[0], date: '', time: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { setDirty } = useUnsaved()
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true) }

  useEffect(() => () => setDirty(false), [setDirty])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Client name is required.'); return }
    if (!isValidMobile(form.phone)) { setError('Enter a valid 10-digit mobile number.'); return }
    if (!form.date) { setError('Choose a valid date (DD-MM-YYYY).'); return }
    if (!form.time) { setError('Pick a time slot.'); return }
    setBusy(true)
    try {
      await addAppointmentByAdmin(form)
      setDirty(false)
      onDone()
    } catch (err) {
      setError(err.message === 'SLOT_TAKEN' ? 'That slot is already booked.' : 'Could not save. Try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card animate-fade-in space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Client Name *</label><input className="input" value={form.name} onChange={set('name')} required /></div>
        <div><label className="label">Phone *</label><PhoneField value={form.phone} onChange={(v) => { setForm((f) => ({ ...f, phone: v })); setDirty(true) }} required /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Service</label>
          <select className="input" value={form.service} onChange={set('service')}>{BOOKABLE_SERVICES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div>
          <label className="label">Date * <span className="font-normal text-slate-400">(DD-MM-YYYY)</span></label>
          <DateField value={form.date} onChange={(iso) => { setForm((f) => ({ ...f, date: iso, time: '' })); setDirty(true) }} min={todayISO()} blockSunday />
        </div>
      </div>
      {form.date && (
        <div>
          <label className="label">Time Slot *</label>
          <SlotPicker date={form.date} value={form.time} onChange={(t) => { setForm((f) => ({ ...f, time: t })); setDirty(true) }} />
        </div>
      )}
      <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={set('notes')} placeholder="Optional" /></div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Save</button>
      </div>
    </form>
  )
}

// ---- Block time off (admin availability) ----------------------------------
// Pick one or more dates, then block the whole day or specific slots so clients
// can't book them. Several dates can be marked unavailable in one action.
function ManageAvailability() {
  const [dates, setDates] = useState([])
  const [pending, setPending] = useState('')
  const [slots, setSlots] = useState([])
  const [wholeDay, setWholeDay] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [blockedDays, setBlockedDays] = useState([])

  useEffect(() => watchBlockedDays(setBlockedDays), [])

  const addDate = () => {
    if (!pending || dates.includes(pending)) return
    setDates((d) => [...d, pending].sort())
    setPending('')
  }
  const removeDate = (d) => setDates((arr) => arr.filter((x) => x !== d))
  const toggleSlot = (t) => setSlots((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]))

  async function apply(action) {
    setErr(''); setMsg('')
    if (dates.length === 0) { setErr('Add at least one date first.'); return }
    if (!wholeDay && slots.length === 0) { setErr('Pick time slots, or choose “Whole day”.'); return }
    setBusy(true)
    try {
      const times = wholeDay ? [] : slots
      if (action === 'block') await blockSlots(dates, times)
      else await unblockSlots(dates, times)
      setMsg(`${action === 'block' ? 'Marked unavailable' : 'Re-opened'} ${wholeDay ? 'the whole day' : `${slots.length} slot(s)`} on ${dates.length} date(s).`)
      setDates([]); setSlots([]); setWholeDay(true)
    } catch (_) {
      setErr('Could not update availability. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="card animate-fade-in space-y-5 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><Lock size={18} className="text-brand-600" /> Block time off</h2>
        <p className="mt-1 text-sm text-slate-500">
          Mark dates or specific slots as unavailable so clients can’t book them. Select several dates and apply them all at once.
        </p>
      </div>

      {/* 1. Dates */}
      <div>
        <label className="label">1. Choose date(s)</label>
        <div className="flex flex-wrap items-start gap-2">
          <div className="w-full sm:w-56"><DateField value={pending} onChange={setPending} min={todayISO()} blockSunday /></div>
          <button type="button" onClick={addDate} disabled={!pending} className="btn-outline disabled:opacity-50"><Plus size={16} /> Add date</button>
        </div>
        {dates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {dates.map((d) => (
              <span key={d} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm font-medium text-brand-700">
                {fmtDate(d)}
                <button type="button" onClick={() => removeDate(d)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-brand-100"><X size={13} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. What to block */}
      <div>
        <label className="label">2. What to block</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setWholeDay(true); setSlots([]) }} className={`rounded-full px-4 py-2 text-sm font-medium transition ${wholeDay ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Whole day (all slots)</button>
          <button type="button" onClick={() => setWholeDay(false)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${!wholeDay ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Specific slots</button>
        </div>
        {!wholeDay && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SLOT_TIMES.map((t) => (
              <button key={t} type="button" onClick={() => toggleSlot(t)} className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${slots.includes(t) ? 'border-brand-600 bg-brand-600 text-white shadow' : 'border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50'}`}>{formatSlot(t)}</button>
            ))}
          </div>
        )}
      </div>

      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} onClick={() => apply('unblock')} className="btn-outline"><RotateCcw size={16} /> Re-open</button>
        <button type="button" disabled={busy} onClick={() => apply('block')} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Ban size={18} />} Mark unavailable</button>
      </div>

      {/* Currently blocked */}
      {blockedDays.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">Currently blocked</p>
          <ul className="space-y-2">
            {blockedDays.map((d) => {
              const isFullDay = SLOT_TIMES.every((t) => d.blocked.includes(t))
              return (
                <li key={d.date} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800">{fmtDate(d.date)}</span>
                    <span className="ml-2 text-slate-500">{isFullDay ? 'Whole day' : d.blocked.slice().sort().map((t) => formatSlot(t)).join(', ')}</span>
                  </div>
                  <button type="button" onClick={() => unblockSlots([d.date], [])} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"><RotateCcw size={13} /> Re-open</button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
