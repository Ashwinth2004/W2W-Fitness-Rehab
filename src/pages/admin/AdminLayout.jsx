import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, Inbox, CalendarDays, Users, FileText, Newspaper,
  GraduationCap, LogOut, Menu, X, ExternalLink, Wallet, Stethoscope, Download, Dumbbell,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { UnsavedProvider, useUnsaved } from '../../context/UnsavedContext'
import GlobalDictation from '../../components/GlobalDictation'
import { canAccessPath } from '../../lib/roles'
import { watchEnquiries } from '../../lib/firestore'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/queries', label: 'Enquiries', icon: Inbox },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/admin/clients', label: 'Clients', icon: Users },
  { to: '/admin/treatment', label: 'Treatment', icon: Stethoscope },
  { to: '/admin/rehab', label: 'Rehab & Exercises', icon: Dumbbell },
  // Signatures module hidden for now (client signature not needed currently).
  // Re-enable by restoring this nav item — the route & page still exist.
  // { to: '/admin/signatures', label: 'Signatures', icon: PenLine },
  { to: '/admin/workshops', label: 'W2W Workshop', icon: GraduationCap },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/accounting', label: 'Accounting', icon: Wallet },
  { to: '/admin/content', label: 'Blogs', icon: Newspaper },
]

export default function AdminLayout() {
  return (
    <UnsavedProvider>
      <AdminShell />
    </UnsavedProvider>
  )
}

// "Install app" button — shown only when the browser fires beforeinstallprompt
// (i.e. on the admin pages where the manifest is injected). Hidden once installed
// or when the browser offers no prompt (e.g. iOS uses Share → Add to Home Screen).
function InstallAppButton() {
  const [deferred, setDeferred] = useState(null)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  if (!deferred) return null
  return (
    <button
      onClick={async () => { deferred.prompt(); try { await deferred.userChoice } catch (_) {} setDeferred(null) }}
      className="mb-1 flex w-full items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
    >
      <Download size={18} /> Install app
    </button>
  )
}

function AdminShell() {
  const { logout, user, role } = useAuth()
  const { guard } = useUnsaved()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [newEnq, setNewEnq] = useState(0)
  // Desktop sidebar collapse — an admin preference, remembered per browser.
  // Always starts OPEN unless the admin has explicitly collapsed it before.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('w2w_sidebar_collapsed') === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('w2w_sidebar_collapsed', collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  // Live count of unread enquiries → red "NEW" badge on the Enquiries item.
  useEffect(() => watchEnquiries((list) => setNewEnq(list.filter((e) => e.status === 'new').length)), [])

  // Make the app installable ONLY inside the admin area: the manifest + PWA meta
  // tags exist only while this layout is mounted (a signed-in admin on /admin),
  // so the public site never shows an "Install app" prompt.
  useEffect(() => {
    const specs = [
      ['link', { rel: 'manifest', href: '/manifest.webmanifest' }],
      ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'apple-mobile-web-app-title', content: 'W2W Admin' }],
    ]
    const els = specs.map(([tag, attrs]) => {
      const el = document.createElement(tag)
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
      document.head.appendChild(el)
      return el
    })
    return () => els.forEach((el) => el.remove())
  }, [])

  // Limited admins only see/open the first five modules.
  const visibleNav = nav.filter((n) => canAccessPath(role, n.to))
  useEffect(() => {
    if (!canAccessPath(role, location.pathname)) navigate('/admin', { replace: true })
  }, [role, location.pathname, navigate])

  async function handleLogout() {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  // Navigate via the unsaved-changes guard (prompts if there are unsaved edits).
  const go = (to) => (e) => { e.preventDefault(); setOpen(false); guard(() => navigate(to)) }

  // `mini` renders the icon-only, collapsed layout (desktop only — the mobile
  // drawer always renders full-width regardless of the desktop preference).
  // `showToggle` puts the collapse/expand button in the header — only for the
  // real desktop sidebar, not the mobile drawer (which closes its own way).
  const renderSidebar = (mini, showToggle) => (
    <div className="flex h-full flex-col">
      <div className={mini ? 'flex flex-col items-center gap-2 px-2 py-4' : 'flex items-center justify-between gap-2 px-5 py-5'}>
        <Link to="/admin" onClick={go('/admin')} className={mini ? '' : 'flex min-w-0 items-center gap-3'}>
          <img src="/w2w-fitness-rehab-logo.webp" alt="W2W Fitness & Rehab logo" className="h-11 w-11 shrink-0 rounded-full bg-white object-contain" />
          {!mini && (
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display font-bold text-white">W2W Admin</p>
              <p className="truncate text-[11px] text-brand-300">Fitness &amp; Rehab</p>
            </div>
          )}
        </Link>
        {showToggle && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={mini ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={mini ? 'Expand sidebar' : 'Collapse sidebar'}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            {mini ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {visibleNav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={go(n.to)}
            title={mini ? n.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${mini ? 'justify-center px-0' : ''} ${
                isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <n.icon size={19} />
            {!mini && <span className="flex-1">{n.label}</span>}
            {!mini && n.to === '/admin/queries' && newEnq > 0 && (
              <span className="grid h-5 min-w-[2.25rem] place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {newEnq} New
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        {!mini && <InstallAppButton />}
        {!mini && (
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-brand-100 hover:bg-white/10 hover:text-white">
            <ExternalLink size={18} /> View Website
          </a>
        )}
        <button
          onClick={() => guard(handleLogout)}
          title={mini ? 'Sign Out' : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-brand-100 hover:bg-white/10 hover:text-white ${mini ? 'justify-center px-0' : ''}`}
        >
          <LogOut size={18} /> {!mini && 'Sign Out'}
        </button>
        {!mini && <p className="truncate px-4 pt-2 text-[11px] text-brand-400">{user?.email}</p>}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar — fixed in place while the content scrolls. Width
          (and what renders inside) responds to the collapsed preference. */}
      <aside className={`hidden shrink-0 bg-brand-950 transition-[width] duration-200 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        {renderSidebar(collapsed, true)}
      </aside>

      {/* Mobile drawer — always full-width, independent of the desktop preference */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-brand-950 lg:hidden">{renderSidebar(false, false)}</aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-700" aria-label="Open menu">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/w2w-fitness-rehab-logo.webp" alt="W2W Fitness & Rehab logo" className="h-9 w-9 rounded-full object-contain" />
            <span className="font-bold text-brand-700">W2W Admin</span>
          </div>
          <button onClick={() => guard(handleLogout)} className="rounded-lg p-2 text-slate-500" aria-label="Sign out">
            <LogOut size={22} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Free voice-to-text mic — Treatment module only. */}
      {location.pathname.startsWith('/admin/treatment') && <GlobalDictation />}
    </div>
  )
}
