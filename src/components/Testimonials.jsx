import { useEffect, useState } from 'react'
import { Star, Quote } from 'lucide-react'
import { getApprovedTestimonials } from '../lib/firestore'

// Falls back to seed reviews until the admin adds real ones in the dashboard.
const SEED = [
  { name: 'Priya R.', rating: 5, text: 'Recovered from a knee injury in weeks. Sakthi’s hands-on physiotherapy and home exercises made all the difference!' },
  { name: 'Karthik M.', rating: 5, text: 'The lifestyle fitness program is brilliant — personalised, sustainable and the trainers genuinely care about results.' },
  { name: 'Lakshmi S.', rating: 5, text: 'Post-surgery rehab here was reassuring and professional. Highly recommend W2W in Mylapore.' },
]

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
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.slice(0, 6).map((t, i) => (
            <div key={t.id || i} className="card animate-fade-in p-6">
              <Quote className="text-brand-300" size={28} />
              <p className="mt-3 text-slate-600">{t.text}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-semibold text-slate-900">{t.name}</p>
                <div className="flex">
                  {Array.from({ length: t.rating || 5 }).map((_, k) => (
                    <Star key={k} size={16} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
