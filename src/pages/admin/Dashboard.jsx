import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, CalendarDays, Users, CalendarClock, ArrowRight } from 'lucide-react'
import { watchEnquiries, watchAppointments, watchClients } from '../../lib/firestore'
import { fmt12h, fmtDate, todayISO } from '../../lib/format'
import ContactActions from '../../components/ContactActions'
import StatusBadge from '../../components/StatusBadge'

export default function Dashboard() {
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

  const stats = [
    { label: 'New Enquiries', value: newEnquiries, icon: Inbox, to: '/admin/queries', color: 'bg-amber-50 text-amber-600' },
    { label: "Today's Appointments", value: todays.length, icon: CalendarDays, to: '/admin/appointments', color: 'bg-brand-50 text-brand-600' },
    { label: 'Upcoming', value: upcoming, icon: CalendarClock, to: '/admin/appointments', color: 'bg-violet-50 text-violet-600' },
    { label: 'Total Clients', value: clients.length, icon: Users, to: '/admin/clients', color: 'bg-emerald-50 text-emerald-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Dashboard</h1>
        <p className="text-sm text-slate-500">{fmtDate(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card flex items-center gap-4 p-5 transition hover:shadow-soft">
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
            <Link to="/admin/queries" className="text-sm font-medium text-brand-600 hover:underline">Inbox <ArrowRight size={14} className="inline" /></Link>
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
    </div>
  )
}
