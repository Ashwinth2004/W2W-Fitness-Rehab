import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { getPostBySlug } from '../lib/firestore'
import { fmtDate } from '../lib/format'
import { useBooking } from '../context/BookingContext'
import { SITE_URL, BUSINESS } from '../lib/constants'
import Seo from '../components/Seo'

const SEED_BODY = {
  'prevent-running-injuries':
    'Running is one of the best things you can do for your health — but overuse injuries are common. Warm up dynamically, build mileage gradually (the 10% rule), strengthen your hips and calves, invest in the right shoes, and never skip recovery days. If pain persists beyond a couple of days, book a physiotherapy assessment early rather than running through it.',
  'desk-posture-back-pain':
    'Sitting for long hours shortens hip flexors and weakens the posterior chain, leading to lower-back pain. Set your screen at eye level, keep feet flat, and stand every 30–40 minutes. Try cat–cow, glute bridges, hip-flexor stretches and thoracic rotations daily. Persistent pain responds well to targeted manual therapy and a tailored exercise plan.',
  'why-strength-training-after-40':
    'After 40 we lose muscle mass and bone density faster. Resistance training 2–3 times a week protects bones, joints and metabolism, improves balance, and keeps you independent for longer. Start light, focus on form, and progress gradually — our trainers build programs that are safe and effective for every level.',
}

export default function BlogPost() {
  const { slug } = useParams()
  const { openBooking } = useBooking()
  const [post, setPost] = useState(undefined)

  useEffect(() => {
    getPostBySlug(slug)
      .then((p) => {
        if (p) setPost(p)
        else if (SEED_BODY[slug]) setPost({ slug, title: titleFromSlug(slug), body: SEED_BODY[slug] })
        else setPost(null)
      })
      .catch(() => setPost(SEED_BODY[slug] ? { slug, title: titleFromSlug(slug), body: SEED_BODY[slug] } : null))
  }, [slug])

  // BlogPosting structured data for rich results (added when the post loads).
  useEffect(() => {
    if (!post) return
    const desc = post.excerpt || String(post.body || '').replace(/\s+/g, ' ').slice(0, 200)
    const created = post.createdAt?.seconds ? post.createdAt.seconds * 1000 : post.createdAt
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: desc,
      image: `${SITE_URL}/w2w-fitness-rehab-logo.jpg`,
      author: { '@type': 'Organization', name: BUSINESS.name },
      publisher: {
        '@type': 'Organization',
        name: BUSINESS.name,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/w2w-fitness-rehab-logo.jpg` },
      },
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug || slug}`,
      ...(created ? { datePublished: new Date(created).toISOString() } : {}),
    }
    let el = document.getElementById('article-jsonld')
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'article-jsonld'; document.head.appendChild(el) }
    el.textContent = JSON.stringify(ld)
    return () => { document.getElementById('article-jsonld')?.remove() }
  }, [post, slug])

  if (post === undefined) return <div className="container-page py-24 text-center text-slate-400">Loading…</div>
  if (post === null)
    return (
      <div className="container-page py-24 text-center">
        <Seo title="Article not found" noindex path={`/blog/${slug}`} />
        <h1 className="text-2xl font-bold">Article not found</h1>
        <Link to="/blog" className="btn-outline mt-6">Back to blog</Link>
      </div>
    )

  return (
    <article className="container-page max-w-3xl py-14 md:py-20">
      <Seo
        title={post.title}
        description={post.excerpt || String(post.body || '').replace(/\s+/g, ' ').slice(0, 155)}
        path={`/blog/${post.slug || slug}`}
      />
      <Link to="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:gap-2">
        <ArrowLeft size={16} /> All articles
      </Link>
      <header className="mt-5 border-b border-slate-100 pb-6">
        {post.createdAtText && (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {post.createdAtText}
          </span>
        )}
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">{post.title}</h1>
        {post.createdAt && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays size={14} /> {fmtDate(post.createdAt)}
          </p>
        )}
      </header>

      <div className="mt-8 whitespace-pre-line break-words [overflow-wrap:anywhere] text-[1.05rem] leading-relaxed text-slate-700">{post.body}</div>

      <div className="mt-12 rounded-2xl bg-brand-50 p-6 text-center">
        <p className="font-semibold text-slate-900">Have a concern we can help with?</p>
        <button onClick={() => openBooking()} className="btn-primary mt-4">Book an appointment</button>
      </div>
    </article>
  )
}

function titleFromSlug(slug) {
  return slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}
