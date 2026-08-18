import { Stethoscope, Dumbbell, Activity, Check } from 'lucide-react'
import { HOME_VISIT_SERVICES } from '../lib/homeVisit'

const ICONS = { physio: Stethoscope, rehab: Dumbbell, fitness: Activity }
const TONES = {
  physio: 'border-brand-600 bg-brand-50 text-brand-700',
  rehab: 'border-green-600 bg-green-50 text-green-700',
  fitness: 'border-violet-600 bg-violet-50 text-violet-700',
}
const BLURB = {
  physio: 'Clinical home-based treatment sessions',
  rehab: 'Exercise plans & progress tracking at home',
  fitness: 'Home fitness programme & tracking',
}

// The single registration choice for a Home Visit patient — pick every
// service they're signing up for. Whatever is picked here decides which
// workspaces open for them later, so nothing unregistered is ever in the way.
export default function HomeVisitServiceTypeSelector({ value = [], onChange, disabled, invalid }) {
  const selected = Array.isArray(value) ? value : (value ? [value] : [])
  const toggle = (id) => {
    if (disabled) return
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <div className="space-y-2">
      <label className="label text-sm">Home Visit Service(s) *</label>
      <p className="text-xs text-slate-500">Pick every service this patient is registered for — you can choose more than one.</p>
      <div className={`grid gap-3 sm:grid-cols-3 ${invalid ? 'rounded-xl ring-2 ring-red-400' : ''}`}>
        {HOME_VISIT_SERVICES.map((s) => {
          const Icon = ICONS[s.id]
          const on = selected.includes(s.id)
          return (
            <button
              key={s.id} type="button" onClick={() => toggle(s.id)} disabled={disabled}
              aria-pressed={on}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-center transition ${
                on ? TONES[s.id] : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {on && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-current text-white">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </span>
              )}
              <Icon size={24} />
              <span className="text-sm font-bold">{s.label}</span>
              <span className="text-[11px] leading-tight text-slate-500">{BLURB[s.id]}</span>
            </button>
          )
        })}
      </div>
      {invalid && <p className="text-xs font-medium text-red-600">Choose at least one service.</p>}
    </div>
  )
}
