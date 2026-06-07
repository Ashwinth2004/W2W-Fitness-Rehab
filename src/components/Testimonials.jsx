import { useEffect, useMemo, useState } from 'react'
import { Star, Quote } from 'lucide-react'
import { getApprovedTestimonials } from '../lib/firestore'

// Falls back to seed reviews until the admin adds real ones in the dashboard.
const SEED = [
  { name: 'Priya R.', rating: 5, text: 'Recovered from a knee injury in weeks. Sakthi’s hands-on physiotherapy and home exercises made all the difference!' },
  { name: 'Karthik M.', rating: 5, text: 'The lifestyle fitness program is brilliant — personalised, sustainable and the trainers genuinely care about results.' },
  { name: 'Lakshmi S.', rating: 5, text: 'Post-surgery rehab here was reassuring and professional. Highly recommend W2W in Mylapore.' },
  { name: 'Arjun V.', rating: 5, text: 'Joined the W2W Academy workshops — the anatomy and hands-on sessions gave me real confidence as a trainer.' },
  { name: 'Meena G.', rating: 5, text: 'My back pain from desk work is finally gone. The posture correction and yoga sessions were exactly what I needed.' },
]

function Card({ t }) {
  return (
    <div className="card mx-3 flex w-[300px] shrink-0 flex-col p-6 sm:w-[360px]">
      <Quote className="text-brand-300" size={28} />
      <p className="mt-3 flex-1 text-slate-600">{t.text}</p>
      <div className="mt-5 flex items-center justify-between">
        <p className="font-semibold text-slate-900">{t.name}</p>
        <div className="flex">
          {Array.from({ length: t.rating || 5 }).map((_, k) => (
            <Star key={k} size={16} className="fill-amber-400 text-amber-400" />
          ))}
        </div>
      </div>
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

  // Repeat the reviews until there are enough cards to fill the row, then lay
  // them out twice so a -50% translate loops seamlessly. Speed stays constant
  // regardless of how many reviews exist.
  const { loop, duration } = useMemo(() => {
    const base = []
    while (base.length < Math.max(items.length, 6)) base.push(...items)
    return { loop: [...base, ...base], duration: `${base.length * 6}s` }
  }, [items])

  return (
    <section className="overflow-hidden bg-brand-50/60 py-16 md:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">Happy Clients</span>
          <h2 className="text-3xl font-bold md:text-4xl">What our community says</h2>
          <p className="mt-3 text-slate-600">Real stories from people we’ve helped move, heal and feel their best.</p>
        </div>
      </div>

      {/* Self-running marquee — pauses on hover, freezes for reduced-motion users. */}
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
