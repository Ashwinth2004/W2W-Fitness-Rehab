import { useState } from 'react'
import { CalendarCheck, CheckCircle2, Loader2 } from 'lucide-react'
import SlotPicker, { formatTime } from './SlotPicker'
import DateField from './DateField'
import PhoneField from './PhoneField'
import { bookAppointment } from '../lib/firestore'
import { notifyClinic } from '../lib/email'
import { SERVICE_OPTIONS, BUSINESS } from '../lib/constants'
import { isValidMobile } from '../lib/validate'

const todayStr = () => new Date().toISOString().slice(0, 10)
const maxStr = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 2)
  return d.toISOString().slice(0, 10)
}

export default function BookingForm({ preset = {}, onDone }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service: preset.service || SERVICE_OPTIONS[0],
    date: '',
    time: '',
    notes: '',
  })
  const [status, setStatus] = useState('idle') // idle | saving | done | error
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Please enter your name.'); return }
    if (!isValidMobile(form.phone)) { setError('Enter a valid 10-digit mobile number.'); return }
    if (!form.date) { setError('Please choose a valid date (DD-MM-YYYY).'); return }
    if (!form.time) { setError('Please pick a time slot.'); return }
    setStatus('saving')
    try {
      await bookAppointment({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        service: form.service,
        date: form.date,
        time: form.time,
        notes: form.notes.trim(),
        source: 'web',
      })
      // Fire-and-forget email to the clinic.
      notifyClinic('booking', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        service: form.service,
        date: form.date,
        time: formatTime(form.time),
        notes: form.notes,
      })
      setStatus('done')
      onDone?.()
    } catch (err) {
      if (err.message === 'SLOT_TAKEN') {
        setError('Sorry, that slot was just taken. Please pick another time.')
        setForm((f) => ({ ...f, time: '' }))
      } else {
        setError('Something went wrong. Please try again or WhatsApp us.')
      }
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div className="animate-fade-in py-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-green-500" size={56} />
        <h3 className="text-xl font-bold text-slate-900">Appointment Confirmed! 🎉</h3>
        <p className="mt-2 text-slate-600">
          See you on <strong>{new Date(form.date + 'T00:00').toDateString()}</strong> at{' '}
          <strong>{formatTime(form.time)}</strong>.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {form.name}, our team will reach you on {form.phone} if anything changes. A reminder will be sent the day before.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Questions? WhatsApp us at <span className="font-medium text-brand-700">{BUSINESS.whatsappDisplay}</span>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Your name" required />
        </div>
        <div>
          <label className="label">Phone / Mobile *</label>
          <PhoneField value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Email (optional)</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" />
        </div>
        <div>
          <label className="label">Service Required *</label>
          <select className="input" value={form.service} onChange={set('service')}>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Preferred Date * <span className="font-normal text-slate-400">(DD-MM-YYYY)</span></label>
        <DateField
          value={form.date}
          onChange={(iso) => setForm((f) => ({ ...f, date: iso, time: '' }))}
          min={todayStr()}
          max={maxStr()}
          blockSunday
        />
      </div>

      {form.date && (
        <div>
          <label className="label">Pick a Time Slot *</label>
          <SlotPicker date={form.date} value={form.time} onChange={(t) => setForm((f) => ({ ...f, time: t }))} />
        </div>
      )}

      <div>
        <label className="label">Notes / Concern (optional)</label>
        <textarea className="input min-h-[80px]" value={form.notes} onChange={set('notes')} placeholder="Briefly describe your concern, injury, or goal." />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={status === 'saving'} className="btn-primary w-full">
        {status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <CalendarCheck size={18} />}
        {status === 'saving' ? 'Confirming…' : 'Confirm Appointment'}
      </button>
      <p className="text-center text-xs text-slate-400">
        Your slot is reserved instantly. We’ll only contact you about this booking.
      </p>
    </form>
  )
}
