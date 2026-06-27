import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, CalendarDays, GraduationCap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { watchAppointments, watchWorkshopRegistrations } from '../lib/firestore'
import { fmtDate, fmt12h } from '../lib/format'

const tsMs = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : (t?.seconds ? t.seconds * 1000 : 0))

// Top-right notification bell: turns red with a count when new appointments or
// workshop registrations arrive. Click → list of the new ones + "Mark as read",
// which returns it to normal. "Read" point is remembered across reloads/devices
// would need a server flag; here it's per-browser via localStorage.
export default function NotificationBell() {
  const { role } = useAuth()
  const [appts, setAppts] = useState([])
  const [regs, setRegs] = useState([])
  const [readTs, setReadTs] = useState(() => Number(localStorage.getItem('w2w_notif_read_ts') || 0))
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // First ever use: baseline to "now" so existing records aren't all flagged new.
  useEffect(() => {
    if (!localStorage.getItem('w2w_notif_read_ts')) {
      const now = Date.now()
      localStorage.setItem('w2w_notif_read_ts', String(now))
      setReadTs(now)
    }
  }, [])

  useEffect(() => watchAppointments(setAppts), [])
  useEffect(() => {
    if (role !== 'full') return undefined // limited admins can't read workshop regs
    return watchWorkshopRegistrations(setRegs)
  }, [role])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const newAppts = appts.filter((a) => tsMs(a.createdAt) > readTs).sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt))
  const newRegs = regs.filter((r) => tsMs(r.createdAt) > readTs).sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt))
  const unread = newAppts.length + newRegs.length

  function markRead() {
    const now = Date.now()
    localStorage.setItem('w2w_notif_read_ts', String(now))
    setReadTs(now)
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={`relative grid h-10 w-10 place-items-center rounded-full ring-1 transition ${unread > 0 ? 'bg-red-50 text-red-600 ring-red-200' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'}`}
      >
        <Bell size={20} className={unread > 0 ? 'fill-red-100' : ''} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-bold text-slate-800">Notifications</p>
            {unread > 0 && (
              <button onClick={markRead} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"><Check size={13} /> Mark as read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {unread === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">No new notifications.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {newAppts.map((a) => (
                  <li key={`a-${a.id}`}>
                    <Link to="/admin/appointments" onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><CalendarDays size={16} /></span>
                      <span className="min-w-0 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">New appointment</span> — {a.name}
                        <span className="block text-xs text-slate-400">{fmtDate(a.date)} · {a.time ? fmt12h(a.time) : ''}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {newRegs.map((r) => (
                  <li key={`r-${r.id}`}>
                    <Link to="/admin/workshops" onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"><GraduationCap size={16} /></span>
                      <span className="min-w-0 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">New workshop registration</span> — {r.fullName}
                        <span className="block truncate text-xs text-slate-400">{r.workshopTitle}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
