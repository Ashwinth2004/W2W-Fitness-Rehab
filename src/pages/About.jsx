import { Link } from 'react-router-dom'
import { Instagram, GraduationCap, Target, Heart, Eye } from 'lucide-react'
import { FOUNDERS, BUSINESS } from '../lib/constants'
import Seo from '../components/Seo'

export default function About() {
  return (
    <>
      <Seo
        title="About Us & Our Founders"
        description="Meet the physiotherapists behind W2W Fitness & Rehab, Mylapore — our story, mission, vision and W2W Academy."
        path="/about"
      />
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
            <h2 className="text-3xl font-bold md:text-4xl">Led by Passionate Experts</h2>
            <p className="mx-auto mt-4 text-slate-600">
              W2W was built by clinicians who live and breathe movement. Between them, our founders bring over a decade
              of hands-on experience across physiotherapy, rehabilitation, strength and yoga — united by one belief:
              that the best care is personal, evidence-based and genuinely caring.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {FOUNDERS.map((f) => (
              <div key={f.name} className="card p-7 text-center md:text-left">
                <div className="flex flex-col items-center gap-4 md:flex-row md:gap-5">
                  {f.photo ? (
                    <img
                      src={f.photo}
                      alt={f.name}
                      loading="lazy"
                      className="h-28 w-28 shrink-0 rounded-2xl object-cover object-top ring-2 ring-brand-100"
                    />
                  ) : (
                    <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-brand-100 text-3xl font-bold text-brand-700">
                      {f.name[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{f.name}</h3>
                    <p className="text-sm font-medium text-brand-600">{f.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{f.bio}</p>
                {f.credentials?.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                    {f.credentials.map((c) => (
                      <span key={c} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{c}</span>
                    ))}
                  </div>
                )}
                <a href={f.instagram} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline">
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
            {/* Intro + certificate presentation photo */}
            <div className="grid items-stretch gap-8 p-8 md:grid-cols-2 md:gap-12 md:p-12">
              <div className="text-center md:text-left">
                <div className="mb-4 inline-grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
                  <GraduationCap size={34} className="text-brand-300" />
                </div>
                <h2 className="text-3xl font-bold text-white">W2W Academy</h2>
                <p className="mt-3 text-brand-100">
                  Shaping future physiotherapists. We empower aspiring professionals through hands-on workshops covering
                  anatomy, biomechanics, exercise prescription, case discussions and treatment approaches. In just six
                  months, we’ve trained <strong className="text-white">100+ students</strong> with the skills and
                  confidence to excel — and every participant is certified on completion.
                </p>
                <Link to="/contact" className="btn-outline mt-6 border-white !text-white hover:bg-white/10">
                  Enquire about workshops
                </Link>
              </div>
              <figure className="relative h-full min-h-[260px] w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15">
                <img
                  src="/academy/w2w-academy-certificate-ceremony.webp"
                  alt="Certificate presentation at a W2W Academy physiotherapy workshop in Mylapore"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-center text-sm text-brand-100">
                  Certificate presentation to a W2W Academy participant
                </figcaption>
              </figure>
            </div>

            {/* Sample certificate */}
            <div className="border-t border-white/10 px-8 py-10 text-center md:px-12">
              <span className="text-sm font-semibold uppercase tracking-wider text-brand-300">Certificate of Participation</span>
              <h3 className="mt-1 text-xl font-bold text-white md:text-2xl">Recognised for every workshop you complete</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-brand-100">
                Below is a sample of the certificate awarded to students who complete a W2W Academy workshop.
              </p>
              <figure className="mx-auto mt-6 max-w-2xl">
                <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
                  <img
                    src="/academy/w2w-academy-sample-certificate.webp"
                    alt="Sample W2W Academy Certificate of Participation"
                    loading="lazy"
                    className="w-full rounded-xl"
                  />
                </div>
                <figcaption className="mt-3 text-xs text-brand-300">Sample certificate — shown for illustration only.</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
