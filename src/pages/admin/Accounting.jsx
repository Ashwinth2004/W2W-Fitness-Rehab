import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Plus, Trash2, X, Save, UserPlus } from 'lucide-react'
import {
  watchAccounting, addAccountingEntry, deleteAccountingEntry,
  watchExpenses, addExpense, deleteExpense,
  watchClients, watchTherapists, createTherapist,
  watchExpenseCategories, addExpenseCategory,
} from '../../lib/firestore'
import { fmtDate, todayISO, matchesDateFilter } from '../../lib/format'
import { onlyDigits } from '../../lib/validate'
import { FOUNDERS } from '../../lib/constants'
import DateField from '../../components/DateField'
import AdminFilter from '../../components/AdminFilter'

const inr = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN')
const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']
const EXPENSE_PRESETS = ['Salary', 'Rent', 'Electricity (EB)', 'Water bill', 'Internet', 'Equipment', 'Supplies', 'Marketing', 'Maintenance']
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
  const [clients, setClients] = useState([])
  const [therapists, setTherapists] = useState([])
  const [filter, setFilter] = useState({ day: '', month: '' })
  const [open, setOpen] = useState(false)

  useEffect(() => watchAccounting(setRows), [])
  useEffect(() => watchClients(setClients), [])
  useEffect(() => watchTherapists(setTherapists), [])

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

      {open && <IncomeForm clients={clients} therapists={therapists} onDone={() => setOpen(false)} />}

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

function IncomeForm({ clients, therapists, onDone }) {
  const [f, setF] = useState({ date: todayISO(), clientName: '', clientId: '', service: '', therapist: '', amount: '', paid: '', mode: 'Cash' })
  const [addingT, setAddingT] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const balance = Math.max(0, (Number(f.amount) || 0) - (Number(f.paid) || 0))
  const names = Array.from(new Set([...FOUNDERS.map((x) => x.name), ...therapists.map((t) => t.name)]))

  const matches = f.clientName && !f.clientId
    ? clients.filter((c) => [c.name, c.phone, c.clientId].filter(Boolean).join(' ').toLowerCase().includes(f.clientName.toLowerCase())).slice(0, 6)
    : []

  function pickClient(c) {
    setF((s) => ({ ...s, clientName: c.name, clientId: c.clientId || '', service: c.service || s.service, therapist: c.therapist || s.therapist }))
  }
  async function addTherapist() {
    const n = addingT.trim(); if (!n) return
    await createTherapist(n); setF((s) => ({ ...s, therapist: n })); setAddingT('')
  }

  async function save(e) {
    e.preventDefault()
    if (!f.clientName.trim()) return
    await addAccountingEntry({
      date: f.date || todayISO(), clientId: f.clientId || '', clientName: f.clientName.trim(), service: f.service.trim(),
      therapist: f.therapist.trim(), amount: Number(f.amount) || 0, paid: Number(f.paid) || 0, balance, mode: f.mode,
    })
    onDone()
  }

  return (
    <form onSubmit={save} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <div><label className="label text-xs">Date</label><DateField value={f.date} onChange={(iso) => setF((s) => ({ ...s, date: iso }))} max={todayISO()} /></div>

      <div className="relative">
        <label className="label text-xs">Client (search name / number) *</label>
        <input
          className="input"
          value={f.clientName}
          onChange={(e) => setF((s) => ({ ...s, clientName: e.target.value, clientId: '' }))}
          placeholder="Search or type a name…"
        />
        {f.clientId && <p className="mt-0.5 text-[11px] text-brand-600">Linked to {f.clientId}</p>}
        {matches.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {matches.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => pickClient(c)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50">
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.clientId} · {c.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div><label className="label text-xs">Service</label><input className="input" value={f.service} onChange={set('service')} placeholder="Physiotherapy" /></div>

      <div>
        <label className="label text-xs">Therapist</label>
        <select className="input" value={f.therapist} onChange={set('therapist')}>
          <option value="">— Select —</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
          {f.therapist && !names.includes(f.therapist) && <option value={f.therapist}>{f.therapist}</option>}
        </select>
        <div className="mt-1.5 flex gap-1.5">
          <input className="input h-9 text-sm" value={addingT} onChange={(e) => setAddingT(e.target.value)} placeholder="Add therapist…" />
          <button type="button" onClick={addTherapist} className="btn-outline shrink-0 px-2.5 py-1.5 text-xs"><UserPlus size={14} /></button>
        </div>
      </div>

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
  const [cats, setCats] = useState([])
  const [filter, setFilter] = useState({ day: '', month: '' })
  const [f, setF] = useState({ date: todayISO(), name: '', amount: '', note: '' })
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState('')

  useEffect(() => watchExpenses(setRows), [])
  useEffect(() => watchExpenseCategories(setCats), [])

  const list = rows.filter((r) => matchesDateFilter(r.date, filter))
  const total = list.reduce((s, r) => s + Number(r.amount || 0), 0)
  const catNames = Array.from(new Set([...EXPENSE_PRESETS, ...cats.map((c) => c.name)])).sort()

  async function saveNewCat() {
    const n = newCat.trim()
    if (!n) return
    if (!catNames.includes(n)) await addExpenseCategory(n)
    setF((s) => ({ ...s, name: n })); setNewCat(''); setAdding(false)
  }

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
          {adding ? (
            <div className="flex gap-1.5">
              <input className="input" autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New expense name…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveNewCat() } }} />
              <button type="button" onClick={saveNewCat} className="btn-primary shrink-0 px-3"><Plus size={15} /></button>
            </div>
          ) : (
            <select
              className="input"
              value={f.name}
              onChange={(e) => { if (e.target.value === '__add__') { setAdding(true); return } setF((s) => ({ ...s, name: e.target.value })) }}
            >
              <option value="">— Select expense —</option>
              {catNames.map((n) => <option key={n} value={n}>{n}</option>)}
              {f.name && !catNames.includes(f.name) && <option value={f.name}>{f.name}</option>}
              <option value="__add__">+ Add new expense…</option>
            </select>
          )}
        </div>
        <div><label className="label text-xs">Amount (Rs.) *</label><input className="input" inputMode="numeric" value={f.amount} onChange={money((v) => setF((s) => ({ ...s, amount: v })))} placeholder="0" /></div>
        <div><label className="label text-xs">Note</label><input className="input" value={f.note} onChange={(e) => setF((s) => ({ ...s, note: e.target.value }))} placeholder="Optional" /></div>
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
