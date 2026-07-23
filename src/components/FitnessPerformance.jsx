import { X, TrendingUp, Lightbulb } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'

// Flattens every day across every one of the client's fitness plans (oldest
// first) into one row per session, with a completion % (exercises done / total
// prescribed, or 100/0 from the day-completed flag if no exercises exist yet).
function buildRows(plans) {
  const sorted = [...plans].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  const rows = []
  sorted.forEach((p, pi) => {
    (p.days || []).forEach((d) => {
      const total = (d.exercises || []).length
      const done = (d.exercises || []).filter((e) => e.done).length
      const pct = total ? Math.round((done / total) * 100) : (d.completed ? 100 : 0)
      rows.push({ label: `P${pi + 1}·D${d.day}`, pct, completed: !!d.completed })
    })
  })
  return rows
}

// Simple rule-based recommendation from the completion rate — no ML needed,
// just a plain read of how consistently sessions have been completed.
function recommend(rows) {
  if (!rows.length) return 'No sessions recorded yet — build a fitness plan to start tracking progress here.'
  const rate = Math.round((rows.filter((r) => r.completed).length / rows.length) * 100)
  if (rate >= 80) return `Excellent consistency — ${rate}% of sessions completed. Keep the current plan going.`
  if (rate >= 50) return `Moderate consistency — ${rate}% of sessions completed. Consider a reminder call before each session, or simplifying the program.`
  return `Low consistency — only ${rate}% of sessions completed. Recommend a check-in call, and possibly fewer exercises per day to improve adherence.`
}

export default function FitnessPerformance({ client, plans, onClose }) {
  const rows = buildRows(plans)
  const total = rows.length
  const completed = rows.filter((r) => r.completed).length
  const rate = total ? Math.round((completed / total) * 100) : 0

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl animate-pop-in space-y-5 overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><TrendingUp size={20} className="text-brand-600" /> Performance</h2>
            <p className="text-sm text-slate-500">{client.name} · {client.clientId}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={22} /></button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center"><p className="text-xs text-slate-400">Total sessions</p><p className="mt-1 text-2xl font-bold text-slate-800">{total}</p></div>
          <div className="card p-4 text-center"><p className="text-xs text-slate-400">Completed</p><p className="mt-1 text-2xl font-bold text-emerald-600">{completed}</p></div>
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-400">Completion rate</p>
            <p className={`mt-1 text-2xl font-bold ${rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="card py-10 text-center text-sm text-slate-400">No sessions yet — build a fitness plan to start tracking progress here.</p>
        ) : (
          <div className="card overflow-x-auto p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-700">Session completion (%) over time</h3>
            <ResponsiveContainer width="100%" height={240} minWidth={Math.max(320, rows.length * 36)}>
              <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f5" />
                <XAxis dataKey="label" fontSize={10} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {rows.map((r, i) => <Cell key={i} fill={r.completed ? '#10b981' : '#f59e0b'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-slate-400">Green = session marked completed · Amber = still pending</p>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border-l-[6px] border-brand-500 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">
          <Lightbulb size={18} className="mt-0.5 shrink-0" />
          <span>{recommend(rows)}</span>
        </div>
      </div>
    </div>
  )
}
