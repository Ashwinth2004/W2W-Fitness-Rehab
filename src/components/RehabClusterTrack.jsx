import { useEffect, useRef, useState } from 'react'
import {
  X, Check, Circle, CheckCircle2, Dumbbell, RotateCcw, Waves, Shuffle, Target, Zap, HeartPulse,
  ChevronDown, StickyNote, Loader2, LayoutGrid, Home,
} from 'lucide-react'
import { updateRehabPlan } from '../lib/firestore'
import { PROGRESSION_OPTIONS } from '../lib/rehabExercises'
import { fmtDate } from '../lib/format'

// One glanceable icon + colour per exercise type, shared by every tile in the
// cluster so the kind of exercise reads at a glance before the name does.
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

function ExerciseTile({ ex, expanded, onToggleExpand, onToggleDone, onNotesChange, onNotesBlur, onToggleProgression }) {
  const Icon = exerciseIcon(ex.type)
  const dose = [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.hold && ex.hold !== 'None' && ex.hold].filter(Boolean).join(' · ')
  return (
    <div className={`overflow-hidden rounded-2xl border-2 transition ${ex.done ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <button type="button" onClick={onToggleDone} className="flex w-full items-start gap-3 p-3.5 text-left active:scale-[0.98]">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${exerciseColor(ex.type)}`}><Icon size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-900">{ex.name}</span>
          <span className="block truncate text-xs text-slate-400">{dose || ex.type}</span>
        </span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${ex.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}>
          <Check size={14} />
        </span>
      </button>
      <button
        type="button" onClick={onToggleExpand}
        className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-brand-600"
      >
        <StickyNote size={11} /> {expanded ? 'Hide notes' : 'Notes & progression'} <ChevronDown size={12} className={`transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3">
          <input
            className="input h-8 text-xs" value={ex.notes || ''} placeholder="Notes for this session…"
            onChange={onNotesChange} onBlur={onNotesBlur}
          />
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
      )}
    </div>
  )
}

// Full-screen cluster tracker for a saved rehab plan — every day of the plan
// is a badge in a horizontal cluster, and every prescribed exercise for the
// selected day is an icon tile the therapist (or patient, handed the device)
// taps to mark done and jot a quick note, without opening the full prescription
// editor. Writes land straight on the plan doc (live, best-effort) so nothing
// needs a separate "Save" step.
export default function RehabClusterTrack({ client, plan, onClose }) {
  const [days, setDays] = useState(() => plan.days || [])
  const [activeDay, setActiveDay] = useState(() => {
    const firstPending = (plan.days || []).find((d) => !d.completed)
    return firstPending ? firstPending.day : (plan.days?.[plan.days.length - 1]?.day || 1)
  })
  const [expandedKey, setExpandedKey] = useState(null)
  const [saving, setSaving] = useState(false)
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

  function setNotesLocal(dayNum, idx, notes) {
    applyToDay(dayNum, (d) => ({ ...d, exercises: d.exercises.map((e, i) => (i === idx ? { ...e, notes } : e)) }))
  }

  function commitNotes() { persist(daysRef.current) }

  function toggleDayComplete(dayNum) {
    const next = applyToDay(dayNum, (d) => ({ ...d, completed: !d.completed }))
    persist(next)
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
                        onNotesChange={(e) => setNotesLocal(activeDay, idx, e.target.value)}
                        onNotesBlur={commitNotes}
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
                          onNotesChange={(e) => setNotesLocal(activeDay, idx, e.target.value)}
                          onNotesBlur={commitNotes}
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
