import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, CalendarDays, Users, CalendarClock, ArrowRight, CheckCheck, FileSpreadsheet, Loader2, Check } from 'lucide-react'
import { watchEnquiries, watchAppointments, watchClients, setEnquiryStatus } from '../../lib/firestore'
import { fmt12h, fmtDate, todayISO } from '../../lib/format'
import { downloadExcelBackup } from '../../lib/backupExport'
import { useAuth } from '../../context/AuthContext'
import ContactActions from '../../components/ContactActions'
import StatusBadge from '../../components/StatusBadge'
import AdminPageHeader from '../../components/AdminPageHeader'

export default function Dashboard() {
  const { role } = useAuth()
  const [enquiries, setEnquiries] = useState([])
  const [appointments, setAppointments] = useState([])
  const [clients, setClients] = useState([])

  useEffect(() => {
    const u1 = watchEnquiries(setEnquiries)
    const u2 = watchAppointments(setAppointments)
    const u3 = watchClients(setClients)
    return () => { u1(); u2(); u3() }
  }, [])

  const today = todayISO()
  const newEnquiries = enquiries.filter((e) => e.status === 'new').length
  const todays = useMemo(
    () => appointments.filter((a) => a.date === today && a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  )
  const upcoming = appointments.filter((a) => a.date > today && a.status !== 'cancelled').length

  // "Clear" the Recent Enquiries highlights by marking every new one as read.
  const clearNewEnquiries = () =>
    Promise.all(enquiries.filter((e) => e.status === 'new').map((e) => setEnquiryStatus(e.id, 'read')))

  const stats = [
    { label: 'New Enquiries', value: newEnquiries, icon: Inbox, to: '/admin/queries', color: 'bg-amber-50 text-amber-600' },
    { label: "Today's Appointments", value: todays.length, icon: CalendarDays, to: '/admin/appointments', color: 'bg-brand-50 text-brand-600' },
    { label: 'Upcoming', value: upcoming, icon: CalendarClock, to: '/admin/appointments', color: 'bg-violet-50 text-violet-600' },
    { label: 'Total Clients', value: clients.length, icon: Users, to: '/admin/clients', color: 'bg-emerald-50 text-emerald-600' },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" subtitle={fmtDate(new Date())} />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card flex flex-col items-center justify-center gap-2 p-5 text-center transition hover:shadow-soft md:flex-row md:gap-4 md:text-left">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${s.color}`}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's appointments */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Today’s Schedule</h2>
            <Link to="/admin/appointments" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>
          </div>
          {todays.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No appointments today.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todays.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{a.name}</p>
                    <p className="text-xs text-slate-500">{fmt12h(a.time)} · {a.service}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    <ContactActions phone={a.phone} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent enquiries */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Enquiries</h2>
            <div className="flex items-center gap-3">
              {newEnquiries > 0 && (
                <button onClick={clearNewEnquiries} title="Mark all as read" className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-brand-600">
                  <CheckCheck size={15} /> Clear
                </button>
              )}
              <Link to="/admin/queries" className="text-sm font-medium text-brand-600 hover:underline">Inbox <ArrowRight size={14} className="inline" /></Link>
            </div>
          </div>
          {enquiries.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No enquiries yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {enquiries.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {e.name} {e.status === 'new' && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-500" />}
                    </p>
                    <p className="truncate text-xs text-slate-500">{e.service} · {fmtDate(e.createdAt)}</p>
                  </div>
                  <ContactActions phone={e.phone} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {role === 'full' && <BackupCard />}
    </div>
  )
}

// On-demand full export (Layer 2). Downloads a complete JSON snapshot of the
// database to this device — handy right before a big edit. The automated daily
// backup still runs independently in the background.
function BackupCard() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function run() {
    setBusy(true); setError(''); setResult(null)
    try {
      const r = await downloadExcelBackup()
      setResult(r)
    } catch (e) {
      console.error(e)
      setError('Backup failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Data Backup (Excel)</h2>
            <p className="mt-0.5 max-w-xl text-sm text-slate-500">
              Download a full, well-organised Excel copy of every record — clients, treatments, appointments,
              accounts, workshops — with a separate tab for each. Easy to open and read. Encrypted automatic
              backups also run every day.
            </p>
          </div>
        </div>
        <button onClick={run} disabled={busy} className="btn-primary shrink-0 self-start sm:self-auto">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
          {busy ? 'Preparing…' : 'Download Excel'}
        </button>
      </div>
      {result && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Check size={15} className="shrink-0" />
          Downloaded {result.count} records across {result.sheets} sheets.
          {result.skipped?.length ? ` (Skipped: ${result.skipped.map((s) => s.collection).join(', ')}.)` : ''}
        </p>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
