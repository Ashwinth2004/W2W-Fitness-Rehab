import { useEffect, useRef, useState } from 'react'
import { Play, X, ExternalLink } from 'lucide-react'
import { InstagramIcon } from '../components/BrandIcons'
import { getReels } from '../lib/firestore'
import { INSTAGRAM_PROFILE, INSTAGRAM_HANDLE, REELS } from '../lib/constants'
import Seo from '../components/Seo'

// Loads Instagram's embed script once, then (re)processes blockquotes so the
// reel renders and plays inline.
function processInstagramEmbeds() {
  if (window.instgrm?.Embeds) {
    window.instgrm.Embeds.process()
    return
  }
  const id = 'instagram-embed-js'
  if (document.getElementById(id)) return
  const s = document.createElement('script')
  s.id = id
  s.async = true
  s.src = 'https://www.instagram.com/embed.js'
  document.body.appendChild(s)
}

export default function Testimonials() {
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null) // reel object being played
  const blockRef = useRef(null)

  useEffect(() => {
    getReels()
      .then((list) => setReels(list.length ? list : REELS))
      .catch(() => setReels(REELS))
      .finally(() => setLoading(false))
  }, [])

  // (Re)process the embed whenever the modal opens with a new reel.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const t = setTimeout(processInstagramEmbeds, 60)
    const onKey = (e) => e.key === 'Escape' && setOpen(null)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <Seo
        title="Patient Testimonials & Reviews"
        description="Real recovery stories and 5-star Google reviews from W2W Fitness & Rehab patients in Mylapore, Chennai."
        path="/testimonials"
      />
      <section className="bg-gradient-to-br from-brand-50 to-white py-14 md:py-20">
        <div className="container-page text-center">
          <span className="section-eyebrow">Testimonials</span>
          <h1 className="text-4xl font-extrabold md:text-5xl">Real Stories, Real Results</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Watch our clients and students share their W2W experience — straight from our Instagram, {INSTAGRAM_HANDLE}.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container-page">
          {loading ? (
            <p className="text-center text-slate-400">Loading videos…</p>
          ) : reels.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
                <InstagramIcon size={32} />
              </span>
              <h3 className="mt-4 text-lg font-bold">Video testimonials coming soon</h3>
              <p className="mt-2 text-sm text-slate-600">
                In the meantime, watch our latest reels on Instagram.
              </p>
              <a href={INSTAGRAM_PROFILE} target="_blank" rel="noreferrer" className="btn-primary mt-5">
                <InstagramIcon size={18} /> Watch on Instagram
              </a>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reels.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setOpen(r)}
                  className="group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-sm ring-1 ring-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  {r.thumbnail ? (
                    <img
                      src={r.thumbnail}
                      alt={r.caption || 'W2W testimonial'}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-center">
                      <InstagramIcon size={28} className="text-white/80" />
                      <p className="mt-3 text-sm font-semibold text-white/90 line-clamp-3">
                        {r.caption || 'W2W testimonial'}
                      </p>
                    </div>
                  )}
                  {/* dark overlay + centred play */}
                  <div className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-brand-700 shadow-lg transition group-hover:scale-110">
                      <Play size={28} className="ml-1 fill-current" />
                    </span>
                  </span>
                  {r.caption && r.thumbnail && (
                    <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-sm font-medium text-white line-clamp-2">
                      {r.caption}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <a href={INSTAGRAM_PROFILE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
              See all videos on Instagram <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* Inline player modal */}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 no-print" onClick={() => setOpen(null)}>
          <button
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <div className="max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-xl" onClick={(e) => e.stopPropagation()} ref={blockRef}>
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={open.url}
              data-instgrm-version="14"
              style={{ background: '#fff', border: 0, borderRadius: 12, margin: 0, width: '100%' }}
            >
              <a href={open.url} target="_blank" rel="noreferrer" className="block p-6 text-center text-sm text-brand-700">
                Loading video… tap to watch on Instagram
              </a>
            </blockquote>
          </div>
        </div>
      )}
    </>
  )
}
