import { useEffect, useRef, useState } from 'react'
import {
  X, Check, Circle, CheckCircle2, ChevronDown, StickyNote, Loader2, LayoutGrid, Home,
  TrendingUp, FileDown, Dumbbell, RotateCcw, Waves, Shuffle, Target, Zap, HeartPulse,
} from 'lucide-react'
import { updateRehabPlan } from '../lib/firestore'
import { PROGRESSION_OPTIONS } from '../lib/rehabExercises'
import { generateRehabReport } from '../lib/pdf'
import { fmtDate } from '../lib/format'
import RehabPerformance from './RehabPerformance'

// One glanceable icon + tinted badge colour per exercise type.
const TYPE_ICON = {
  Mobility: RotateCcw, Strengthening: Dumbbell, Stretching: Waves,
  Functional: Shuffle, Balance: Target, Plyometric: Zap, Cardio: HeartPulse,
}
const TYPE_COLOR = {
  Mobility: 'bg-sky-100 text-sky-600', Strengthening: 'bg-brand-100 text-brand-700', Stretching: 'bg-violet-100 text-violet-600',
  Functional: 'bg-amber-100 text-amber-700', Balance: 'bg-fuchsia-100 text-fuchsia-600',
  Plyometric: 'bg-rose-100 text-rose-600', Cardio: 'bg-red-100 text-red-600',
}
export function exerciseIcon(type) { return TYPE_ICON[type] || Dumbbell }
export function exerciseColor(type) { return TYPE_COLOR[type] || 'bg-slate-100 text-slate-600' }

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
// Displays the prescribed value until the admin actually edits it — clicking
// in and typing overrides it. Once touched (even cleared to ''), the typed
// value wins so the field stays editable rather than snapping back.
function actualValue(ex, field, prescribedKey) {
  return ex[field] != null ? ex[field] : (prescribedKey && ex[prescribedKey] !== 'None' ? ex[prescribedKey] || '' : '')
}

function ExerciseTile({ ex, expanded, onToggleExpand, onToggleDone, onNotesChange, onNotesBlur, onActualChange, onActualBlur, onToggleProgression }) {
  const Icon = exerciseIcon(ex.type)
  const dose = [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.hold && ex.hold !== 'None' && ex.hold].filter(Boolean).join(' · ')
  return (
    <div className={`overflow-hidden rounded-2xl border-2 transition ${ex.done ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex w-full items-start gap-3 p-4">
        <button type="button" onClick={onToggleExpand} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${exerciseColor(ex.type)}`}><Icon size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-900">{ex.name}</span>
            <span className="block truncate text-xs text-slate-400">{ex.region} · {dose || ex.type}</span>
          </span>
        </button>
        <button
          type="button" onClick={(e) => { e.stopPropagation(); onToggleDone() }} title={ex.done ? 'Mark not done' : 'Mark done'}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition ${ex.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'}`}
        >
          <Check size={16} />
        </button>
      </div>
      <button
        type="button" onClick={onToggleExpand}
        className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-brand-600"
      >
        <StickyNote size={13} /> {expanded ? 'Hide details' : 'View & update details'} <ChevronDown size={13} className={`transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Prescribed</p>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
              {PRESCRIBED_FIELDS.map(([label, key]) => (
                <div key={key} className="rounded-lg bg-white px-2 py-2 ring-1 ring-slate-100">
                  <p className="text-[10px] uppercase text-slate-400">{label}</p>
                  <p className="text-xs font-semibold leading-snug text-slate-700">{ex[key] && ex[key] !== 'None' ? ex[key] : '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-600">What the patient actually did — tap to change</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-center text-[10px] text-slate-400">Sets</label>
                <input className="input h-10 text-center text-sm" inputMode="numeric" value={actualValue(ex, 'actualSets', 'sets')} onChange={(e) => onActualChange('actualSets', e.target.value)} onBlur={onActualBlur} />
              </div>
              <div>
                <label className="mb-1 block text-center text-[10px] text-slate-400">Reps</label>
                <input className="input h-10 text-center text-sm" inputMode="numeric" value={actualValue(ex, 'actualReps', 'reps')} onChange={(e) => onActualChange('actualReps', e.target.value)} onBlur={onActualBlur} />
              </div>
              <div>
                <label className="mb-1 block text-center text-[10px] text-slate-400">Hold</label>
                <input className="input h-10 text-center text-sm" value={actualValue(ex, 'actualHold', 'hold')} onChange={(e) => onActualChange('actualHold', e.target.value)} onBlur={onActualBlur} />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Notes for this session</label>
            <input className="input h-10 text-sm" value={ex.notes || ''} placeholder="e.g. mild pain at end range, reduced reps…" onChange={onNotesChange} onBlur={onNotesBlur} />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Progression</p>
            <div className="flex flex-wrap gap-2">
              {PROGRESSION_OPTIONS.map((p) => (
                <button
                  key={p} type="button" onClick={() => onToggleProgression(p)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
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
                  <button type="button" onClick={() => downloadReport('all')} className="block w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">Full rehab history (all days)</button>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
