import { useEffect, useState } from 'react'
import { FileDown, Loader2, CalendarRange, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { getAppointmentsInRange, watchClients } from '../../lib/firestore'
import { generateMonthlyReport } from '../../lib/pdf'
import { toDate } from '../../lib/format'

const monthKey = (d) => format(d, 'yyyy-MM')

export default function Reports() {
  const [month, setMonth] = useState(monthKey(new Date()))
  const [clients, setClients] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => watchClients(setClients), [])

  async function download() {
    setBusy(true)
    setMsg('')
    try {
      const [y, m] = month.split('-').map(Number)
      const start = `${month}-01`
      const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
      const appts = await getAppointmentsInRange(start, end)
      const monthClients = clients.filter((c) => {
        const d = toDate(c.createdAt)
        return d && monthKey(d) === month
      })
      if (!appts.length && !monthClients.length) {
        setMsg('No appointments or new clients in this month.')
        setBusy(false)
        return
      }
      await generateMonthlyReport({
        monthLabel: format(new Date(y, m - 1, 1), 'MMMM yyyy'),
        appointments: appts,
        clients: monthClients,
      })
    } catch (e) {
      setMsg('Could not generate the report. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Reports</h1>

      <div className="card max-w-xl p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><CalendarRange size={24} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Monthly Appointments & Clients Report</h2>
            <p className="text-sm text-slate-500">Branded PDF with all appointments and new clients for a month.</p>
          </div>
        </div>

        <div className="mt-6">
          <label className="label">Select Month</label>
          <input className="input max-w-xs" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>

        {msg && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{msg}</p>}

        <button onClick={download} disabled={busy} className="btn-primary mt-6">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} Download PDF Report
        </button>
      </div>

      <div className="card max-w-xl p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><FileText size={24} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Individual Client Reports</h2>
            <p className="text-sm text-slate-500">
              Open any client from the <strong>Clients</strong> page and tap <em>Generate Report</em> for a
              full branded PDF with their details, history, progress and visit notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
