import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Inbox, CalendarDays, Users, FileText, Newspaper,
  GraduationCap, LogOut, Menu, X, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { watchEnquiries } from '../../lib/firestore'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/queries', label: 'Enquiries', icon: Inbox },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/admin/clients', label: 'Clients', icon: Users },
  { to: '/admin/workshops', label: 'W2W Workshop', icon: GraduationCap },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/content', label: 'Blogs', icon: Newspaper },
]

export default function AdminLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [newEnq, setNewEnq] = useState(0)

  // Live count of unread enquiries → red "NEW" badge on the Enquiries item.
  useEffect(() => watchEnquiries((list) => setNewEnq(list.filter((e) => e.status === 'new').length)), [])

  async function handleLogout() {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-3 px-5 py-5" onClick={() => setOpen(false)}>
        <img src="/logo.jpg" alt="W2W" className="h-11 w-11 rounded-full bg-white object-contain" />
        <div className="leading-tight">
          <p className="font-display font-bold text-white">W2W Admin</p>
          <p className="text-[11px] text-brand-300">Fitness &amp; Rehab</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <n.icon size={19} />
            <span className="flex-1">{n.label}</span>
            {n.to === '/admin/queries' && newEnq > 0 && (
              <span className="grid h-5 min-w-[2.25rem] place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {newEnq} New
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-brand-100 hover:bg-white/10 hover:text-white">
          <ExternalLink size={18} /> View Website
        </a>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-brand-100 hover:bg-white/10 hover:text-white">
          <LogOut size={18} /> Sign Out
        </button>
        <p className="truncate px-4 pt-2 text-[11px] text-brand-400">{user?.email}</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-brand-950 lg:block">{SidebarContent}</aside>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-brand-950 lg:hidden">{SidebarContent}</aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-700" aria-label="Open menu">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="W2W" className="h-9 w-9 rounded-full object-contain" />
            <span className="font-bold text-brand-700">W2W Admin</span>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-slate-500" aria-label="Sign out">
            <LogOut size={22} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
