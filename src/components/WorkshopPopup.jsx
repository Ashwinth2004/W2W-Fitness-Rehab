import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, CalendarDays, Clock, IndianRupee, Users, GraduationCap } from 'lucide-react'
import { watchOpenWorkshop, watchWorkshopSeats } from '../lib/firestore'
import { fmtDate } from '../lib/format'

// Promotional popup shown across the site ONLY while a workshop's registration
// is open (admin sets status → "Open" in the dashboard). If none is open, it
// never appears. Shows once per browser session per workshop.
export default function WorkshopPopup() {
  const location = useLocation()
  const [workshop, setWorkshop] = useState(null)
  const [seats, setSeats] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const unsub = watchOpenWorkshop(setWorkshop)
    return () => unsub && unsub()
  }, [])

  useEffect(() => {
    if (!workshop?.id) { setOpen(false); return }
    if (sessionStorage.getItem(`w2w-wpopup-${workshop.id}`)) return
    const t = setTimeout(() => setOpen(true), 1200)
    return () => clearTimeout(t)
  }, [workshop?.id])

  useEffect(() => {
    if (!workshop?.id) return
    const unsub = watchWorkshopSeats(workshop.id, setSeats)
    return () => unsub && unsub()
  }, [workshop?.id])

  // Don't cover the workshop page itself.
  if (!open || !workshop || location.pathname === '/workshop') return null

  const close = () => {
    sessionStorage.setItem(`w2w-wpopup-${workshop.id}`, '1')
    setOpen(false)
  }

  const slots = Number(workshop.slots) || 0
  const remaining = slots ? Math.max(0, slots - seats) : null
  const details = [
    workshop.date && { icon: CalendarDays, label: fmtDate(workshop.date) },
    workshop.time && { icon: Clock, label: workshop.time },
    workshop.fee != null && workshop.fee !== '' && { icon: IndianRupee, label: `₹${workshop.fee} registration fee` },
    slots > 0 && { icon: Users, label: remaining != null ? `Only ${remaining} of ${slots} slots left!` : `${slots} slots only` },
  ].filter(Boolean)

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/60 p-4 no-print backdrop-blur-sm" onClick={close}>
      <div className="relative w-full max-w-md animate-pop-in overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
          <X size={20} />
        </button>

        <div className="bg-brand-950 px-6 py-8 text-center text-white">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
            <GraduationCap size={28} className="text-brand-300" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">W2W Academy · Registrations Open</p>
          <h3 className="mt-1 text-2xl font-bold leading-tight text-white">{workshop.title}</h3>
        </div>

        <div className="p-6">
          {workshop.description && <p className="line-clamp-3 text-sm text-slate-600">{workshop.description}</p>}
          <ul className="mt-4 space-y-2.5">
            {details.map((d, i) => (
              <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><d.icon size={16} /></span>
                {d.label}
              </li>
            ))}
          </ul>
          <Link to="/workshop" onClick={close} className="btn-primary mt-5 w-full">Register now</Link>
          <button onClick={close} className="mt-2 w-full text-center text-xs text-slate-400 hover:text-slate-600">Maybe later</button>
        </div>
      </div>
    </div>
  )
}
