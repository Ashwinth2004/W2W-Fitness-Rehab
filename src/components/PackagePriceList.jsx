import { REHAB_FITNESS_PACKAGES } from '../lib/constants'

// Compact, tap-to-select package price list — shown next to the service
// picker in Accounting → Patient Charges and Rehab → Package & Billing, so
// the admin can pick a package straight from here instead of opening the
// dropdown. Prices/classes reflect live `services` data (so admin edits to a
// package stay in sync here too); falls back to the seed list before that
// package has loaded/been seeded yet. `value` (the currently selected
// service name) highlights the matching package.
export default function PackagePriceList({ services = [], value = '', onPick, className = '' }) {
  const byName = new Map(services.map((s) => [s.name, s]))
  const items = REHAB_FITNESS_PACKAGES.map((p) => {
    const live = byName.get(p.name)
    return { name: p.name, amount: live ? live.amount : p.amount, classes: live ? live.classes : p.classes }
  })

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3 ${className}`}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Package price list — tap to select</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((it) => {
          const selected = value === it.name
          return (
            <button
              type="button"
              key={it.name}
              onClick={() => onPick?.(it.name, it.amount, it.classes)}
              className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                selected ? 'bg-brand-600 text-white shadow ring-1 ring-brand-600' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50 hover:ring-brand-300'
              }`}
            >
              <span className="truncate">
                {it.name}{it.classes ? <span className={selected ? 'text-white/75' : 'text-slate-400'}> ({it.classes} class{it.classes > 1 ? 'es' : ''})</span> : ''}
              </span>
              <span className={`shrink-0 font-semibold ${selected ? 'text-white' : 'text-slate-800'}`}>₹{Number(it.amount || 0).toLocaleString('en-IN')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
