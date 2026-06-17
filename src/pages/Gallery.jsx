import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { InstagramIcon } from '../components/BrandIcons'
import {
  GALLERY_PHOTOS, INSTAGRAM_PROFILE, INSTAGRAM_HANDLE, INSTAGRAM_FEED_EMBED,
} from '../lib/constants'

export default function Gallery() {
  const [active, setActive] = useState(null) // index of open photo, or null

  const close = useCallback(() => setActive(null), [])
  const show = useCallback((i) => setActive(((i % GALLERY_PHOTOS.length) + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length), [])

  useEffect(() => {
    if (active === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setActive((a) => (a + 1) % GALLERY_PHOTOS.length)
      if (e.key === 'ArrowLeft') setActive((a) => (a - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [active, close])

  return (
    <>
      <section className="bg-gradient-to-br from-brand-50 to-white py-14 md:py-20">
        <div className="container-page text-center">
          <span className="section-eyebrow">Gallery</span>
          <h1 className="text-4xl font-extrabold md:text-5xl">Moments at W2W</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            A look inside our Mylapore studio — treatment sessions, W2W Academy workshops, and the community that makes
            Way To Wellness what it is.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container-page">
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
            {GALLERY_PHOTOS.map((p, i) => (
              <button
                key={p.src}
                onClick={() => show(i)}
                className="group block w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <img
                  src={p.src}
                  alt={p.caption}
                  loading="lazy"
                  className="w-full transition duration-500 group-hover:scale-[1.04]"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram feed */}
      <section className="bg-brand-50/60 py-14 md:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-eyebrow">Follow our journey</span>
            <h2 className="text-3xl font-bold md:text-4xl">More on Instagram</h2>
            <p className="mt-3 text-slate-600">
              See our latest reels, transformations and behind-the-scenes on {INSTAGRAM_HANDLE}.
            </p>
          </div>

          {INSTAGRAM_FEED_EMBED ? (
            <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <iframe
                src={INSTAGRAM_FEED_EMBED}
                title="W2W Instagram feed"
                className="h-[640px] w-full"
                loading="lazy"
                scrolling="no"
                frameBorder="0"
              />
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-2xl rounded-3xl bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[2px] shadow-soft">
              <div className="flex flex-col items-center gap-4 rounded-3xl bg-white px-6 py-10 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
                  <InstagramIcon size={32} />
                </span>
                <h3 className="text-xl font-bold">{INSTAGRAM_HANDLE}</h3>
                <p className="max-w-md text-sm text-slate-600">
                  Tap below to view our full photo &amp; video feed on Instagram.
                </p>
                <a href={INSTAGRAM_PROFILE} target="_blank" rel="noreferrer" className="btn-primary">
                  <InstagramIcon size={18} /> Open Instagram <ExternalLink size={15} />
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {active !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 no-print" onClick={close}>
          <button
            onClick={close}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setActive((a) => (a - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length) }}
            className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
            aria-label="Previous"
          >
            <ChevronLeft size={26} />
          </button>
          <figure className="max-h-[88vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={GALLERY_PHOTOS[active].src} alt={GALLERY_PHOTOS[active].caption} className="mx-auto max-h-[80vh] w-auto rounded-xl object-contain" />
            <figcaption className="mt-3 text-center text-sm text-white/80">
              {GALLERY_PHOTOS[active].caption} · {active + 1} / {GALLERY_PHOTOS.length}
            </figcaption>
          </figure>
          <button
            onClick={(e) => { e.stopPropagation(); setActive((a) => (a + 1) % GALLERY_PHOTOS.length) }}
            className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
            aria-label="Next"
          >
            <ChevronRight size={26} />
          </button>
        </div>
      )}
    </>
  )
}
