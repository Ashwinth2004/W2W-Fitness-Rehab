import { Instagram, GraduationCap, Target, Heart, Eye } from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { FOUNDERS, BUSINESS } from '../lib/constants'

export default function About() {
  const { openBooking } = useBooking()

  return (
    <>
      <section className="bg-gradient-to-br from-brand-50 to-white py-14 md:py-20">
        <div className="container-page text-center">
          <span className="section-eyebrow">About Us</span>
          <h1 className="text-4xl font-extrabold md:text-5xl">Way To Wellness</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">{BUSINESS.quote}</p>
        </div>
      </section>

      {/* Mission / Vision / Values */}
      <section className="py-14 md:py-20">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {[
            { icon: Target, t: 'Our Mission', d: 'To help every client move better, heal faster and live pain-free through personalised, evidence-based care.' },
            { icon: Eye, t: 'Our Vision', d: 'To be Chennai’s most trusted destination for physiotherapy, rehabilitation and holistic fitness.' },
            { icon: Heart, t: 'Our Values', d: 'Empathy, expertise and results — every session is personalised, effective and genuinely caring.' },
          ].map((c) => (
            <div key={c.t} className="card p-7 text-center md:text-left">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 md:mx-0">
                <c.icon size={26} />
              </div>
              <h3 className="mt-4 text-xl font-bold">{c.t}</h3>
              <p className="mt-2 text-slate-600">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founders */}
      <section className="bg-brand-50/60 py-14 md:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-eyebrow">Meet Our Founders</span>
            <h2 className="text-3xl font-bold md:text-4xl">The People Behind W2W</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {FOUNDERS.map((f) => (
              <div key={f.name} className="card p-7">
                <div className="flex items-center gap-4">
                  {f.image ? (
                    <img
                      src={f.image}
                      alt={f.name}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-brand-100"
                    />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
                      {f.name[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{f.name}</h3>
                    <p className="text-sm font-medium text-brand-600">{f.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{f.bio}</p>
                <a href={f.instagram} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline">
                  <Instagram size={16} /> Follow on Instagram
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Academy */}
      <section className="py-14 md:py-20">
        <div className="container-page">
          <div className="overflow-hidden rounded-3xl bg-brand-950 text-white">
            <div className="grid items-center md:grid-cols-2">
              <div className="p-8 text-center md:p-12 md:text-left">
                <div className="mb-4 inline-grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                  <GraduationCap size={30} className="text-brand-300" />
                </div>
                <h2 className="text-3xl font-bold text-white">W2W Academy</h2>
                <p className="mt-3 text-brand-100">
                  Shaping future physiotherapists. We empower aspiring professionals through hands-on workshops covering
                  anatomy, biomechanics, exercise prescription, case discussions and treatment approaches. In just six
                  months, we’ve trained <strong className="text-white">100+ students</strong> with the skills and
                  confidence to excel.
                </p>
                <button onClick={() => openBooking({ service: 'W2W Academy' })} className="btn-white mt-6">
                  Enquire about workshops
                </button>
              </div>
              <div className="h-64 md:h-full md:min-h-[22rem]">
                <img
                  src="/images/academy.jpg"
                  alt="W2W Academy — students receiving certificates after a hands-on workshop"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
