import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { getPublishedPosts } from '../lib/firestore'
import { fmtDate } from '../lib/format'
import Seo from '../components/Seo'

// Seed articles shown until the admin publishes real posts.
const SEED = [
  { slug: 'prevent-running-injuries', title: '5 Ways to Prevent Common Running Injuries', excerpt: 'Simple warm-up, strength and recovery habits that keep runners on the road and out of the clinic.', createdAtText: 'Health Tips', coverImage: '/blog/prevent-running-injuries.webp' },
  { slug: 'desk-posture-back-pain', title: 'Beat Desk-Job Back Pain', excerpt: 'Posture corrections and 4 daily mobility drills to relieve lower-back tightness from long hours at a desk.', createdAtText: 'Physiotherapy', coverImage: '/blog/desk-posture-back-pain.webp' },
  { slug: 'why-strength-training-after-40', title: 'Why Strength Training Matters After 40', excerpt: 'How resistance training protects bone density, mobility and metabolism as you age.', createdAtText: 'Fitness', coverImage: '/blog/strength-training-after-40.webp' },
]

export default function Blog() {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    getPublishedPosts()
      .then((list) => setPosts(list.length ? list : SEED))
      .catch(() => setPosts(SEED))
  }, [])

  return (
    <>
      <Seo
        title="Health Tips & Blog"
        description="Physiotherapy, fitness and wellness tips from the experts at W2W Fitness & Rehab, Mylapore."
        path="/blog"
      />
      <section className="bg-gradient-to-br from-brand-50 to-white py-14 md:py-20">
        <div className="container-page text-center">
          <span className="section-eyebrow">Health Tips & Insights</span>
          <h1 className="text-4xl font-extrabold md:text-5xl">The W2W Blog</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Expert advice on recovery, fitness, posture and wellness from our physiotherapists and trainers.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-page">
          {!posts ? (
            <p className="text-center text-slate-400">Loading articles…</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <article key={p.slug} className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-soft">
                  <div className="h-44 overflow-hidden">
                    {p.coverImage ? (
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-gradient-to-br from-brand-400 to-brand-700 text-2xl font-bold text-white">
                        W2W
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-brand-600">
                      <CalendarDays size={14} /> {p.createdAt ? fmtDate(p.createdAt) : p.createdAtText || 'Article'}
                    </p>
                    <h3 className="mt-2 text-lg font-bold">{p.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-slate-600">{p.excerpt}</p>
                    <Link to={`/blog/${p.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:gap-2">
                      Read more <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
