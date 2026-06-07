import { CheckCircle2, CalendarCheck, ArrowRight } from 'lucide-react'
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
              className={`card grid items-center gap-8 overflow-hidden p-6 md:grid-cols-2 md:p-10 ${i % 2 ? 'md:[&>div:first-child]:order-2' : ''}`}
            >
              <div className="text-center md:text-left">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 md:mx-0">
                  <ServiceIcon name={s.icon} size={30} />
                </div>
                <h2 className="mt-5 text-2xl font-bold md:text-3xl">{s.title}</h2>
                <p className="mt-3 text-slate-600">{s.short}</p>
                <ul className="mt-5 inline-block space-y-2.5 text-left md:block">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-slate-700">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-brand-500" size={20} /> {p}
                    </li>
                  ))}
                </ul>
                <button onClick={() => openBooking({ service: s.title })} className="btn-primary mt-6">
                  <CalendarCheck size={18} /> Book {s.title}
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl">
                <img
                  src={s.image}
                  alt={s.title}
                  loading="lazy"
                  className="h-64 w-full object-cover md:h-80"
                />
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
          <button onClick={() => openBooking()} className="btn-white mt-8">
            Get a Personalised Plan <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </>
  )
}
