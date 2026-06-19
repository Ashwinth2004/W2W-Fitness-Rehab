import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Plus, Trash2, X, Save } from 'lucide-react'
import {
  watchAccounting, addAccountingEntry, deleteAccountingEntry,
  watchExpenses, addExpense, deleteExpense,
} from '../../lib/firestore'
import { fmtDate, todayISO, matchesDateFilter } from '../../lib/format'
import { onlyDigits } from '../../lib/validate'
import DateField from '../../components/DateField'
import AdminFilter from '../../components/AdminFilter'

const inr = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN')
const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']
const EXPENSE_PRESETS = ['Salary', 'Rent', 'Electricity (EB)', 'Water bill', 'Internet', 'Equipment', 'Supplies', 'Marketing', 'Maintenance', 'Other']
const money = (set) => (e) => set(onlyDigits(e.target.value).slice(0, 8))

export default function Accounting() {
  const [tab, setTab] = useState('income')
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">Accounting</h1>
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'income', label: 'Patient Charges', icon: TrendingUp },
          { id: 'expenses', label: 'Expenses', icon: TrendingDown },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'income' ? <Income /> : <Expenses />}
    </div>
  )
}

function Stat({ label, value, tone = 'slate' }) {
  const tones = { brand: 'text-brand-700', emerald: 'text-emerald-600', red: 'text-red-600', slate: 'text-slate-800' }
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  )
}

// --- Patient charges (income) ----------------------------------------------
function Income() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState({ day: '', month: '' })
  const [open, setOpen] = useState(false)

  useEffect(() => watchAccounting(setRows), [])

  const list = rows.filter((r) => matchesDateFilter(r.date, filter))
  const charged = list.reduce((s, r) => s + Number(r.amount || 0), 0)
  const paid = list.reduce((s, r) => s + Number(r.paid || 0), 0)
  const due = list.reduce((s, r) => s + Number(r.balance || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Entries" value={list.length} />
        <Stat label="Total charged" value={inr(charged)} tone="brand" />
        <Stat label="Total received" value={inr(paid)} tone="emerald" />
        <Stat label="Balance due" value={inr(due)} tone={due > 0 ? 'red' : 'emerald'} />
      </div>

      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <AdminFilter filter={filter} setFilter={setFilter} />
        <button onClick={() => setOpen((v) => !v)} className="btn-ghost px-3 py-1.5 text-sm">{open ? <X size={16} /> : <Plus size={16} />} {open ? 'Close' : 'Add charge'}</button>
      </div>

      {open && <IncomeForm onDone={() => setOpen(false)} />}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Date</th><th>Client</th><th>Service</th><th>Therapist</th>
              <th className="text-right">Charged</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Mode</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No charges recorded for this period.</td></tr>
            ) : list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5 text-slate-600">{fmtDate(r.date)}</td>
                <td className="font-medium text-slate-800">{r.clientName}{r.clientId ? <span className="block text-xs text-slate-400">{r.clientId}</span> : null}</td>
                <td className="text-slate-600">{r.service || '—'}</td>
                <td className="text-slate-600">{r.therapist || '—'}</td>
                <td className="text-right text-slate-700">{inr(r.amount)}</td>
                <td className="text-right text-emerald-600">{inr(r.paid)}</td>
                <td className={`text-right ${Number(r.balance) > 0 ? 'text-red-600' : 'text-slate-400'}`}>{inr(r.balance)}</td>
                <td className="text-slate-600">{r.mode || '—'}</td>
                <td className="px-2 text-right"><button onClick={() => window.confirm('Delete this charge?') && deleteAccountingEntry(r.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IncomeForm({ onDone }) {
  const [f, setF] = useState({ date: todayISO(), clientName: '', service: '', therapist: '', amount: '', paid: '', mode: 'Cash' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const balance = Math.max(0, (Number(f.amount) || 0) - (Number(f.paid) || 0))

  async function save(e) {
    e.preventDefault()
    if (!f.clientName.trim()) return
    await addAccountingEntry({
      date: f.date || todayISO(), clientId: '', clientName: f.clientName.trim(), service: f.service.trim(),
      therapist: f.therapist.trim(), amount: Number(f.amount) || 0, paid: Number(f.paid) || 0, balance, mode: f.mode,
    })
    onDone()
  }

  return (
    <form onSubmit={save} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <div><label className="label text-xs">Date</label><DateField value={f.date} onChange={(iso) => setF((s) => ({ ...s, date: iso }))} max={todayISO()} /></div>
      <div><label className="label text-xs">Client name *</label><input className="input" value={f.clientName} onChange={set('clientName')} /></div>
      <div><label className="label text-xs">Service</label><input className="input" value={f.service} onChange={set('service')} placeholder="Physiotherapy" /></div>
      <div><label className="label text-xs">Therapist</label><input className="input" value={f.therapist} onChange={set('therapist')} /></div>
      <div><label className="label text-xs">Amount charged (Rs.)</label><input className="input" inputMode="numeric" value={f.amount} onChange={money((v) => setF((s) => ({ ...s, amount: v })))} placeholder="0" /></div>
      <div><label className="label text-xs">Amount paid (Rs.)</label><input className="input" inputMode="numeric" value={f.paid} onChange={money((v) => setF((s) => ({ ...s, paid: v })))} placeholder="0" /></div>
      <div><label className="label text-xs">Mode</label><select className="input" value={f.mode} onChange={set('mode')}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
      <div className="flex items-end"><button className="btn-primary w-full"><Save size={16} /> Save (Due {inr(balance)})</button></div>
    </form>
  )
}

// --- Expenses ---------------------------------------------------------------
function Expenses() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState({ day: '', month: '' })
  const [f, setF] = useState({ date: todayISO(), name: '', amount: '', note: '' })

  useEffect(() => watchExpenses(setRows), [])

  const list = rows.filter((r) => matchesDateFilter(r.date, filter))
  const total = list.reduce((s, r) => s + Number(r.amount || 0), 0)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    if (!f.name.trim() || !f.amount) return
    await addExpense({ date: f.date || todayISO(), name: f.name.trim(), amount: Number(f.amount) || 0, note: f.note.trim() })
    setF({ date: todayISO(), name: '', amount: '', note: '' })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Entries" value={list.length} />
        <Stat label="Total expenses" value={inr(total)} tone="red" />
        <Stat label="Period" value={filter.day ? fmtDate(filter.day) : filter.month || 'All time'} />
      </div>

      <form onSubmit={save} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div><label className="label text-xs">Date</label><DateField value={f.date} onChange={(iso) => setF((s) => ({ ...s, date: iso }))} max={todayISO()} /></div>
        <div>
          <label className="label text-xs">Expense name *</label>
          <input className="input" list="expense-presets" value={f.name} onChange={set('name')} placeholder="Salary, Rent, EB…" />
          <datalist id="expense-presets">{EXPENSE_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div><label className="label text-xs">Amount (Rs.) *</label><input className="input" inputMode="numeric" value={f.amount} onChange={money((v) => setF((s) => ({ ...s, amount: v })))} placeholder="0" /></div>
        <div><label className="label text-xs">Note</label><input className="input" value={f.note} onChange={set('note')} placeholder="Optional" /></div>
        <div className="flex items-end"><button className="btn-primary w-full"><Plus size={16} /> Add expense</button></div>
      </form>

      <div className="card p-4"><AdminFilter filter={filter} setFilter={setFilter} /></div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-3">Date</th><th>Expense</th><th>Note</th><th className="text-right">Amount</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No expenses for this period.</td></tr>
            ) : list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5 text-slate-600">{fmtDate(r.date)}</td>
                <td className="font-medium text-slate-800">{r.name}</td>
                <td className="text-slate-500">{r.note || '—'}</td>
                <td className="text-right font-medium text-red-600">{inr(r.amount)}</td>
                <td className="px-2 text-right"><button onClick={() => window.confirm('Delete this expense?') && deleteExpense(r.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
