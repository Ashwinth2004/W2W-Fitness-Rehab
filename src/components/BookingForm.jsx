import { useState } from 'react'
import { CalendarCheck, CheckCircle2, Loader2, Clock } from 'lucide-react'
import SlotPicker, { formatSlot } from './SlotPicker'
import DateField from './DateField'
import PhoneField from './PhoneField'
import { bookAppointment } from '../lib/firestore'
import { notifyClinic } from '../lib/email'
import { BUSINESS, whatsappLink } from '../lib/constants'
import { isValidMobile } from '../lib/validate'
import { fmtDate } from '../lib/format'

// Online booking is for Physiotherapy only. Other services are handled as
// enquiries on the Contact page.
const BOOKING_SERVICE = 'Physiotherapy'

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
    service: BOOKING_SERVICE, // online booking = physiotherapy only
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
        time: formatSlot(form.time),
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
    // Pre-fill the WhatsApp message with the patient's booking details.
    const waMsg = `Hi ${BUSINESS.name}! I have booked an appointment.\n\n`
      + `• Name: ${form.name}\n`
      + `• Mobile: ${form.phone}\n`
      + `• Service: ${form.service}\n`
      + `• Date: ${fmtDate(form.date)}\n`
      + `• Time: ${formatSlot(form.time)}`
      + (form.notes ? `\n• Notes: ${form.notes}` : '')
    return (
      <div className="animate-fade-in py-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-green-500" size={56} />
        <h3 className="text-xl font-bold text-slate-900">Appointment Confirmed!</h3>
        <p className="mt-2 text-slate-600">
          See you on <strong>{fmtDate(form.date)}</strong> at{' '}
          <strong>{formatSlot(form.time)}</strong>.
        </p>
        <p className="mx-auto mt-4 max-w-sm rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
          Kindly arrive 15 minutes prior to your appointment.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Questions? WhatsApp us at{' '}
          <a href={whatsappLink(waMsg)} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">
            {BUSINESS.whatsappDisplay}
          </a>.
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
          <label className="label">Service</label>
          <input className="input cursor-not-allowed bg-slate-50 text-slate-600" value={BOOKING_SERVICE} readOnly />
          <p className="mt-1 text-xs text-slate-400">
            For Yoga, Lifestyle Fitness or Academy, please <a href="/contact" className="text-brand-600 hover:underline">send an enquiry</a>.
          </p>
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
        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
          <Clock size={13} className="mt-0.5 shrink-0 text-brand-500" />
          <span>Open {BUSINESS.hours[0].day} · {BUSINESS.hours[0].time}. {BUSINESS.hours[1].day}s closed. Appointments must be booked before arrival.</span>
        </p>
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
