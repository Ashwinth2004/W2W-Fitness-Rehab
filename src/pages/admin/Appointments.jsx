import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Check, X, Loader2 } from 'lucide-react'
import {
  watchAppointments, addAppointmentByAdmin, setAppointmentStatus, cancelAppointment,
} from '../../lib/firestore'
import { fmt12h, fmtDate, todayISO } from '../../lib/format'
import { SERVICE_OPTIONS } from '../../lib/constants'
import SlotPicker from '../../components/SlotPicker'
import ContactActions from '../../components/ContactActions'
import StatusBadge from '../../components/StatusBadge'

export default function Appointments() {
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('today')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => watchAppointments(setItems), [])

  const today = todayISO()
  const groups = useMemo(() => {
    const active = items.filter((a) => a.status !== 'cancelled')
    return {
      today: active.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time)),
      upcoming: active.filter((a) => a.date > today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
      past: items.filter((a) => a.date < today).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
      all: items.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    }
  }, [items, today])

  const list = groups[tab]
  const tabs = [
    { id: 'today', label: `Today (${groups.today.length})` },
    { id: 'upcoming', label: `Upcoming (${groups.upcoming.length})` },
    { id: 'past', label: 'Past' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Appointments</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Close' : 'Add Appointment'}
        </button>
      </div>

      {showForm && <AddAppointmentForm onDone={() => setShowForm(false)} />}

      <div className="flex flex-wrap gap-2">
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
                    <ContactActions phone={a.phone} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.service}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3"><RowActions appt={a} /></td>
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
                <div className="mt-3 flex items-center justify-between">
                  <ContactActions phone={a.phone} size="sm" />
                  <RowActions appt={a} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RowActions({ appt }) {
  if (appt.status === 'cancelled') return <span className="text-xs text-slate-400">—</span>
  return (
    <div className="flex items-center justify-end gap-1">
      {appt.status !== 'completed' && (
        <button onClick={() => setAppointmentStatus(appt.id, 'completed')} title="Mark completed" className="grid h-8 w-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50">
          <Check size={17} />
        </button>
      )}
      <button
        onClick={() => window.confirm('Cancel this appointment and free the slot?') && cancelAppointment(appt)}
        title="Cancel"
        className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"
      >
        <X size={17} />
      </button>
    </div>
  )
}

function AddAppointmentForm({ onDone }) {
  const [form, setForm] = useState({ name: '', phone: '', service: SERVICE_OPTIONS[0], date: '', time: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.phone || !form.date || !form.time) {
      setError('Name, phone, date and time are required.')
      return
    }
    setBusy(true)
    try {
      await addAppointmentByAdmin(form)
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
        <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" required /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Service</label>
          <select className="input" value={form.service} onChange={set('service')}>{SERVICE_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <div>
          <label className="label">Date *</label>
          <input className="input" type="date" min={todayISO()} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, time: '' }))} required />
        </div>
      </div>
      {form.date && (
        <div>
          <label className="label">Time Slot *</label>
          <SlotPicker date={form.date} value={form.time} onChange={(t) => setForm((f) => ({ ...f, time: t }))} />
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
