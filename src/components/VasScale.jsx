// Clickable VAS (Visual Analogue Scale) 0–10 pain selector, shown below the VAS
// field in the Treatment form. Clicking a number sets the score and shows the
// matching pain descriptor — a quick, consistent way to capture the client's
// pain level. No emojis (kept clinical).
const COLORS = ['#22c55e', '#4ade80', '#84cc16', '#facc15', '#fbbf24', '#f59e0b', '#f97316', '#fb7185', '#ef4444', '#dc2626', '#b91c1c']
const LABELS = ['No pain', 'Very mild', 'Discomforting', 'Tolerable', 'Distressing', 'Very distressing', 'Intense', 'Very intense', 'Utterly horrible', 'Excruciating', 'Unspeakable / worst possible']

export default function VasScale({ value, onChange }) {
  const sel = value === '' || value === null || value === undefined ? null : Number(value)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Tap the pain level (0–10)</p>
      <div className="flex gap-1">
        {COLORS.map((c, n) => {
          const active = sel === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? '' : String(n))}
              title={`${n} — ${LABELS[n]}`}
              className={`flex-1 rounded-md py-2 text-sm font-bold text-white transition ${active ? 'scale-110 ring-2 ring-slate-800 ring-offset-1' : 'opacity-85 hover:opacity-100'}`}
              style={{ backgroundColor: c }}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
        <span>No pain</span><span>Mild</span><span>Moderate</span><span>Severe</span><span>Worst</span>
      </div>
      {sel !== null && !Number.isNaN(sel) && (
        <p className="mt-2 text-center text-sm font-semibold text-slate-700">
          {sel}/10 — <span style={{ color: COLORS[sel] }}>{LABELS[sel]}</span>
        </p>
      )}
    </div>
  )
}
