import { Stethoscope, Dumbbell } from 'lucide-react'

export default function HomeVisitServiceTypeSelector({ value, onChange, disabled }) {
  return (
    <div className="space-y-3">
      <label className="label text-sm">Home Visit Service Type *</label>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange('physio')}
          disabled={disabled}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 px-4 py-4 transition ${
            value === 'physio'
              ? 'border-brand-600 bg-brand-50 text-brand-600'
              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'
          }`}
        >
          <Stethoscope size={24} />
          <div className="text-left">
            <p className="font-bold">[P] Physio Treatment</p>
            <p className="text-xs text-slate-500">Clinical home-based treatment sessions</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange('rehab')}
          disabled={disabled}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 px-4 py-4 transition ${
            value === 'rehab'
              ? 'border-green-600 bg-green-50 text-green-600'
              : 'border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:bg-green-50'
          }`}
        >
          <Dumbbell size={24} />
          <div className="text-left">
            <p className="font-bold">[R] Rehab & Exercise</p>
            <p className="text-xs text-slate-500">Exercise plans & progress tracking at home</p>
          </div>
        </button>
      </div>
    </div>
  )
}
