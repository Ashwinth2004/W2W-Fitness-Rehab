import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, CalendarCheck } from 'lucide-react'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/testimonials', label: 'Testimonials' },
  { to: '/workshop', label: 'Workshop' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all ${
        scrolled ? 'bg-white/90 shadow-sm backdrop-blur' : 'bg-white/70 backdrop-blur'
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between md:h-20">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/w2w-fitness-rehab-logo.webp" alt="W2W Fitness & Rehab logo" className="h-12 w-12 rounded-full object-contain md:h-14 md:w-14" />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold text-brand-700 md:text-xl">W2W</p>
            <p className="-mt-1 text-[11px] font-medium tracking-wide text-slate-500">Fitness &amp; Rehab</p>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm font-bold transition ${
                  isActive ? 'text-brand-700' : 'text-slate-700 hover:text-brand-600'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link to="/appointment" className="btn-primary ml-2">
            <CalendarCheck size={18} /> Book Appointment
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded-lg p-2 text-slate-700 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-base font-bold transition ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/appointment"
              onClick={() => setOpen(false)}
              className="btn-primary mt-2 w-full"
            >
              <CalendarCheck size={18} /> Book Appointment
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
