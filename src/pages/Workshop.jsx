import { useEffect, useState } from 'react'
import {
  CalendarDays, Clock, MapPin, IndianRupee, Users, Loader2, CheckCircle2,
  AlertCircle, GraduationCap, ShieldCheck,
} from 'lucide-react'
import { WhatsAppIcon } from '../components/BrandIcons'
import PhoneField from '../components/PhoneField'
import { getOpenWorkshop, watchWorkshopSeats, registerForWorkshop } from '../lib/firestore'
import {
  BUSINESS, upiLink, upiQrImage, whatsappLink, workshopWhatsappMessage,
} from '../lib/constants'
import { isValidMobile } from '../lib/validate'
import { fmtDate } from '../lib/format'
import Seo from '../components/Seo'

const QUALIFICATIONS = ['BPT', 'MPT', 'Intern', 'Others']
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim())

export default function Workshop() {
  const [workshop, setWorkshop] = useState(undefined) // undefined = loading, null = none open
  const [seats, setSeats] = useState(0)

  useEffect(() => {
    getOpenWorkshop()
      .then((w) => setWorkshop(w))
      .catch(() => setWorkshop(null))
  }, [])

  useEffect(() => {
    if (!workshop?.id) return
    const unsub = watchWorkshopSeats(workshop.id, setSeats)
    return () => unsub && unsub()
  }, [workshop?.id])

  if (workshop === undefined) {
    return <div className="container-page py-24 text-center text-slate-400">Loading…</div>
  }

  return (
    <>
      <Seo
        title="Workshops & Academy"
        description="Upcoming physiotherapy and fitness workshops at W2W Academy, Mylapore. Check dates, slots and register online."
        path="/workshop"
      />
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-700/40 blur-3xl" />
        <div className="container-page relative py-14 text-center md:py-20">
          <span className="badge bg-white/10 text-brand-100">W2W Academy · Workshops</span>
          <h1 className="mt-4 text-4xl font-extrabold text-white md:text-5xl">W2W One-Day Workshop</h1>
          <p className="mx-auto mt-4 max-w-2xl text-brand-100">
            Hands-on, practical workshops for physiotherapy students and professionals — led by experienced clinicians.
          </p>
        </div>
      </section>

      {workshop ? (
        <OpenWorkshop workshop={workshop} seats={seats} />
      ) : (
        <ClosedState />
      )}
    </>
  )
}

function ClosedState() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <GraduationCap size={32} />
          </span>
          <h2 className="mt-4 text-2xl font-bold">Registrations open soon</h2>
          <p className="mt-3 text-slate-600">
            Our next W2W One-Day Workshop hasn’t opened yet. Follow us on Instagram or check back here — the moment a
            workshop opens, registration details and dates will appear on this page.
          </p>
          <a href={BUSINESS.instagram} target="_blank" rel="noreferrer" className="btn-outline mt-6">
            Follow for updates
          </a>
        </div>
      </div>
    </section>
  )
}

function OpenWorkshop({ workshop, seats }) {
  const slots = Number(workshop.slots) || 0
  const remaining = slots ? Math.max(0, slots - seats) : null
  const full = slots > 0 && seats >= slots

  const details = [
    workshop.date && { icon: CalendarDays, label: 'Date', value: fmtDate(workshop.date) },
    workshop.time && { icon: Clock, label: 'Time', value: workshop.time },
    workshop.venue && { icon: MapPin, label: 'Location', value: workshop.venue },
    workshop.fee != null && workshop.fee !== '' && { icon: IndianRupee, label: 'Fee', value: `₹${workshop.fee}` },
    slots > 0 && { icon: Users, label: 'Slots', value: remaining != null ? `${remaining} of ${slots} left` : `${slots} only` },
  ].filter(Boolean)

  return (
    <section className="py-12 md:py-16">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr,1.2fr]">
        {/* Details */}
        <div className="space-y-5">
          <div className="card p-6 md:p-8">
            <span className="badge bg-green-100 text-green-700">Registrations Open</span>
            <h2 className="mt-3 text-2xl font-bold md:text-3xl">{workshop.title}</h2>
            {workshop.description && (
              <p className="mt-3 whitespace-pre-line text-slate-600">{workshop.description}</p>
            )}
            <ul className="mt-6 space-y-3">
              {details.map((d) => (
                <li key={d.label} className="flex items-center gap-3 text-slate-700">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <d.icon size={18} />
                  </span>
                  <span><span className="block text-xs uppercase tracking-wide text-slate-400">{d.label}</span>{d.value}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              <p className="flex items-center gap-2 font-semibold"><AlertCircle size={16} /> Important</p>
              <p className="mt-1">Registration is confirmed only after payment. Payment once done is non-refundable.</p>
            </div>
          </div>
        </div>

        {/* Form / state */}
        <div className="card p-6 md:p-8">
          {full ? (
            <div className="py-10 text-center">
              <Users className="mx-auto text-slate-400" size={44} />
              <h3 className="mt-3 text-xl font-bold">This workshop is full</h3>
              <p className="mt-2 text-slate-600">All {slots} slots are taken. Please follow us on Instagram for the next batch.</p>
            </div>
          ) : (
            <RegistrationForm workshop={workshop} />
          )}
        </div>
      </div>
    </section>
  )
}

function RegistrationForm({ workshop }) {
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    qualification: '',
    reason: '',
    attendedBefore: '',
    available: false,
  })
  const [status, setStatus] = useState('idle') // idle | saving | done
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!isValidEmail(form.email)) return setError('Please enter a valid email id.')
    if (!form.fullName.trim()) return setError('Please enter your full name.')
    if (!isValidMobile(form.phone)) return setError('Enter a valid 10-digit mobile number.')
    if (!form.qualification) return setError('Please select your qualification.')
    if (!form.reason.trim()) return setError('Please tell us why you want to attend.')
    if (!form.attendedBefore) return setError('Please answer whether you’ve attended a workshop before.')
    if (!form.available) return setError('Please confirm your availability on the workshop date.')

    setStatus('saving')
    try {
      await registerForWorkshop(workshop, {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        qualification: form.qualification,
        reason: form.reason.trim(),
        attendedBefore: form.attendedBefore,
        available: true,
      })
      setStatus('done')
    } catch (err) {
      if (err.message === 'WORKSHOP_FULL') {
        setError('Sorry, the last slot was just taken. This workshop is now full.')
      } else {
        setError('Something went wrong. Please try again or WhatsApp us.')
      }
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return <PaymentStep workshop={workshop} fullName={form.fullName} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-bold">Register for this workshop</h3>
      <p className="text-sm text-slate-500">Fields marked * are required.</p>

      <div>
        <label className="label">Email id *</label>
        <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" value={form.fullName} onChange={set('fullName')} placeholder="Your name" required />
        </div>
        <div>
          <label className="label">Phone Number *</label>
          <PhoneField value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} required />
        </div>
      </div>

      <div>
        <label className="label">Qualification *</label>
        <div className="flex flex-wrap gap-2">
          {QUALIFICATIONS.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => setForm((f) => ({ ...f, qualification: q }))}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                form.qualification === q ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Why do you want to attend this workshop? *</label>
        <textarea className="input min-h-[90px]" value={form.reason} onChange={set('reason')} placeholder="Tell us briefly…" />
      </div>

      <div>
        <label className="label">Have you attended any related workshop before? *</label>
        <div className="flex gap-2">
          {['Yes', 'No'].map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => setForm((f) => ({ ...f, attendedBefore: v }))}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                form.attendedBefore === v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.available}
          onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
        />
        <span>I confirm my availability on {workshop.date ? fmtDate(workshop.date) : 'the workshop date'}. *</span>
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={status === 'saving'} className="btn-primary w-full">
        {status === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
        {status === 'saving' ? 'Submitting…' : 'Register'}
      </button>
      <p className="text-center text-xs text-slate-400">
        After registering, complete the payment and send your screenshot on WhatsApp to confirm your slot.
      </p>
    </form>
  )
}

function PaymentStep({ workshop, fullName }) {
  const amount = workshop.fee
  const payNumber = workshop.paymentNumber || BUSINESS.whatsapp.replace(/^91/, '')
  const upiPay = upiLink({
    upiId: workshop.upiId,
    name: BUSINESS.name,
    amount,
    note: `${workshop.title} registration`,
  })
  const qr = upiQrImage(upiPay, 220)
  const waLink = whatsappLink(workshopWhatsappMessage(workshop.title, fullName))

  return (
    <div className="animate-fade-in text-center">
      <CheckCircle2 className="mx-auto text-green-500" size={52} />
      <h3 className="mt-3 text-xl font-bold">Registration received!</h3>
      <p className="mt-2 text-slate-600">
        One last step, {fullName.split(' ')[0] || 'there'} — complete the payment to confirm your slot.
      </p>

      <div className="mt-6 rounded-2xl bg-brand-50 p-5 text-left">
        <p className="text-center text-sm font-semibold text-slate-700">
          Pay {amount != null && amount !== '' ? `₹${amount}` : 'the workshop fee'} via UPI / GPay
        </p>

        {workshop.upiId && qr && (
          <div className="mt-4 flex flex-col items-center">
            <img src={qr} alt="Scan to pay via UPI" className="h-44 w-44 rounded-xl bg-white p-2 shadow-sm" />
            <a href={upiPay} className="btn-primary mt-3 text-sm">Open UPI app to pay</a>
          </div>
        )}

        <div className="mt-4 space-y-1.5 text-center text-sm text-slate-700">
          {workshop.upiId && <p>UPI ID: <span className="font-semibold">{workshop.upiId}</span></p>}
          <p>Payment number: <span className="font-semibold">{payNumber}</span></p>
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">Payment once done is non-refundable.</p>
      </div>

      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="text-sm font-semibold text-slate-800">Final step to confirm</p>
        <p className="mt-1 text-sm text-slate-600">
          After paying, send your <strong>payment screenshot</strong> on WhatsApp and we’ll confirm your slot.
        </p>
        <a href={waLink} target="_blank" rel="noreferrer" className="btn-primary mt-4 w-full !bg-[#25D366] hover:!bg-[#1ebe5a]">
          <WhatsAppIcon size={18} /> Send screenshot on WhatsApp
        </a>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck size={14} /> Your slot is reserved for a short while pending payment confirmation.
      </p>
    </div>
  )
}
