import { Link } from 'react-router-dom'
import {
  CalendarCheck, ArrowRight, ShieldCheck, Award, Users, HeartPulse,
  Activity, CheckCircle2, Instagram, MapPin, Star,
} from 'lucide-react'
import { useBooking } from '../context/BookingContext'
import ServiceIcon from '../components/ServiceIcon'
import Testimonials from '../components/Testimonials'
import { SERVICES, FOUNDERS, BUSINESS } from '../lib/constants'

const STATS = [
  { value: '10+', label: 'Years Experience', icon: Award },
  { value: '100+', label: 'Students Trained', icon: Users },
  { value: '6 AM–9 PM', label: 'Mon to Sat', icon: Activity },
  { value: '4.9★', label: 'Client Rating', icon: Star },
]

const WHY = [
  'Certified ACE & ACSM trainers with 10+ years of experience',
  'Personalized programs for every fitness & rehab level',
  'Evidence-based, proven techniques for faster recovery',
  'A supportive community that keeps you motivated',
]

export default function Home() {
  const { openBooking } = useBooking()

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="container-page relative grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-in">
            <span className="badge bg-brand-100 text-brand-700">{BUSINESS.tagline} · Mylapore, Chennai</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl lg:text-6xl">
              Your Journey to <span className="text-brand-600">Strength</span> Starts Here!
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600">
              Expert physiotherapy, rehabilitation, yoga and lifestyle fitness — personalised to help you move better,
              heal faster and live pain-free.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => openBooking()} className="btn-primary">
                <CalendarCheck size={18} /> Book Appointment
              </button>
              <Link to="/services" className="btn-outline">
                Explore Services <ArrowRight size={18} />
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck size={18} className="text-brand-500" /> Trusted by athletes, post-surgery & elderly clients alike.
            </p>
          </div>

          <div className="relative animate-fade-in">
            <div className="mx-auto grid max-w-md place-items-center">
              <div className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-brand-100/70 blur-2xl" />
              <img src="/logo.jpg" alt="W2W Fitness & Rehab" className="relative h-72 w-72 animate-float rounded-full bg-white object-contain shadow-soft md:h-80 md:w-80" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-slate-100 bg-white">
        <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <s.icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-16 md:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-eyebrow">What We Do</span>
            <h2 className="text-3xl font-bold md:text-4xl">Services for a Healthier You</h2>
            <p className="mt-3 text-slate-600">Personalised fitness and rehabilitation solutions for every body and every goal.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <div key={s.id} className="card group p-6 transition hover:-translate-y-1 hover:shadow-soft">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <ServiceIcon name={s.icon} size={26} />
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.short}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/services" className="btn-outline">View all services <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-brand-950 py-16 text-white md:py-24">
        <div className="container-page grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="mb-2 inline-block text-sm font-semibold uppercase tracking-wider text-brand-400">Why W2W</span>
            <h2 className="text-3xl font-bold md:text-4xl">Experience the W2W Difference</h2>
            <p className="mt-4 text-brand-100">
              Led by internationally experienced ACE &amp; ACSM-certified professionals with expertise in Hatha Yoga,
              we bring a decade of wellness and rehabilitation expertise to help you move and heal better.
            </p>
            <ul className="mt-6 space-y-3">
              {WHY.map((w) => (
                <li key={w} className="flex items-start gap-3 text-brand-50">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-brand-400" size={20} /> {w}
                </li>
              ))}
            </ul>
            <button onClick={() => openBooking()} className="btn-primary mt-8 bg-white !text-brand-700 hover:bg-brand-50">
              <CalendarCheck size={18} /> Start Your Journey
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: HeartPulse, t: 'Faster Recovery', d: 'Proven techniques to heal, move and perform better.' },
              { icon: Activity, t: 'Better Mobility', d: 'Restore movement and prevent future injuries.' },
              { icon: Award, t: 'Holistic Health', d: 'Strength, flexibility, pain relief & mental wellness.' },
              { icon: Users, t: 'Supportive Team', d: 'Expert trainers and a motivating community.' },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <c.icon className="text-brand-400" size={26} />
                <p className="mt-3 font-semibold">{c.t}</p>
                <p className="mt-1 text-sm text-brand-200">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDERS */}
      <section className="py-16 md:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-eyebrow">Meet Our Founders</span>
            <h2 className="text-3xl font-bold md:text-4xl">Led by Passionate Experts</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {FOUNDERS.map((f) => (
              <div key={f.name} className="card p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
                    {f.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{f.name}</h3>
                    <p className="text-sm font-medium text-brand-600">{f.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{f.bio}</p>
                <a href={f.instagram} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline">
                  <Instagram size={16} /> Follow
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />

      {/* INSTAGRAM + CTA */}
      <section className="py-16 md:py-24">
        <div className="container-page">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-12 text-center text-white md:px-12 md:py-16">
            <h2 className="text-3xl font-bold md:text-4xl">Ready to feel your best?</h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100">
              Book an appointment in under a minute, or follow our journey on Instagram for tips and transformations.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => openBooking()} className="btn-primary bg-white !text-brand-700 hover:bg-brand-50">
                <CalendarCheck size={18} /> Book Now
              </button>
              <a href={BUSINESS.instagram} target="_blank" rel="noreferrer" className="btn-outline border-white !text-white hover:bg-white/10">
                <Instagram size={18} /> {BUSINESS.instagramHandle}
              </a>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-brand-100">
              <MapPin size={16} /> {BUSINESS.address}
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
