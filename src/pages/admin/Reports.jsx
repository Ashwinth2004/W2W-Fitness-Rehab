import { useEffect, useState } from 'react'
import { FileDown, Loader2, CalendarRange, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import {
  getAppointmentsInRange, watchClients, getAccountingInRange, getExpensesInRange,
} from '../../lib/firestore'
import { generateMonthlyReport, generateIncomeReport, generateExpensesReport } from '../../lib/pdf'
import { fmtDate, isoOf, todayISO } from '../../lib/format'
import DateField from '../../components/DateField'
import AdminPageHeader from '../../components/AdminPageHeader'

const monthKey = (d) => format(d, 'yyyy-MM')
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad2 = (n) => String(n).padStart(2, '0')
const CUR_YEAR = new Date().getFullYear()
// Current year back 8 years — easy access to previous years for historical reports.
const YEARS = Array.from({ length: 9 }, (_, i) => String(CUR_YEAR - i))

export default function Reports() {
  const [mode, setMode] = useState('month') // month | range | day
  const [month, setMonth] = useState(monthKey(new Date()))
  const [from, setFrom] = useState(todayISO())
  const [to, setTo] = useState(todayISO())
  const [day, setDay] = useState(todayISO())
  const [clients, setClients] = useState([])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => watchClients(setClients), [])

  function getRange() {
    if (mode === 'month') {
      const [y, m] = month.split('-').map(Number)
      return {
        start: `${month}-01`,
        end: `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`,
        label: format(new Date(y, m - 1, 1), 'MMMM yyyy'),
      }
    }
    if (mode === 'day') return { start: day, end: day, label: fmtDate(day) }
    const lo = from <= to ? from : to
    const hi = from <= to ? to : from
    return { start: lo, end: hi, label: `${fmtDate(lo)} – ${fmtDate(hi)}` }
  }

  async function run(id, fn) {
    setBusy(id); setMsg('')
    try {
      const empty = await fn(getRange())
      if (empty) setMsg(empty)
    } catch (e) {
      console.error(e); setMsg('Could not generate the report. Please try again.')
    } finally {
      setBusy('')
    }
  }

  const appointmentsReport = async ({ start, end, label }) => {
    const appts = await getAppointmentsInRange(start, end)
    const inRange = clients.filter((c) => { const iso = isoOf(c.createdAt); return iso && iso >= start && iso <= end })
    if (!appts.length && !inRange.length) return 'No appointments or new clients in this period.'
    await generateMonthlyReport({ rangeLabel: label, appointments: appts, clients: inRange })
  }
  const incomeReport = async ({ start, end, label }) => {
    const entries = await getAccountingInRange(start, end)
    if (!entries.length) return 'No patient charges recorded in this period.'
    await generateIncomeReport({ rangeLabel: label, entries })
  }
  const expensesReport = async ({ start, end, label }) => {
    const expenses = await getExpensesInRange(start, end)
    if (!expenses.length) return 'No expenses recorded in this period.'
    await generateExpensesReport({ rangeLabel: label, expenses })
  }

  const { label } = getRange()

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Reports" />

      {/* Period selector */}
      <div className="card max-w-2xl space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><CalendarRange size={22} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Report period</h2>
            <p className="text-sm text-slate-500">Choose a month, a date range, or a single day.</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:justify-start">
          {[['month', 'Month'], ['range', 'Date range'], ['day', 'Single date']].map(([id, lbl]) => (
            <button key={id} onClick={() => setMode(id)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${mode === id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{lbl}</button>
          ))}
        </div>

        {mode === 'month' && (() => {
          const [my, mm] = month.split('-')
          return (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Month</label>
                <select className="input h-[42px] w-40" value={mm} onChange={(e) => setMonth(`${my}-${e.target.value}`)}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={pad2(i + 1)}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input h-[42px] w-32" value={my} onChange={(e) => setMonth(`${e.target.value}-${mm}`)}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )
        })()}
        {mode === 'range' && (
          <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
            <div><label className="label">From</label><DateField value={from} onChange={setFrom} max={todayISO()} /></div>
            <div><label className="label">To</label><DateField value={to} onChange={setTo} max={todayISO()} /></div>
          </div>
        )}
        {mode === 'day' && (
          <div className="max-w-xs"><label className="label">Date</label><DateField value={day} onChange={setDay} max={todayISO()} /></div>
        )}

        <p className="text-sm text-slate-500">Selected period: <strong className="text-slate-700">{label}</strong></p>
        {msg && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{msg}</p>}
      </div>

      {/* Report cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ReportCard
          icon={CalendarRange} tone="brand"
          title="Appointments & New Clients"
          desc="All appointments and newly-registered clients for the selected period."
          busy={busy === 'appts'} onClick={() => run('appts', appointmentsReport)}
        />
        <ReportCard
          icon={TrendingUp} tone="emerald"
          title="Patient Charges (Income)"
          desc="Charges billed to patients — charged, received and balance due, with totals."
          busy={busy === 'income'} onClick={() => run('income', incomeReport)}
        />
        <ReportCard
          icon={TrendingDown} tone="red"
          title="Expenses"
          desc="All recorded expenses (salary, rent, EB…) for the selected period, with the total."
          busy={busy === 'expenses'} onClick={() => run('expenses', expensesReport)}
        />
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-600"><FileText size={24} /></div>
            <div>
              <h2 className="font-bold text-slate-900">Individual Client Report</h2>
              <p className="text-sm text-slate-500">
                Open any client from the <strong>Clients</strong> page and tap <em>Generate Report</em> for a full
                branded assessment PDF with billing, and a Download or Send option.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
}

function ReportCard({ icon: Icon, tone, title, desc, busy, onClick }) {
  return (
    <div className="card flex flex-col p-6">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${TONES[tone]}`}><Icon size={24} /></div>
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      <p className="mt-3 flex-1 text-sm text-slate-500">{desc}</p>
      <button onClick={onClick} disabled={busy} className="btn-primary mt-5 self-start">
        {busy ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} Download PDF
      </button>
    </div>
  )
}
