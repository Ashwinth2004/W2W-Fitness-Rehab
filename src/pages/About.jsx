import { Link } from 'react-router-dom'
import {
  Instagram, GraduationCap, Target, Heart, Eye, Award, Users, Activity,
  Star, CheckCircle2, ArrowRight, MapPin, ShieldCheck,
} from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import { FOUNDERS, BUSINESS } from '../lib/constants'

const STATS = [
  { value: '10+', label: 'Years of combined expertise', icon: Award },
  { value: '100+', label: 'Students trained at W2W Academy', icon: Users },
  { value: '4.9★', label: 'Average client rating', icon: Star },
  { value: '6 days', label: 'Open every week (Mon–Sat)', icon: Activity },
]

const VALUES = [
  { icon: Target, t: 'Our Mission', d: 'To help every client move better, heal faster and live pain-free through personalised, evidence-based care.' },
  { icon: Eye, t: 'Our Vision', d: 'To be Chennai’s most trusted destination for physiotherapy, rehabilitation and holistic fitness.' },
  { icon: Heart, t: 'Our Values', d: 'Empathy, expertise and results — every session is personalised, effective and genuinely caring.' },
]

const PILLARS = [
  'Evidence-based physiotherapy & manual therapy',
  'Personalised rehab and fitness programming',
  'Hands-on care from internationally certified experts',
  'A welcoming space for athletes, post-surgery & elderly clients',
]

export default function About() {
  const { openBooking } = useBooking()

  return (
    <>
      {/* HERO — split layout with image collage (different style to other pages) */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-700/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-800/40 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="badge bg-white/10 text-brand-100">About W2W · {BUSINESS.tagline}</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">
              More than a clinic — a <span className="text-brand-300">Way To Wellness</span>.
            </h1>
            <p className="mt-5 max-w-lg text-brand-100">
              W2W Fitness &amp; Rehab is a Mylapore-based studio where physiotherapy, rehabilitation, yoga and lifestyle
              fitness come together under one roof. We blend clinical expertise with genuine care to get you back to
              doing what you love — stronger and pain-free.
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-brand-200">
              <MapPin size={16} className="text-brand-300" /> {BUSINESS.address}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => openBooking()} className="btn-primary bg-white !text-brand-700 hover:bg-brand-50">
                Book a Session
              </button>
              <Link to="/gallery" className="btn-outline border-white !text-white hover:bg-white/10">
                See our space <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <img src="/gallery/g05.jpg" alt="Hands-on care at W2W" loading="lazy" className="h-44 w-full rounded-2xl object-cover shadow-soft md:h-56" />
            <img src="/services/yoga.jpg" alt="Yoga at W2W" loading="lazy" className="mt-8 h-44 w-full rounded-2xl object-cover shadow-soft md:h-56" />
            <img src="/services/fitness.jpg" alt="Lifestyle fitness at W2W" loading="lazy" className="h-44 w-full rounded-2xl object-cover shadow-soft md:h-56" />
            <img src="/gallery/g02.jpg" alt="W2W rehab training" loading="lazy" className="mt-8 h-44 w-full rounded-2xl object-cover shadow-soft md:h-56" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-slate-100 bg-white">
        <div className="container-page grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <s.icon size={22} />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OUR STORY */}
      <section className="py-14 md:py-20">
        <div className="container-page grid items-center gap-10 md:grid-cols-[1.1fr,0.9fr]">
          <div>
            <span className="section-eyebrow">Our Story</span>
            <h2 className="text-3xl font-bold md:text-4xl">Built on care, driven by results</h2>
            <p className="mt-4 text-slate-600">
              W2W was founded with a simple belief: recovery and fitness should never feel intimidating. What began as a
              passion for hands-on physiotherapy has grown into a full wellness studio serving athletes, working
              professionals, post-surgery patients and elders across Chennai.
            </p>
            <p className="mt-3 text-slate-600">
              Today, our team combines orthopaedic and neurological physiotherapy, manual therapy and dry needling with
              strength training, Hatha yoga and lifestyle coaching — all tailored to you. Through the W2W Academy, we also
              mentor the next generation of physiotherapists.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {PILLARS.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-brand-500" size={18} /> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <img src="/gallery/g07.jpg" alt="W2W treatment session" loading="lazy" className="h-80 w-full rounded-3xl object-cover shadow-soft" />
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-100 sm:block">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShieldCheck size={18} className="text-brand-600" /> Trusted, evidence-based care
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION / VISION / VALUES — numbered style */}
      <section className="bg-brand-50/60 py-14 md:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-eyebrow">What drives us</span>
            <h2 className="text-3xl font-bold md:text-4xl">Mission, Vision &amp; Values</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {VALUES.map((c, i) => (
              <div key={c.t} className="card relative overflow-hidden p-7">
                <span className="absolute -right-2 -top-3 text-7xl font-extrabold text-brand-100">{i + 1}</span>
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
                  <c.icon size={26} />
                </div>
                <h3 className="relative mt-4 text-xl font-bold">{c.t}</h3>
                <p className="relative mt-2 text-slate-600">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDERS — large alternating portraits */}
      <section className="py-14 md:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-eyebrow">Meet Our Founders</span>
            <h2 className="text-3xl font-bold md:text-4xl">The People Behind W2W</h2>
          </div>
          <div className="mt-12 space-y-8">
            {FOUNDERS.map((f, i) => (
              <div
                key={f.name}
                className={`card grid items-stretch gap-0 overflow-hidden md:grid-cols-[20rem,1fr] ${
                  i % 2 ? 'md:[&>img]:order-2' : ''
                }`}
              >
                <img src={f.photo} alt={f.name} loading="lazy" className="h-80 w-full object-cover object-top md:h-full" />
                <div className="p-7 md:p-9">
                  <h3 className="text-2xl font-bold">{f.name}</h3>
                  <p className="text-sm font-semibold text-brand-600">{f.role}</p>
                  {f.credentials?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {f.credentials.map((c) => (
                        <span key={c} className="badge bg-brand-50 text-brand-700">{c}</span>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 leading-relaxed text-slate-600">{f.bio}</p>
                  <a href={f.instagram} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
                    <Instagram size={16} /> Follow on Instagram
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACADEMY */}
      <section className="pb-16 md:pb-24">
        <div className="container-page">
          <div className="overflow-hidden rounded-3xl bg-brand-950 text-white">
            <div className="grid items-center gap-0 md:grid-cols-2">
              <img src="/gallery/g15.jpg" alt="W2W Academy certificate ceremony" loading="lazy" className="h-64 w-full object-cover md:h-full" />
              <div className="p-8 md:p-12">
                <div className="mb-4 inline-grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                  <GraduationCap size={30} className="text-brand-300" />
                </div>
                <h2 className="text-3xl font-bold">W2W Academy</h2>
                <p className="mt-3 text-brand-100">
                  Shaping future physiotherapists. We empower aspiring professionals through hands-on workshops covering
                  anatomy, biomechanics, exercise prescription, case discussions and treatment approaches. In just six
                  months, we’ve trained <strong className="text-white">100+ students</strong> with the skills and
                  confidence to excel.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/workshop" className="btn-primary bg-white !text-brand-700 hover:bg-brand-50">
                    Explore Workshops
                  </Link>
                  <Link to="/gallery" className="btn-outline border-white !text-white hover:bg-white/10">
                    View Gallery
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
