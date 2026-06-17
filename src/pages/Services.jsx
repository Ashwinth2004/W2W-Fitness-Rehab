import { Link } from 'react-router-dom'
import { CheckCircle2, CalendarCheck, ArrowRight, MessageSquare } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import ServiceIcon from '../components/ServiceIcon'
import { SERVICES } from '../lib/constants'

export default function Services() {
  const { openBooking } = useBooking()

  return (
    <>
      <section className="bg-gradient-to-br from-brand-50 to-white py-14 md:py-20">
        <div className="container-page text-center">
          <span className="section-eyebrow">Our Services</span>
          <h1 className="text-4xl font-extrabold md:text-5xl">Services for a Healthier You</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            At W2W Fitness &amp; Rehab, everyone deserves a pain-free, active and fulfilling life. Our expert-led programs
            help you build strength, recover faster and improve overall well-being — whatever your level or rehab need.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-page space-y-8">
          {SERVICES.map((s, i) => (
            <div
              key={s.id}
              className={`card grid items-center gap-0 overflow-hidden md:grid-cols-2 ${i % 2 ? 'md:[&>img]:order-2' : ''}`}
            >
              <img
                src={s.photo}
                alt={s.title}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-6 md:p-10">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <ServiceIcon name={s.icon} size={30} />
                </div>
                <h2 className="mt-5 text-2xl font-bold md:text-3xl">{s.title}</h2>
                <p className="mt-3 text-slate-600">{s.short}</p>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-brand-500" size={18} /> {p}
                    </li>
                  ))}
                </ul>
                {s.bookable ? (
                  <button onClick={() => openBooking({ service: s.title })} className="btn-primary mt-7">
                    <CalendarCheck size={18} /> Book {s.title}
                  </button>
                ) : (
                  <Link to="/contact" className="btn-outline mt-7">
                    <MessageSquare size={18} /> Enquire about {s.title}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-950 py-14 text-center text-white md:py-20">
        <div className="container-page">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Not sure which program fits you?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Tell us your goal or concern and our team will recommend the right path to recovery and strength.
          </p>
          <Link to="/contact" className="btn-outline mt-8 border-white !text-white hover:bg-white/10">
            Get a Personalised Plan <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  )
}
