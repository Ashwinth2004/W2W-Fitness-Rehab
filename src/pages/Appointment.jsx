import { Clock, MapPin, Phone } from 'lucide-react'
import BookingForm from '../components/BookingForm'
import Seo from '../components/Seo'
import { BUSINESS, telLink } from '../lib/constants'

// Standalone, shareable booking page — link directly to /appointment so clients
// can book without opening the popup (e.g. share on WhatsApp / Instagram bio).
export default function Appointment() {
  return (
    <>
      <Seo
        title="Book an Appointment"
        description="Book your physiotherapy appointment at W2W Fitness & Rehab, Mylapore. Pick a date and 30-minute slot — your booking is confirmed instantly."
        path="/appointment"
      />

      <section className="bg-gradient-to-br from-brand-50 to-white pb-6 pt-12 md:py-16">
        <div className="container-page text-center">
          <span className="section-eyebrow">Book Online</span>
          <h1 className="text-3xl font-extrabold md:text-4xl">Book Your Appointment</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Pick a date &amp; a 30-minute time slot — your appointment is confirmed instantly.
          </p>
        </div>
      </section>

      <section className="pb-12 pt-4 md:py-14">
        <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
          {/* Form */}
          <div className="card order-2 min-w-0 p-6 md:p-8 lg:order-1">
            <BookingForm />
          </div>

          {/* Info */}
          <aside className="order-1 min-w-0 space-y-4 lg:order-2">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900">Good to know</h2>
              <ul className="mt-4 space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Clock size={17} /></span>
                  <span>
                    <span className="block font-semibold text-slate-800">Opening hours</span>
                    {BUSINESS.hours[0].day} · {BUSINESS.hours[0].time}. {BUSINESS.hours[1].day}s closed.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><MapPin size={17} /></span>
                  <span>
                    <span className="block font-semibold text-slate-800">Where</span>
                    {BUSINESS.address}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Phone size={17} /></span>
                  <span>
                    <span className="block font-semibold text-slate-800">Call / WhatsApp</span>
                    <a href={telLink()} className="font-medium text-brand-700 hover:underline">{BUSINESS.phoneDisplay}</a>
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-amber-50 p-5 text-sm font-medium text-amber-800">
              Kindly arrive 15 minutes prior to your appointment.
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
