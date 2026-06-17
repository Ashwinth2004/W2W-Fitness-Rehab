import { CalendarCheck, Clock, MapPin, ShieldCheck } from 'lucide-react'
import BookingForm from '../components/BookingForm'
import { BUSINESS } from '../lib/constants'

export default function Booking() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-50 to-white py-14 md:py-20">
        <div className="container-page text-center">
          <span className="section-eyebrow">Appointments</span>
          <h1 className="text-4xl font-extrabold md:text-5xl">Book a Physiotherapy Appointment</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Pick a date and time — your physiotherapy slot is confirmed instantly. You’ll get a reminder before your
            visit. Looking for Yoga, Lifestyle Fitness or the Academy? <a href="/contact" className="font-medium text-brand-600 hover:underline">Send an enquiry</a>.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr,1.4fr]">
          <div className="space-y-5">
            <div className="card p-6">
              <h2 className="text-lg font-bold">Why book online?</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex gap-3"><CalendarCheck className="shrink-0 text-brand-600" size={20} /> Instant confirmation — no waiting for a call back.</li>
                <li className="flex gap-3"><Clock className="shrink-0 text-brand-600" size={20} /> See real-time availability — Mon–Sat, 9 AM–12 PM &amp; 4–8 PM. Book before arrival.</li>
                <li className="flex gap-3"><ShieldCheck className="shrink-0 text-brand-600" size={20} /> Your details stay private and are used only for this booking.</li>
                <li className="flex gap-3"><MapPin className="shrink-0 text-brand-600" size={20} /> {BUSINESS.address}</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-brand-950 p-6 text-white">
              <p className="text-sm text-brand-100">Prefer to talk first?</p>
              <p className="mt-1 text-lg font-semibold">Call {BUSINESS.phoneDisplay}</p>
              <p className="text-sm text-brand-200">or WhatsApp {BUSINESS.whatsappDisplay}</p>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <BookingForm />
          </div>
        </div>
      </section>
    </>
  )
}
