import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { GoogleIcon } from './BrandIcons'
import { getApprovedTestimonials } from '../lib/firestore'
import { BUSINESS } from '../lib/constants'

// Real Google reviews (5.0★) for W2W Fitness & Rehab — kept as a fallback that
// matches the live Google listing until the admin curates reviews in Firestore.
const SEED = [
  { name: 'Tharun Kumar', rating: 5, when: '2 months ago', text: 'Had knee pain and took treatment here. Feeling much better now and even started working out again. Good experience overall.' },
  { name: 'Sandeep Mishra', rating: 5, when: 'a year ago', text: 'Great experience working with Shakti who has now practically worked with my entire family. Her approach is simple and highly effective — working towards overall outcomes vs temporary pain fixes. Would highly recommend!' },
  { name: 'Vibhu Natarajan', rating: 5, when: 'a year ago', text: 'Shakti is hands on. She has good intuition and is very thorough in her assessments. She is professional and is able to assess your physical abilities even better than you can judge yourself. No hesitation in recommending her.' },
  { name: 'Suhas Anjan', rating: 5, when: '2 years ago', text: 'Dr. Sakthi visited my father as he was recovering from a major skull operation. Within 2 weeks my father was able to walk around — a huge progress as he was bedridden. Highly recommend the consult here.' },
  { name: 'Yamuna Dhasan', rating: 5, when: '2 years ago', text: 'My experience with physiotherapist Sakthi was incredibly positive. She expertly addressed my back pain by identifying the fundamental cause, and as a result my back pain eased off over time. Thanks for helping me out, Sakthi.' },
  { name: 'Kala Natarajan', rating: 5, when: 'a year ago', text: 'I have been visiting W2W Fitness & Rehab for my back pain. After my PT visits I have now gained confidence. The team has a good vision and offers a suitable treatment and rehabilitation plan.' },
]

// Deterministic avatar colour from the name (Google-style coloured initials).
const AVATAR_COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-fuchsia-500']
const colorFor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

function Stars({ n = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, k) => (
        <Star key={k} size={16} className={k < n ? 'fill-[#fbbc05] text-[#fbbc05]' : 'fill-white/20 text-white/20'} />
      ))}
    </div>
  )
}

function Card({ t }) {
  return (
    <article className="mx-3 flex w-[300px] shrink-0 flex-col rounded-2xl bg-white p-6 text-left shadow-xl sm:w-[360px]">
      <div className="flex items-center justify-between">
        <Stars n={t.rating || 5} />
        <GoogleIcon size={20} />
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{t.text}</p>
      <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold text-white ${colorFor(t.name)}`}>
          {(t.name || 'A')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{t.name}</p>
          {t.date && <p className="text-xs text-slate-400">{t.date}</p>}
        </div>
      </div>
    </article>
  )
}

export default function Testimonials() {
  const [items, setItems] = useState(SEED)

  useEffect(() => {
    getApprovedTestimonials()
      .then((list) => { if (list.length) setItems(list) })
      .catch(() => {})
  }, [])

  // Repeat the reviews until there are enough cards to fill the row, then lay
  // them out twice so a -50% translate loops seamlessly. Speed is constant.
  const { loop, duration } = useMemo(() => {
    const base = []
    while (base.length < Math.max(items.length, 6)) base.push(...items)
    return { loop: [...base, ...base], duration: `${base.length * 6}s` }
  }, [items])

  return (
    <section className="overflow-hidden bg-brand-950 py-16 text-white md:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-2 inline-block text-sm font-semibold uppercase tracking-wider text-brand-300">Happy Clients</span>
          <h2 className="text-3xl font-bold text-white md:text-4xl">What our community says</h2>
          <p className="mt-3 text-brand-100">Real stories from the people we’ve helped move, heal and feel their best.</p>

          {/* Google rating trust pill */}
          <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full bg-white/10 px-5 py-3 ring-1 ring-white/15">
            <span className="flex items-center gap-2">
              <GoogleIcon size={22} />
              <span className="text-2xl font-bold text-white">{BUSINESS.rating.toFixed(1)}</span>
              <Stars n={5} />
            </span>
            <span className="text-sm text-brand-100">{BUSINESS.reviewCount}+ Google reviews</span>
            <a
              href={BUSINESS.reviewsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Write a review
            </a>
          </div>
        </div>
      </div>

      {/* Self-running marquee of review cards — pauses on hover, freezes for reduced-motion users. */}
      <div className="marquee-viewport marquee-mask mt-12 overflow-hidden">
        <div className="marquee-track" style={{ '--marquee-duration': duration }}>
          {loop.map((t, i) => (
            <Card key={(t.id || t.name) + '-' + i} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}
