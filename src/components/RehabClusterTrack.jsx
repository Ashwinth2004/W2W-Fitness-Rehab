import { useEffect, useRef, useState } from 'react'
import {
  X, Check, Circle, CheckCircle2, ChevronDown, StickyNote, Loader2, LayoutGrid, Home,
  TrendingUp, FileDown,
} from 'lucide-react'
import { updateRehabPlan } from '../lib/firestore'
import { PROGRESSION_OPTIONS } from '../lib/rehabExercises'
import { generateRehabReport } from '../lib/pdf'
import { fmtDate } from '../lib/format'
import RehabPerformance from './RehabPerformance'

// One tinted badge colour per exercise type — the icon inside it is always
// the region body-map (see RegionIcon), so colour = category, glyph = where
// on the body. Keeps the cluster scannable at a glance.
const TYPE_COLOR = {
  Mobility: 'bg-sky-100 text-sky-600', Strengthening: 'bg-brand-100 text-brand-700', Stretching: 'bg-violet-100 text-violet-600',
  Functional: 'bg-amber-100 text-amber-700', Balance: 'bg-fuchsia-100 text-fuchsia-600',
  Plyometric: 'bg-rose-100 text-rose-600', Cardio: 'bg-red-100 text-red-600',
}
export function exerciseColor(type) { return TYPE_COLOR[type] || 'bg-slate-100 text-slate-600' }

// Where on a simple stick-figure body map each prescribed region sits — so a
// tile for "Knee" or "Shoulder" is recognisable by silhouette before the
// label is even read. Unlisted/custom regions fall back to a chest-level dot.
const REGION_POINT = {
  Neck: [22, 16], Shoulder: [34, 22], Chest: [22, 26], 'Upper Arm': [35.5, 29],
  Elbow: [37, 36], 'Forearm & Wrist': [38, 43], 'Wrist & Hand': [39, 50],
  'Thoracic Spine': [22, 24], 'Lumbar Spine': [22, 40], Back: [22, 32], Abdomen: [22, 34],
  Core: [22, 36], Hip: [22, 44], Thigh: [28, 55], Knee: [29, 66], 'Lower Leg': [29.5, 76],
  Ankle: [30, 84], 'Ankle & Foot': [30, 86], Foot: [30, 88],
}

function RegionIcon({ region, className = '' }) {
  const whole = region === 'Whole Body'
  const point = REGION_POINT[region] || REGION_POINT.Chest
  return (
    <span className={className}>
      <svg viewBox="0 0 44 92" className="h-full w-full overflow-visible">
        <g fill="none" stroke="currentColor" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" opacity={whole ? 0.9 : 0.45}>
          <circle cx="22" cy="9" r="6" fill="currentColor" stroke="none" />
          <line x1="22" y1="16" x2="22" y2="44" />
          <line x1="10" y1="22" x2="34" y2="22" />
          <line x1="10" y1="22" x2="7" y2="36" />
          <line x1="7" y1="36" x2="5" y2="50" />
          <line x1="34" y1="22" x2="37" y2="36" />
          <line x1="37" y1="36" x2="39" y2="50" />
          <line x1="14" y1="44" x2="30" y2="44" />
          <line x1="17" y1="44" x2="15" y2="66" />
          <line x1="15" y1="66" x2="14" y2="86" />
          <line x1="27" y1="44" x2="29" y2="66" />
          <line x1="29" y1="66" x2="30" y2="86" />
        </g>
        {!whole && <circle cx={point[0]} cy={point[1]} r="10" className="fill-current opacity-20" />}
        {!whole && <circle cx={point[0]} cy={point[1]} r="6" className="fill-current" />}
      </svg>
    </span>
  )
}

function DayRing({ pct, size = 40, tone }) {
  const r = (size - 4) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.min(100, pct) / 100) * c
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={3} className={tone === 'active' ? 'stroke-white/25' : 'stroke-slate-200'} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={3} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
        className={tone === 'active' ? 'stroke-white' : pct >= 100 ? 'stroke-emerald-500' : 'stroke-brand-500'}
      />
    </svg>
  )
}

const PRESCRIBED_FIELDS = [
  ['Sets', 'sets'], ['Reps', 'reps'], ['Hold', 'hold'], ['Resistance', 'resistance'], ['Frequency', 'frequency'], ['Rest', 'rest'],
]

// A tile that opens into a full detail dropdown: the prescribed dosage for
// reference, editable "what the patient actually did" fields, notes, and
// progression — everything needed to log a real session without leaving the
// cluster. The corner check is a separate tap target so a quick done/undone
// toggle never fights with opening the dropdown.
function ExerciseTile({ ex, expanded, onToggleExpand, onToggleDone, onNotesChange, onNotesBlur, onActualChange, onActualBlur, onToggleProgression }) {
  const dose = [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.hold && ex.hold !== 'None' && ex.hold].filter(Boolean).join(' · ')
  return (
    <div className={`overflow-hidden rounded-2xl border-2 transition ${ex.done ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex w-full items-start gap-3 p-3.5">
        <button type="button" onClick={onToggleExpand} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl p-1.5 ${exerciseColor(ex.type)}`}><RegionIcon region={ex.region} className="h-full w-full" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-900">{ex.name}</span>
            <span className="block truncate text-xs text-slate-400">{ex.region} · {dose || ex.type}</span>
          </span>
        </button>
        <button
          type="button" onClick={(e) => { e.stopPropagation(); onToggleDone() }} title={ex.done ? 'Mark not done' : 'Mark done'}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition ${ex.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}
        >
          <Check size={15} />
        </button>
      </div>
      <button
        type="button" onClick={onToggleExpand}
        className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-brand-600"
      >
        <StickyNote size={11} /> {expanded ? 'Hide details' : 'View & update details'} <ChevronDown size={12} className={`transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3.5">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Prescribed</p>
            <div className="grid grid-cols-3 gap-1.5 text-center sm:grid-cols-6">
              {PRESCRIBED_FIELDS.map(([label, key]) => (
                <div key={key} className="rounded-lg bg-white p-1.5 ring-1 ring-slate-100">
                  <p className="text-[9px] uppercase text-slate-400">{label}</p>
                  <p className="truncate text-xs font-semibold text-slate-700">{ex[key] && ex[key] !== 'None' ? ex[key] : '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">What the patient actually did</p>
            <div className="grid grid-cols-3 gap-1.5">
              <input className="input h-9 text-center text-xs" inputMode="numeric" value={ex.actualSets || ''} placeholder={ex.sets ? `${ex.sets} sets` : 'Sets'} onChange={(e) => onActualChange('actualSets', e.target.value)} onBlur={onActualBlur} />
              <input className="input h-9 text-center text-xs" inputMode="numeric" value={ex.actualReps || ''} placeholder={ex.reps ? `${ex.reps} reps` : 'Reps'} onChange={(e) => onActualChange('actualReps', e.target.value)} onBlur={onActualBlur} />
              <input className="input h-9 text-center text-xs" value={ex.actualHold || ''} placeholder={ex.hold && ex.hold !== 'None' ? ex.hold : 'Hold'} onChange={(e) => onActualChange('actualHold', e.target.value)} onBlur={onActualBlur} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Notes for this session</label>
            <input className="input h-9 text-xs" value={ex.notes || ''} placeholder="e.g. mild pain at end range, reduced reps…" onChange={onNotesChange} onBlur={onNotesBlur} />
          </div>

          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Progression</p>
            <div className="flex flex-wrap gap-1.5">
              {PROGRESSION_OPTIONS.map((p) => (
                <button
                  key={p} type="button" onClick={() => onToggleProgression(p)}
                  className={`rounded-full border px-2 py-1 text-[10px] font-medium transition ${
                    (ex.progression || []).includes(p) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-brand-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Full-screen cluster tracker for a saved rehab plan — every day of the plan
// is a badge in a horizontal cluster, and every prescribed exercise for the
// selected day is an icon tile the therapist (or patient, handed the device)
// taps to open, mark done and log real session data. Writes land straight on
// the plan doc (live, best-effort) so nothing needs a separate "Save" step.
export default function RehabClusterTrack({ client, plan, plans = [], onClose }) {
  const [days, setDays] = useState(() => plan.days || [])
  const [activeDay, setActiveDay] = useState(() => {
    const firstPending = (plan.days || []).find((d) => !d.completed)
    return firstPending ? firstPending.day : (plan.days?.[plan.days.length - 1]?.day || 1)
  })
  const [expandedKey, setExpandedKey] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPerf, setShowPerf] = useState(false)
  const [reportMenuOpen, setReportMenuOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const daysRef = useRef(days)
  useEffect(() => { daysRef.current = days }, [days])

  async function persist(nextDays) {
    setSaving(true)
    try { await updateRehabPlan(client.id, plan.id, { ...plan, days: nextDays }) }
    catch (_) { /* live tracking is best-effort — local state still shows the change */ }
    setSaving(false)
  }

  function applyToDay(dayNum, updater) {
    const next = days.map((d) => (d.day === dayNum ? updater(d) : d))
    setDays(next)
    return next
  }

  function toggleExerciseDone(dayNum, idx) {
    const next = applyToDay(dayNum, (d) => {
      const exercises = d.exercises.map((e, i) => (i === idx ? { ...e, done: !e.done } : e))
      const allDone = exercises.length > 0 && exercises.every((e) => e.done)
      return { ...d, exercises, completed: allDone ? true : d.completed }
    })
    persist(next)
  }

  function toggleProgression(dayNum, idx, p) {
    const next = applyToDay(dayNum, (d) => ({
      ...d,
      exercises: d.exercises.map((e, i) => (i === idx
        ? { ...e, progression: (e.progression || []).includes(p) ? e.progression.filter((x) => x !== p) : [...(e.progression || []), p] }
        : e)),
    }))
    persist(next)
  }

  function setFieldLocal(dayNum, idx, field, value) {
    applyToDay(dayNum, (d) => ({ ...d, exercises: d.exercises.map((e, i) => (i === idx ? { ...e, [field]: value } : e)) }))
  }

  function commitEdits() { persist(daysRef.current) }

  // Marking a day complete also ticks off every exercise prescribed that day
  // (unmarking leaves individual ticks as they were — only completion forces
  // the "everything done" state, not the reverse).
  function toggleDayComplete(dayNum) {
    const next = applyToDay(dayNum, (d) => {
      const completed = !d.completed
      return { ...d, completed, exercises: completed ? (d.exercises || []).map((e) => ({ ...e, done: true })) : d.exercises }
    })
    persist(next)
  }

  async function downloadReport(scope) {
    setReportBusy(true); setReportMenuOpen(false)
    try {
      const dayNow = days.find((d) => d.day === activeDay)
      const source = scope === 'day' ? [{ ...plan, days: [dayNow] }] : (plans.length ? plans : [plan])
      await generateRehabReport(client, { plans: source, action: 'download' })
    } catch (_) { /* best-effort */ }
    setReportBusy(false)
  }

  if (showPerf) {
    return <RehabPerformance client={client} plans={plans.length ? plans : [plan]} onClose={() => setShowPerf(false)} />
  }

  const dayData = days.find((d) => d.day === activeDay) || days[0]
  const exercises = dayData?.exercises || []
  const main = exercises.filter((e) => e.type !== 'Stretching')
  const stretches = exercises.filter((e) => e.type === 'Stretching')
  const doneCount = exercises.filter((e) => e.done).length

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-slate-900/50 backdrop-blur-sm sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[calc(100%-2rem)] sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3.5 text-white sm:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/70"><LayoutGrid size={12} /> Cluster tracker</p>
            <p className="truncate text-lg font-bold">{client.name} <span className="font-normal text-white/70">· {plan.bill?.service || plan.reason || 'Rehab plan'}</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin text-white/80" />}
            <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/15 hover:bg-white/25"><X size={18} /></button>
          </div>
        </div>

        {/* Toolbar — performance & reports */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-2.5 sm:px-6">
          <button type="button" onClick={() => setShowPerf(true)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100">
            <TrendingUp size={14} /> Performance
          </button>
          <div className="relative">
            <button
              type="button" onClick={() => setReportMenuOpen((v) => !v)} disabled={reportBusy}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              {reportBusy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Generate Report <ChevronDown size={12} className={`transition ${reportMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {reportMenuOpen && (
              <>
                <div className="fixed inset-0 z-[5]" onClick={() => setReportMenuOpen(false)} />
                <div className="absolute left-0 z-10 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  <button type="button" onClick={() => downloadReport('day')} className="block w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">Day {activeDay} plan &amp; results</button>
                  <button type="button" onClick={() => downloadReport('all')} className="block w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">Full rehab history (all plans)</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Day cluster */}
        <div className="flex gap-2.5 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
          {days.map((d) => {
            const total = d.exercises?.length || 0
            const done = d.exercises?.filter((e) => e.done).length || 0
            const pct = total ? Math.round((done / total) * 100) : (d.completed ? 100 : 0)
            const active = d.day === activeDay
            return (
              <button
                key={d.day} type="button" onClick={() => setActiveDay(d.day)}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition ${
                  active ? 'bg-brand-600 text-white shadow-lg' : d.completed ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-200'
                }`}
              >
                <span className="relative grid h-10 w-10 place-items-center">
                  <DayRing pct={pct} tone={active ? 'active' : 'idle'} />
                  <span className="absolute text-xs font-extrabold">{d.completed ? <CheckCircle2 size={16} /> : d.day}</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide">Day {d.day}</span>
                {total > 0 && <span className="text-[9px] opacity-75">{done}/{total}</span>}
              </button>
            )
          })}
        </div>

        {/* Tiles */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {dayData && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {dayData.date && <span>{fmtDate(dayData.date)}</span>}
              {dayData.home && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500"><Home size={11} /> Home program</span>}
            </div>
          )}

          {exercises.length === 0 ? (
            <p className="grid h-40 place-items-center text-center text-sm text-slate-400">No exercises prescribed for Day {activeDay} yet.<br />Add some from the plan editor first.</p>
          ) : (
            <div className="space-y-5">
              {main.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {main.map((ex) => {
                    const idx = exercises.indexOf(ex)
                    const key = `${activeDay}-${idx}`
                    return (
                      <ExerciseTile
                        key={idx} ex={ex} expanded={expandedKey === key}
                        onToggleExpand={() => setExpandedKey((k) => (k === key ? null : key))}
                        onToggleDone={() => toggleExerciseDone(activeDay, idx)}
                        onNotesChange={(e) => setFieldLocal(activeDay, idx, 'notes', e.target.value)}
                        onNotesBlur={commitEdits}
                        onActualChange={(field, value) => setFieldLocal(activeDay, idx, field, value)}
                        onActualBlur={commitEdits}
                        onToggleProgression={(p) => toggleProgression(activeDay, idx, p)}
                      />
                    )
                  })}
                </div>
              )}
              {stretches.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold text-brand-700">Stretches</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {stretches.map((ex) => {
                      const idx = exercises.indexOf(ex)
                      const key = `${activeDay}-${idx}`
                      return (
                        <ExerciseTile
                          key={idx} ex={ex} expanded={expandedKey === key}
                          onToggleExpand={() => setExpandedKey((k) => (k === key ? null : key))}
                          onToggleDone={() => toggleExerciseDone(activeDay, idx)}
                          onNotesChange={(e) => setFieldLocal(activeDay, idx, 'notes', e.target.value)}
                          onNotesBlur={commitEdits}
                          onActualChange={(field, value) => setFieldLocal(activeDay, idx, field, value)}
                          onActualBlur={commitEdits}
                          onToggleProgression={(p) => toggleProgression(activeDay, idx, p)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <p className="text-xs text-slate-500">{doneCount}/{exercises.length} exercises done today</p>
          <button
            type="button" onClick={() => toggleDayComplete(activeDay)}
            className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-extrabold uppercase tracking-wide transition ${
              dayData?.completed ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
            }`}
          >
            {dayData?.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            {dayData?.completed ? 'Day completed' : 'Mark day complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
