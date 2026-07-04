import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Plus, Trash2, X, Save, Pencil, PieChart as PieIcon } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  watchAccounting, addAccountingEntry, updateAccountingEntry, deleteAccountingEntry,
  watchExpenses, addExpense, updateExpense, deleteExpense, watchClients,
  watchExpenseCategories, addExpenseCategory, getExpenseCategoriesOnce,
  watchServiceCharges, getServiceChargesOnce, addServiceCharge,
} from '../../lib/firestore'
import { fmtDate, todayISO, matchesDateFilter } from '../../lib/format'
import { onlyDigits } from '../../lib/validate'
import { PRESET_SERVICE_CHARGES } from '../../lib/constants'
import DateField from '../../components/DateField'
import AdminFilter from '../../components/AdminFilter'
import AdminPageHeader from '../../components/AdminPageHeader'
import TherapistSelect from '../../components/TherapistSelect'
import ExpenseSelect from '../../components/ExpenseSelect'
import ServiceSelect from '../../components/ServiceSelect'
import { useUnsaved } from '../../context/UnsavedContext'

// A charge/expense counts as "cash" only when its mode is Cash; everything else
// (UPI, Card, Bank transfer, a named bank account…) counts as "bank".
const isCash = (mode) => (mode || '').toLowerCase() === 'cash'
const CHART_COLORS = ['#0e8ba1', '#f59e0b', '#6366f1', '#ec4899', '#10b981', '#f43f5e', '#8b5cf6', '#14b8a6', '#eab308', '#64748b']
const YYYYMM = (d) => String(d || '').slice(0, 7)
const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  return m ? `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m)]} ${String(y).slice(2)}` : ym
}

const inr = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN')
const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']
const EXPENSE_PRESETS = ['Salary', 'Rent', 'Electricity (EB)', 'Water bill', 'Internet', 'Equipment', 'Supplies', 'Marketing', 'Maintenance']
const money = (set) => (e) => set(onlyDigits(e.target.value).slice(0, 8))
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const periodLabel = (f) => {
  if (f.day) return fmtDate(f.day)
  const mn = f.month ? MONTH_NAMES[Number(f.month) - 1] : ''
  if (mn && f.year) return `${mn} ${f.year}`
  return mn || f.year || 'All time'
}

export default function Accounting() {
  const [tab, setTab] = useState('overview')
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Accounting" />
      <div className="flex flex-wrap justify-center gap-2 md:justify-start">
        {[
          { id: 'overview', label: 'Overview', icon: PieIcon },
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
      {tab === 'overview' ? <Overview /> : tab === 'income' ? <Income /> : <Expenses />}
    </div>
  )
}

// --- Overview: profit split (cash / bank) + charts -------------------------
function Overview() {
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [filter, setFilter] = useState({ day: '', month: '' })

  useEffect(() => watchAccounting(setIncome), [])
  useEffect(() => watchExpenses(setExpenses), [])

  const inRange = (r) => matchesDateFilter(r.date, filter)
  const inc = income.filter(inRange)
  const exp = expenses.filter(inRange)

  const received = inc.reduce((s, r) => s + Number(r.paid || 0), 0)
  const charged = inc.reduce((s, r) => s + Number(r.amount || 0), 0)
  const spent = exp.reduce((s, r) => s + Number(r.amount || 0), 0)
  const cashIn = inc.filter((r) => isCash(r.mode)).reduce((s, r) => s + Number(r.paid || 0), 0)
  const bankIn = received - cashIn
  const cashOut = exp.filter((r) => isCash(r.mode)).reduce((s, r) => s + Number(r.amount || 0), 0)
  const bankOut = spent - cashOut
  const cashProfit = cashIn - cashOut
  const bankProfit = bankIn - bankOut
  const netProfit = received - spent

  // Pie: expenses by category for the period.
  const expenseByCat = useMemo(() => {
    const m = {}
    exp.forEach((r) => { const k = r.name || 'Other'; m[k] = (m[k] || 0) + Number(r.amount || 0) })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [exp])

  // Bar: last 12 months — Received vs Expenses vs Profit (ignores the day/month filter).
  const monthly = useMemo(() => {
    const m = {}
    income.forEach((r) => { const k = YYYYMM(r.date); if (!k) return; (m[k] ||= { received: 0, expenses: 0 }).received += Number(r.paid || 0) })
    expenses.forEach((r) => { const k = YYYYMM(r.date); if (!k) return; (m[k] ||= { received: 0, expenses: 0 }).expenses += Number(r.amount || 0) })
    return Object.keys(m).sort().slice(-12).map((k) => ({ month: monthLabel(k), Received: m[k].received, Expenses: m[k].expenses, Profit: m[k].received - m[k].expenses }))
  }, [income, expenses])

  return (
    <div className="space-y-4">
      <div className="card p-4"><AdminFilter filter={filter} setFilter={setFilter} /></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Received" value={inr(received)} tone="emerald" />
        <Stat label="Expenses" value={inr(spent)} tone="red" />
        <Stat label="Net profit" value={inr(netProfit)} tone={netProfit >= 0 ? 'emerald' : 'red'} />
        <Stat label="Charged (billed)" value={inr(charged)} tone="brand" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Cash profit" value={inr(cashProfit)} tone={cashProfit >= 0 ? 'emerald' : 'red'} />
        <Stat label="Bank profit" value={inr(bankProfit)} tone={bankProfit >= 0 ? 'emerald' : 'red'} />
        <Stat label="Cash — in / out" value={`${inr(cashIn)} / ${inr(cashOut)}`} />
        <Stat label="Bank — in / out" value={`${inr(bankIn)} / ${inr(bankOut)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie — expenses by category (period) */}
        <div className="card p-5">
          <h3 className="mb-2 font-bold text-slate-900">Expenses by category</h3>
          {expenseByCat.length === 0 ? (
            <p className="grid h-64 place-items-center text-sm text-slate-400">No expenses in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expenseByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={(e) => e.name}>
                  {expenseByCat.map((e, i) => <Cell key={e.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar — month-to-month received / expenses / profit */}
        <div className="card p-5">
          <h3 className="mb-2 font-bold text-slate-900">Month-to-month (last 12 months)</h3>
          {monthly.length === 0 ? (
            <p className="grid h-64 place-items-center text-sm text-slate-400">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} width={48} />
                <Tooltip formatter={(v) => inr(v)} />
                <Legend />
                <Bar dataKey="Received" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Profit" fill="#0e8ba1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
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
  const [clients, setClients] = useState([])
  const [filter, setFilter] = useState({ day: '', month: '' })
  const [open, setOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [services, setServices] = useState([])

  useEffect(() => watchAccounting(setRows), [])
  useEffect(() => watchClients(setClients), [])
  useEffect(() => watchServiceCharges(setServices), [])

  // Seed the default service charges once (best-effort; presets still show as a
  // fallback in the dropdown even before this succeeds).
  useEffect(() => {
    if (localStorage.getItem('w2w_servicecharge_seeded') === '1') return
    ;(async () => {
      try {
        const existing = await getServiceChargesOnce()
        const have = new Set(existing.map((c) => (c.name || '').toLowerCase()))
        await Promise.all(PRESET_SERVICE_CHARGES.filter((p) => !have.has(p.name.toLowerCase())).map((p) => addServiceCharge(p.name, p.amount)))
        localStorage.setItem('w2w_servicecharge_seeded', '1')
      } catch { /* ignore — presets still show as fallback */ }
    })()
  }, [])

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

      <div className="card flex flex-wrap items-end justify-center gap-3 p-4 md:justify-between">
        <AdminFilter filter={filter} setFilter={setFilter} />
        <button onClick={() => { setEditRow(null); setOpen((v) => !v) }} className="btn-ghost px-3 py-1.5 text-sm">{open ? <X size={16} /> : <Plus size={16} />} {open ? 'Close' : 'Add charge'}</button>
      </div>

      {(open || editRow) && <IncomeForm clients={clients} services={services} editing={editRow} onDone={() => { setOpen(false); setEditRow(null) }} />}

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
                <td className="px-2 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditRow(r); setOpen(false) }} title="Edit" className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={15} /></button>
                    <button onClick={() => window.confirm('Delete this charge?') && deleteAccountingEntry(r.id)} title="Delete" className="grid h-7 w-7 place-items-center rounded text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IncomeForm({ clients, services, editing, onDone }) {
  const [f, setF] = useState(() => editing
    ? { date: editing.date || todayISO(), clientName: editing.clientName || '', clientId: editing.clientId || '', service: editing.service || '', therapist: editing.therapist || '', amount: String(editing.amount ?? ''), paid: String(editing.paid ?? ''), mode: editing.mode || 'Cash' }
    : { date: todayISO(), clientName: '', clientId: '', service: '', therapist: '', amount: '', paid: '', mode: 'Cash' })
  const [active, setActive] = useState(0)
  const { setDirty } = useUnsaved()
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDirty(true) }
  const balance = Math.max(0, (Number(f.amount) || 0) - (Number(f.paid) || 0))
  useEffect(() => () => setDirty(false), [setDirty])

  const matches = f.clientName && !f.clientId
    ? clients.filter((c) => [c.name, c.phone, c.clientId].filter(Boolean).join(' ').toLowerCase().includes(f.clientName.toLowerCase())).slice(0, 6)
    : []

  function pickClient(c) {
    setF((s) => ({ ...s, clientName: c.name, clientId: c.clientId || '', service: c.service || s.service, therapist: c.therapist || s.therapist }))
    setDirty(true)
  }
  function clientKey(e) {
    if (!matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(matches.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[active]) pickClient(matches[active]) }
  }

  async function save(e) {
    e.preventDefault()
    if (!f.clientName.trim()) return
    const data = {
      date: f.date || todayISO(), clientId: f.clientId || '', clientName: f.clientName.trim(), service: f.service.trim(),
      therapist: f.therapist.trim(), amount: Number(f.amount) || 0, paid: Number(f.paid) || 0, balance, mode: f.mode,
    }
    if (editing) await updateAccountingEntry(editing.id, data)
    else await addAccountingEntry(data)
    setDirty(false)
    onDone()
  }

  return (
    <form onSubmit={save} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <div><label className="label text-xs">Date</label><DateField value={f.date} onChange={(iso) => { setF((s) => ({ ...s, date: iso })); setDirty(true) }} max={todayISO()} /></div>

      <div className="relative">
        <label className="label text-xs">Client (search name / number) *</label>
        <input
          className="input"
          value={f.clientName}
          onChange={(e) => { setF((s) => ({ ...s, clientName: e.target.value, clientId: '' })); setActive(0); setDirty(true) }}
          onKeyDown={clientKey}
          placeholder="Search or type a name…"
        />
        {f.clientId && <p className="mt-0.5 text-[11px] text-brand-600">Linked to {f.clientId}</p>}
        {matches.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {matches.map((c, i) => (
              <li key={c.id}>
                <button type="button" onClick={() => pickClient(c)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50 ${active === i ? 'bg-brand-50' : ''}`}>
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.clientId} · {c.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="label text-xs">Service</label>
        <ServiceSelect
          value={f.service}
          services={services}
          onChange={(name, amount) => { setF((s) => ({ ...s, service: name, ...(amount != null ? { amount: String(amount) } : {}) })); setDirty(true) }}
        />
      </div>

      <div>
        <label className="label text-xs">Therapist</label>
        <TherapistSelect value={f.therapist} onChange={(v) => { setF((s) => ({ ...s, therapist: v })); setDirty(true) }} />
      </div>

      <div><label className="label text-xs">Amount charged (Rs.)</label><input className="input" inputMode="numeric" value={f.amount} onChange={money((v) => { setF((s) => ({ ...s, amount: v })); setDirty(true) })} placeholder="0" /></div>
      <div><label className="label text-xs">Amount paid (Rs.)</label><input className="input" inputMode="numeric" value={f.paid} onChange={money((v) => { setF((s) => ({ ...s, paid: v })); setDirty(true) })} placeholder="0" /></div>
      <div><label className="label text-xs">Mode</label><select className="input" value={f.mode} onChange={set('mode')}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
      <div className="flex items-end gap-2">
        <button className="btn-primary w-full"><Save size={16} /> {editing ? 'Update' : 'Save'} (Due {inr(balance)})</button>
        {editing && <button type="button" onClick={onDone} className="btn-ghost shrink-0">Cancel</button>}
      </div>
    </form>
  )
}

// --- Expenses ---------------------------------------------------------------
function Expenses() {
  const [rows, setRows] = useState([])
  const [cats, setCats] = useState([])
  const [filter, setFilter] = useState({ day: '', month: '' })
  const [f, setF] = useState({ date: todayISO(), name: '', amount: '', note: '', mode: 'Cash' })
  const [editId, setEditId] = useState(null)
  const { setDirty } = useUnsaved()

  useEffect(() => watchExpenses(setRows), [])
  useEffect(() => watchExpenseCategories(setCats), [])
  useEffect(() => () => setDirty(false), [setDirty])

  // One-time: move the built-in preset titles into the DB so every title in the
  // dropdown can be renamed/deleted. Runs once per browser; only adds presets
  // that don't already exist.
  useEffect(() => {
    if (localStorage.getItem('w2w_expcat_seeded') === '1') return
    ;(async () => {
      try {
        const existing = await getExpenseCategoriesOnce()
        const have = new Set(existing.map((c) => (c.name || '').toLowerCase()))
        await Promise.all(EXPENSE_PRESETS.filter((p) => !have.has(p.toLowerCase())).map((p) => addExpenseCategory(p)))
        localStorage.setItem('w2w_expcat_seeded', '1')
      } catch { /* ignore — presets just won't be pre-seeded */ }
    })()
  }, [])

  const list = rows.filter((r) => matchesDateFilter(r.date, filter))
  const total = list.reduce((s, r) => s + Number(r.amount || 0), 0)
  const cashTotal = list.filter((r) => isCash(r.mode)).reduce((s, r) => s + Number(r.amount || 0), 0)
  const bankTotal = total - cashTotal

  function reset() { setF({ date: todayISO(), name: '', amount: '', note: '', mode: 'Cash' }); setEditId(null); setDirty(false) }
  function startEdit(r) { setF({ date: r.date || todayISO(), name: r.name || '', amount: String(r.amount ?? ''), note: r.note || '', mode: r.mode || 'Cash' }); setEditId(r.id) }

  async function save(e) {
    e.preventDefault()
    if (!f.name.trim() || !f.amount) return
    const data = {
      date: f.date || todayISO(), name: f.name.trim(), amount: Number(f.amount) || 0, note: f.note.trim(), mode: f.mode,
    }
    if (editId) await updateExpense(editId, data)
    else await addExpense(data)
    reset()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total expenses" value={inr(total)} tone="red" />
        <Stat label="Cash" value={inr(cashTotal)} />
        <Stat label="Bank" value={inr(bankTotal)} />
        <Stat label="Period" value={periodLabel(filter)} />
      </div>

      <form onSubmit={save} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className="label text-xs">Date</label><DateField value={f.date} onChange={(iso) => { setF((s) => ({ ...s, date: iso })); setDirty(true) }} max={todayISO()} /></div>
        <div>
          <label className="label text-xs">Expense name *</label>
          <ExpenseSelect value={f.name} categories={cats} onChange={(name) => { setF((s) => ({ ...s, name })); setDirty(true) }} />
        </div>
        <div><label className="label text-xs">Amount (Rs.) *</label><input className="input" inputMode="numeric" value={f.amount} onChange={money((v) => { setF((s) => ({ ...s, amount: v })); setDirty(true) })} placeholder="0" /></div>
        <div><label className="label text-xs">Paid via</label><select className="input" value={f.mode} onChange={(e) => { setF((s) => ({ ...s, mode: e.target.value })); setDirty(true) }}><option>Cash</option><option>Bank</option></select></div>
        <div><label className="label text-xs">Note</label><input className="input" value={f.note} onChange={(e) => { setF((s) => ({ ...s, note: e.target.value })); setDirty(true) }} placeholder="Optional" /></div>
        <div className="flex items-end gap-2">
          <button className="btn-primary w-full">{editId ? <Save size={16} /> : <Plus size={16} />} {editId ? 'Save changes' : 'Add expense'}</button>
          {editId && <button type="button" onClick={reset} className="btn-ghost shrink-0">Cancel</button>}
        </div>
      </form>

      <div className="card p-4"><AdminFilter filter={filter} setFilter={setFilter} /></div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-3">Date</th><th>Expense</th><th>Paid via</th><th>Note</th><th className="text-right">Amount</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No expenses for this period.</td></tr>
            ) : list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5 text-slate-600">{fmtDate(r.date)}</td>
                <td className="font-medium text-slate-800">{r.name}</td>
                <td className="text-slate-500">{r.mode || 'Cash'}</td>
                <td className="text-slate-500">{r.note || '—'}</td>
                <td className="text-right font-medium text-red-600">{inr(r.amount)}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => startEdit(r)} title="Edit" className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={15} /></button>
                    <button onClick={() => window.confirm('Delete this expense?') && deleteExpense(r.id)} title="Delete" className="grid h-7 w-7 place-items-center rounded text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
