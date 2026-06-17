import { useEffect, useState } from 'react'
import { Star, ExternalLink } from 'lucide-react'
import { GoogleIcon } from './BrandIcons'
import { getApprovedTestimonials } from '../lib/firestore'
import { BUSINESS } from '../lib/constants'

// Falls back to seed reviews until the admin adds real ones in the dashboard.
const SEED = [
  { name: 'Priya R.', rating: 5, text: 'Recovered from a knee injury in weeks. Sakthi’s hands-on physiotherapy and home exercises made all the difference!', when: 'a month ago' },
  { name: 'Karthik M.', rating: 5, text: 'The lifestyle fitness program is brilliant — personalised, sustainable and the trainers genuinely care about results.', when: '2 months ago' },
  { name: 'Lakshmi S.', rating: 5, text: 'Post-surgery rehab here was reassuring and professional. Highly recommend W2W in Mylapore.', when: '3 weeks ago' },
]

// Deterministic avatar colour from the name (Google-style coloured initials).
const AVATAR_COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-fuchsia-500']
const colorFor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

function Stars({ n = 5 }) {
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, k) => (
        <Star key={k} size={16} className={k < n ? 'fill-[#fbbc05] text-[#fbbc05]' : 'fill-slate-200 text-slate-200'} />
      ))}
    </div>
  )
}

export default function Testimonials() {
  const [items, setItems] = useState(SEED)

  useEffect(() => {
    getApprovedTestimonials()
      .then((list) => {
        if (list.length) setItems(list)
      })
      .catch(() => {})
  }, [])

  return (
    <section className="bg-brand-50/60 py-16 md:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">Happy Clients</span>
          <h2 className="text-3xl font-bold md:text-4xl">What our community says</h2>
        </div>

        {/* Google rating summary bar */}
        <div className="mx-auto mt-8 flex max-w-xl flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm sm:flex-row sm:gap-6 sm:text-left">
          <div className="flex items-center gap-3">
            <GoogleIcon size={34} />
            <div>
              <p className="text-sm font-semibold text-slate-700">Google Reviews</p>
              <p className="text-xs text-slate-500">W2W Fitness &amp; Rehab</p>
            </div>
          </div>
          <div className="hidden h-10 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-slate-900">{BUSINESS.rating.toFixed(1)}</span>
            <div>
              <Stars n={5} />
              <p className="mt-0.5 text-xs text-slate-500">Based on {BUSINESS.reviewCount}+ reviews</p>
            </div>
          </div>
          <a
            href={BUSINESS.reviewsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 sm:ml-auto"
          >
            Write a review
          </a>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.slice(0, 6).map((t, i) => (
            <div key={t.id || i} className="card animate-fade-in p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold text-white ${colorFor(t.name)}`}>
                    {(t.name || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.when || 'Verified client'}</p>
                  </div>
                </div>
                <GoogleIcon size={18} />
              </div>
              <div className="mt-3">
                <Stars n={t.rating || 5} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{t.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={BUSINESS.reviewsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
          >
            See all reviews on Google <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </section>
  )
}
