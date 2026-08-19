import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Loader2, Save, ArrowRight, Plus, CheckCircle2, Circle, X, Copy, Pencil, Trash2,
  IndianRupee, Star, ListChecks, MapPin, Layers, Wand2, Check, Lightbulb, LayoutTemplate,
  GripVertical, ChevronUp, ChevronDown,
} from 'lucide-react'
import {
  addRehabPlan, updateRehabPlan, watchRehabPlans, deleteRehabPlan,
  watchServiceCharges, ensureRehabPackagesSeeded, setAccountingForRehabPlan, deleteAccountingForRehabPlan,
  watchRehabTemplates, addRehabTemplate, updateRehabTemplate, deleteRehabTemplate, updateClient,
} from '../lib/firestore'
import {
  REHAB_REGIONS, REGION_TYPES, WHOLE_BODY_TYPES, typesForRegion, exercisesFor, SETS_OPTIONS, REPS_OPTIONS, HOLD_OPTIONS,
  RESISTANCE_OPTIONS, FREQUENCY_OPTIONS, REST_OPTIONS, PROGRESSION_OPTIONS, blankPrescription, BALANCE_LEVEL,
} from '../lib/rehabExercises'
import {
  getCustomExercises, addCustomExercise, updateCustomExercise, deleteCustomExercise,
  getCustomExercisesForRegionType, addCustomExerciseForRegionType, deleteCustomExerciseForRegionType,
  updateCustomExerciseForRegionType, renameRegionTypeExercises, deleteRegionTypeExercises,
} from '../lib/customExercises'
import {
  getCustomRegions, addCustomRegion, updateCustomRegion, deleteCustomRegion,
  getCustomTypes, addCustomType, updateCustomType, deleteCustomType,
  getCustomTypesForRegion, addCustomTypeForRegion, deleteCustomTypeForRegion,
  updateCustomTypeForRegion, getRegionsWithCustomTypes,
} from '../lib/customTaxonomy'
import { useFavorites } from '../lib/useFavorites'
import { todayISO, fmtDate, addDaysISO } from '../lib/format'
import { onlyDigits } from '../lib/validate'
import DateField from './DateField'
import TherapistSelect from './TherapistSelect'
import ServiceSelect from './ServiceSelect'
import FavSelect from './FavSelect'
import PackagePriceList from './PackagePriceList'
import RehabClusterTrack from './RehabClusterTrack'
import AdminPageHeader from './AdminPageHeader'

export const MAX_DAYS = 60
export const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']
const BUILTIN_TYPES = [...REGION_TYPES, ...WHOLE_BODY_TYPES]

export function templateDays(t) {
  return t?.days?.length ? t.days : (t?.exercises ? [{ day: 1, exercises: t.exercises }] : [])
}
export function templateExerciseCount(t) {
  return templateDays(t).reduce((s, d) => s + (d.exercises?.length || 0), 0)
}
export function isPlanComplete(p) {
  const days = p.days || []
  return days.length > 0 && days.every((d) => d.completed)
}

export function blankDay(n, startDate, home = false) {
  return { day: n, date: startDate ? addDaysISO(startDate, n - 1) : '', home, completed: false, exercises: [] }
}

export function blankPlan(home = false) {
  const start = todayISO()
  return {
    startDate: start, totalDays: home ? 7 : 1, therapist: '', reason: '', note: '',
    bill: { service: '', amount: '', paid: '', mode: 'Cash', addToAccounting: true },
    days: [blankDay(1, start, home)],
  }
}

// ---- Inserting / removing days anywhere in a plan -------------------------
// Day numbers are always a gap-free 1..N sequence, so removing or inserting
// one in the middle renumbers everything after it (delete Day 5 → the old
// Day 6 becomes Day 5, and so on).
//
// Each day also carries its own date, which is normally auto-derived as
// startDate + (day - 1). A date still sitting on that auto value is re-derived
// for the day's new position so the schedule stays consecutive; a date the
// admin typed themselves is left exactly as they set it.
export function renumberDays(days, startDate) {
  return days.map((d, i) => {
    const wasAuto = !d.date || (startDate && d.date === addDaysISO(startDate, d.day - 1))
    return { ...d, day: i + 1, date: wasAuto && startDate ? addDaysISO(startDate, i) : d.date }
  })
}

// Insert a fresh empty day at `index` (0-based), pushing the rest down.
export function insertDayAt(days, index, startDate, home = false) {
  const at = Math.max(0, Math.min(index, days.length))
  const next = [...days]
  next.splice(at, 0, blankDay(at + 1, startDate, home))
  return renumberDays(next, startDate)
}

// Remove the day at `index` (0-based). Never removes the last remaining day.
export function removeDayAt(days, index, startDate) {
  if (days.length <= 1 || index < 0 || index >= days.length) return days
  return renumberDays(days.filter((_, i) => i !== index), startDate)
}

// The Day 1 / Day 2 / … pill strip, plus the controls that add a day either
// side of the selected one or delete it. Owns all day add/remove/renumber
// logic so every planner (Rehab, Fitness, Home Visit) behaves identically —
// callers just persist the new array via `onDaysChange(days, activeDay)`.
export function DayStrip({ days, activeDay, startDate, home = false, maxDays = MAX_DAYS, onSelectDay, onDaysChange, onSaveDay, savingDay }) {
  const activeIdx = days.findIndex((d) => d.day === activeDay)
  const idx = activeIdx === -1 ? 0 : activeIdx
  const current = days[idx]
  const canAdd = days.length < maxDays
  const canDelete = days.length > 1

  function insertAt(at) {
    if (!canAdd) return
    onDaysChange(insertDayAt(days, at, startDate, home), at + 1)
  }

  function deleteActive() {
    if (!canDelete || !current) return
    const count = current.exercises?.length || 0
    const after = days.length - idx - 1
    const warn = `Delete Day ${current.day}${count ? ` and its ${count} exercise${count > 1 ? 's' : ''}` : ''}?`
      + (after ? `\n\nThe ${after} day${after > 1 ? 's' : ''} after it will move up (Day ${current.day + 1} becomes Day ${current.day}).` : '')
    if (!window.confirm(warn)) return
    const next = removeDayAt(days, idx, startDate)
    onDaysChange(next, Math.min(idx + 1, next.length))
  }

  const btn = 'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="space-y-2.5 border-b border-slate-100 pb-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button
              key={d.day} type="button" onClick={() => onSelectDay(d.day)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${activeDay === d.day ? 'bg-brand-600 text-white shadow' : d.completed ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {d.completed && <CheckCircle2 size={14} />}
              Day {d.day}
              {d.exercises?.length ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeDay === d.day ? 'bg-white/25' : d.completed ? 'bg-emerald-100' : 'bg-slate-200'}`} title={`${d.exercises.length} exercise${d.exercises.length > 1 ? 's' : ''} prescribed`}>
                  {d.exercises.length} ex
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <span className="shrink-0 text-xs text-slate-400">{days.filter((d) => d.completed).length}/{days.length} sessions completed</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Day {current?.day}</span>
        <button
          type="button" onClick={() => insertAt(idx)} disabled={!canAdd} title={`Insert a new day before Day ${current?.day}`}
          className={`${btn} bg-slate-100 text-slate-600 hover:bg-slate-200`}
        >
          <Plus size={12} /> Insert before
        </button>
        <button
          type="button" onClick={() => insertAt(idx + 1)} disabled={!canAdd} title={`Insert a new day after Day ${current?.day}`}
          className={`${btn} bg-slate-100 text-slate-600 hover:bg-slate-200`}
        >
          <Plus size={12} /> Insert after
        </button>
        <button
          type="button" onClick={deleteActive} disabled={!canDelete} title={canDelete ? `Delete Day ${current?.day}` : 'A plan needs at least one day'}
          className={`${btn} bg-red-50 text-red-600 hover:bg-red-100`}
        >
          <Trash2 size={12} /> Delete this day
        </button>
        <button
          type="button" onClick={() => insertAt(days.length)} disabled={!canAdd} title="Add a new day at the end"
          className={`${btn} ml-auto bg-brand-50 text-brand-700 hover:bg-brand-100`}
        >
          <Plus size={12} /> Add day at end
        </button>
        {/* Saves the plan without leaving the editor, so a long multi-day plan
            can be banked day by day as it's built. */}
        {onSaveDay && (
          <button
            type="button" onClick={onSaveDay} disabled={savingDay === 'saving'}
            title={`Save the plan now, including Day ${current?.day}`}
            className={`${btn} ${savingDay === 'saved' ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
          >
            {savingDay === 'saving' ? <Loader2 size={12} className="animate-spin" /> : savingDay === 'saved' ? <Check size={12} /> : <Save size={12} />}
            {savingDay === 'saving' ? 'Saving…' : savingDay === 'saved' ? `Day ${current?.day} saved` : `Save Day ${current?.day} plan`}
          </button>
        )}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return <div><label className="label text-[11px]">{label}</label>{children}</div>
}

export function StarChip({ label, active, fav, disabled, onToggleFav, onClick }) {
  return (
    <span className={`inline-flex items-center overflow-hidden rounded-full border transition ${
      disabled ? 'border-slate-100 bg-slate-100 text-slate-300'
      : active ? 'border-brand-600 bg-brand-600 text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:bg-brand-50'
    }`}>
      <button
        type="button" disabled={disabled} title={fav ? 'Unfavorite' : 'Mark as favorite'}
        onClick={(e) => { e.stopPropagation(); onToggleFav() }}
        className={`grid h-full place-items-center py-1.5 pl-2 pr-1 ${fav ? 'text-amber-400' : active ? 'text-white/60 hover:text-amber-300' : 'text-slate-300 hover:text-amber-400'}`}
      >
        <Star size={12} className={fav ? 'fill-amber-400' : ''} />
      </button>
      <button type="button" disabled={disabled} onClick={onClick} className="py-1.5 pr-3 text-left text-xs font-medium disabled:line-through">
        {label}
      </button>
    </span>
  )
}

export function EditableChip({ label, editing, editVal, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete }) {
  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brand-400 bg-white py-1 pl-2.5 pr-1">
        <input
          autoFocus className="w-28 border-0 bg-transparent text-xs focus:outline-none sm:w-36" value={editVal}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSaveEdit() } if (e.key === 'Escape') onCancelEdit() }}
        />
        <button type="button" onClick={onSaveEdit} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-brand-600 hover:bg-brand-50"><Check size={13} /></button>
        <button type="button" onClick={onCancelEdit} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={13} /></button>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs font-medium text-slate-700">
      {label}
      <button type="button" onClick={onStartEdit} title="Rename" className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-brand-600"><Pencil size={11} /></button>
      <button type="button" onClick={onDelete} title="Delete" className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-red-500"><Trash2 size={11} /></button>
    </span>
  )
}

export function ManageableChip({
  label, active, fav, disabled, custom, editing, editVal,
  onToggleFav, onClick, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete,
}) {
  if (custom && editing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brand-400 bg-white py-1 pl-2.5 pr-1">
        <input
          autoFocus className="w-24 border-0 bg-transparent text-xs focus:outline-none sm:w-32" value={editVal}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSaveEdit() } if (e.key === 'Escape') onCancelEdit() }}
        />
        <button type="button" onClick={onSaveEdit} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-brand-600 hover:bg-brand-50"><Check size={13} /></button>
        <button type="button" onClick={onCancelEdit} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={13} /></button>
      </span>
    )
  }
  if (!custom) {
    return <StarChip label={label} active={active} fav={fav} disabled={disabled} onToggleFav={onToggleFav} onClick={onClick} />
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-white/70 pr-1 ring-1 ring-brand-100">
      <StarChip label={label} active={active} fav={fav} disabled={disabled} onToggleFav={onToggleFav} onClick={onClick} />
      <button type="button" onClick={onStartEdit} title="Rename (your own)" className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={11} /></button>
      <button type="button" onClick={onDelete} title="Delete (your own)" className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-red-500"><Trash2 size={11} /></button>
    </span>
  )
}

export function CustomTaxonomyModal({ onClose, onChanged }) {
  const [tab, setTab] = useState('create')

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl animate-pop-in space-y-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add your own — Region, Type &amp; Exercises</h2>
            <p className="text-sm text-slate-500">Build a custom region step by step, or manage what you've already created.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => setTab('create')} className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${tab === 'create' ? 'bg-white text-brand-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Create new region</button>
          <button type="button" onClick={() => setTab('manage')} className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${tab === 'manage' ? 'bg-white text-brand-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Manage existing</button>
        </div>

        {tab === 'create'
          ? <CreateRegionWizard onSaved={onChanged} onClose={onClose} />
          : <ManageTaxonomyPanel onChanged={onChanged} />}
      </div>
    </div>
  )
}

export function CreateRegionWizard({ onSaved, onClose }) {
  const [step, setStep] = useState(1)
  const [regionName, setRegionName] = useState('')
  const [customTypes] = useState(() => getCustomTypes())
  const [selectedTypes, setSelectedTypes] = useState([])
  const [typeDraft, setTypeDraft] = useState('')
  const [pendingNewTypes, setPendingNewTypes] = useState([])
  const [newExercisesByType, setNewExercisesByType] = useState({})
  const [exDraftByType, setExDraftByType] = useState({})
  const [saved, setSaved] = useState(false)

  const knownTypes = [...new Set([...REGION_TYPES, ...WHOLE_BODY_TYPES, ...customTypes])]
  const allOfferedTypes = [...new Set([...knownTypes, ...pendingNewTypes])]

  function toggleType(t) {
    setSelectedTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))
  }
  function addOwnType() {
    const n = typeDraft.trim(); if (!n) return
    if (!allOfferedTypes.some((x) => x.toLowerCase() === n.toLowerCase())) setPendingNewTypes((p) => [...p, n])
    if (!selectedTypes.some((x) => x.toLowerCase() === n.toLowerCase())) setSelectedTypes((ts) => [...ts, n])
    setTypeDraft('')
  }

  function addExerciseDraft(type) {
    const n = (exDraftByType[type] || '').trim(); if (!n) return
    setNewExercisesByType((m) => ({ ...m, [type]: [...(m[type] || []), n] }))
    setExDraftByType((m) => ({ ...m, [type]: '' }))
  }
  function removeExerciseDraft(type, name) {
    setNewExercisesByType((m) => ({ ...m, [type]: (m[type] || []).filter((x) => x !== name) }))
  }

  function finish() {
    const region = regionName.trim()
    if (!region || !selectedTypes.length) return
    addCustomRegion(region)
    selectedTypes.forEach((t) => { if (!knownTypes.some((x) => x.toLowerCase() === t.toLowerCase())) addCustomType(t) })
    Object.entries(newExercisesByType).forEach(([type, names]) => names.forEach((n) => addCustomExercise(type, n)))
    onSaved?.()
    setSaved(true)
  }

  function addAnother() {
    setStep(1); setRegionName(''); setSelectedTypes([]); setTypeDraft(''); setPendingNewTypes([])
    setNewExercisesByType({}); setExDraftByType({}); setSaved(false)
  }

  if (saved) {
    return (
      <div className="space-y-4 py-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={28} /></div>
        <div>
          <p className="font-bold text-slate-900">"{regionName.trim()}" saved</p>
          <p className="text-sm text-slate-500">It's ready to use in the normal Region → Type → Exercises picker.</p>
        </div>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={addAnother} className="btn-outline">Add another region</button>
          <button type="button" onClick={onClose} className="btn-primary">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${step === n ? 'bg-brand-600 text-white' : step > n ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > n ? <Check size={14} /> : n}
            </div>
            <span className={`text-xs font-semibold ${step === n ? 'text-brand-700' : 'text-slate-400'}`}>{['Region', 'Types', 'Exercises'][n - 1]}</span>
            {n < 3 && <div className={`h-0.5 flex-1 rounded ${step > n ? 'bg-emerald-400' : 'bg-slate-100'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <label className="label text-sm">1. What's the region called?</label>
          <input
            autoFocus className="input" value={regionName} onChange={(e) => setRegionName(e.target.value)} placeholder="e.g. Jaw / TMJ"
            onKeyDown={(e) => { if (e.key === 'Enter' && regionName.trim()) { e.preventDefault(); setStep(2) } }}
          />
          <p className="mt-1 text-xs text-slate-400">This becomes a new option in the Region picker, right alongside the built-in ones.</p>
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="label text-sm">2. Which exercise types apply to {regionName || 'this region'}?</label>
          <p className="mb-2 text-xs text-slate-400">Tick all that apply — pulled from every type already in use — or add a brand new one.</p>
          <div className="flex flex-wrap gap-1.5">
            {allOfferedTypes.map((t) => (
              <label key={t} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selectedTypes.includes(t) ? 'border-brand-600 bg-brand-600 text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:bg-brand-50'}`}>
                <input type="checkbox" className="hidden" checked={selectedTypes.includes(t)} onChange={() => toggleType(t)} />
                {selectedTypes.includes(t) && <Check size={12} />} {t}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input className="input h-9 text-sm" value={typeDraft} onChange={(e) => setTypeDraft(e.target.value)} placeholder="Add your own type…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOwnType() } }} />
            <button type="button" onClick={addOwnType} className="btn-outline shrink-0 text-xs">Add</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <label className="label text-sm">3. Exercises for each type</label>
          <p className="text-xs text-slate-400">Optional — you can also add these later from the normal exercise picker.</p>
          {selectedTypes.map((t) => (
            <div key={t} className="rounded-xl bg-slate-50 p-3">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">{t}</p>
              {getCustomExercises(t).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {getCustomExercises(t).map((ex) => (
                    <span key={ex} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200">{ex} <span className="text-slate-300">· existing</span></span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input className="input h-9 text-sm" value={exDraftByType[t] || ''} onChange={(e) => setExDraftByType((m) => ({ ...m, [t]: e.target.value }))} placeholder={`Add an exercise for ${t}…`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExerciseDraft(t) } }} />
                <button type="button" onClick={() => addExerciseDraft(t)} className="btn-outline shrink-0 text-xs">Add</button>
              </div>
              {(newExercisesByType[t] || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {newExercisesByType[t].map((ex) => (
                    <span key={ex} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-xs font-medium text-brand-700">
                      {ex}
                      <button type="button" onClick={() => removeExerciseDraft(t, ex)} className="grid h-5 w-5 place-items-center rounded-full text-brand-400 hover:bg-white hover:text-red-500"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="btn-ghost disabled:opacity-0">Back</button>
        {step < 3 ? (
          <button
            type="button" onClick={() => setStep((s) => s + 1)}
            disabled={(step === 1 && !regionName.trim()) || (step === 2 && !selectedTypes.length)}
            className="btn-primary disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button type="button" onClick={finish} className="btn-primary"><Save size={16} /> Save region</button>
        )}
      </div>
    </div>
  )
}

export function ManageTaxonomyPanel({ onChanged }) {
  const [regions, setRegions] = useState(() => getCustomRegions())
  const [types, setTypes] = useState(() => getCustomTypes())
  const [regionDraft, setRegionDraft] = useState('')
  const [typeDraft, setTypeDraft] = useState('')
  const [editingRegion, setEditingRegion] = useState(null)
  const [editingType, setEditingType] = useState(null)
  const [expandedType, setExpandedType] = useState('')
  const [exDraft, setExDraft] = useState('')
  const [editingEx, setEditingEx] = useState(null)
  const [manageRegion, setManageRegion] = useState('')
  const [expandedRTType, setExpandedRTType] = useState('')
  const [rtExDraft, setRtExDraft] = useState('')
  const [editingRegionType, setEditingRegionType] = useState(null)
  const [editingRTEx, setEditingRTEx] = useState(null)
  const [, forceTick] = useState(0)

  function refresh() { setRegions(getCustomRegions()); setTypes(getCustomTypes()); onChanged?.() }
  function refreshExercises() { forceTick((t) => t + 1); onChanged?.() }
  function bump() { forceTick((t) => t + 1); onChanged?.() }

  function saveRegionTypeEdit() {
    const { region, old, val } = editingRegionType
    const n = (val || '').trim()
    if (n && n !== old) { updateCustomTypeForRegion(region, old, n); renameRegionTypeExercises(region, old, n) }
    if (expandedRTType === old) setExpandedRTType(n || old)
    setEditingRegionType(null); bump()
  }
  function removeRegionType(region, type) {
    if (!window.confirm(`Delete "${type}" (and its exercises) from ${region}?`)) return
    deleteCustomTypeForRegion(region, type); deleteRegionTypeExercises(region, type)
    if (expandedRTType === type) setExpandedRTType('')
    bump()
  }
  function addRTExercise(region, type) {
    const n = rtExDraft.trim(); if (!n) return
    addCustomExerciseForRegionType(region, type, n); setRtExDraft(''); bump()
  }
  function saveRTExEdit() {
    updateCustomExerciseForRegionType(editingRTEx.region, editingRTEx.type, editingRTEx.old, editingRTEx.val)
    setEditingRTEx(null); bump()
  }
  function removeRTExercise(region, type, name) {
    if (!window.confirm(`Delete exercise "${name}"?`)) return
    deleteCustomExerciseForRegionType(region, type, name); bump()
  }

  function addRegion() { const n = regionDraft.trim(); if (!n) return; addCustomRegion(n); setRegionDraft(''); refresh() }
  function saveRegionEdit() { updateCustomRegion(editingRegion.old, editingRegion.val); setEditingRegion(null); refresh() }
  function removeRegion(r) { if (!window.confirm(`Delete custom region "${r}"? Exercises already saved with this region keep their data.`)) return; deleteCustomRegion(r); refresh() }

  function addType() { const n = typeDraft.trim(); if (!n) return; addCustomType(n); setTypeDraft(''); refresh() }
  function saveTypeEdit() { updateCustomType(editingType.old, editingType.val); setEditingType(null); refresh() }
  function removeType(t) { if (!window.confirm(`Delete custom type "${t}"?`)) return; deleteCustomType(t); if (expandedType === t) setExpandedType(''); refresh() }

  function addExercise() {
    const n = exDraft.trim(); if (!n || !expandedType) return
    addCustomExercise(expandedType, n); setExDraft(''); refreshExercises()
  }
  function saveExEdit() { updateCustomExercise(editingEx.type, editingEx.old, editingEx.val); setEditingEx(null); refreshExercises() }
  function removeExercise(type, name) { if (!window.confirm(`Delete exercise "${name}"?`)) return; deleteCustomExercise(type, name); refreshExercises() }

  return (
    <div className="space-y-5">
      <div>
        <label className="label text-xs">Regions you've added</label>
        <div className="flex gap-2">
          <input className="input" value={regionDraft} onChange={(e) => setRegionDraft(e.target.value)} placeholder="e.g. Jaw / TMJ" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRegion() } }} />
          <button type="button" onClick={addRegion} className="btn-primary shrink-0">Add</button>
        </div>
        {regions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {regions.map((r) => (
              <EditableChip
                key={r} label={r}
                editing={editingRegion?.old === r} editVal={editingRegion?.val ?? ''}
                onStartEdit={() => setEditingRegion({ old: r, val: r })}
                onEditChange={(v) => setEditingRegion({ old: r, val: v })}
                onSaveEdit={saveRegionEdit} onCancelEdit={() => setEditingRegion(null)}
                onDelete={() => removeRegion(r)}
              />
            ))}
          </div>
        ) : <p className="mt-2 text-xs text-slate-400">No custom regions yet — use "Create new region" above.</p>}
      </div>

      <div>
        <label className="label text-xs">Exercise types you've added</label>
        <div className="flex gap-2">
          <input className="input" value={typeDraft} onChange={(e) => setTypeDraft(e.target.value)} placeholder="e.g. Manual Therapy" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addType() } }} />
          <button type="button" onClick={addType} className="btn-primary shrink-0">Add</button>
        </div>
        {types.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {types.map((t) => (
              <EditableChip
                key={t} label={t}
                editing={editingType?.old === t} editVal={editingType?.val ?? ''}
                onStartEdit={() => setEditingType({ old: t, val: t })}
                onEditChange={(v) => setEditingType({ old: t, val: v })}
                onSaveEdit={saveTypeEdit} onCancelEdit={() => setEditingType(null)}
                onDelete={() => removeType(t)}
              />
            ))}
          </div>
        ) : <p className="mt-2 text-xs text-slate-400">No custom types yet.</p>}
      </div>

      {types.length > 0 && (
        <div>
          <label className="label text-xs">Exercises — pick a type to manage its list</label>
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <button key={t} type="button" onClick={() => setExpandedType((v) => (v === t ? '' : t))} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${expandedType === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
            ))}
          </div>
          {expandedType && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3">
              <div className="flex gap-2">
                <input className="input h-9 text-sm" value={exDraft} onChange={(e) => setExDraft(e.target.value)} placeholder={`Exercise for ${expandedType}…`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExercise() } }} />
                <button type="button" onClick={addExercise} className="btn-outline shrink-0 text-xs">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {getCustomExercises(expandedType).map((ex) => (
                  <EditableChip
                    key={ex} label={ex}
                    editing={editingEx?.type === expandedType && editingEx?.old === ex} editVal={editingEx?.val ?? ''}
                    onStartEdit={() => setEditingEx({ type: expandedType, old: ex, val: ex })}
                    onEditChange={(v) => setEditingEx({ type: expandedType, old: ex, val: v })}
                    onSaveEdit={saveExEdit} onCancelEdit={() => setEditingEx(null)}
                    onDelete={() => removeExercise(expandedType, ex)}
                  />
                ))}
                {getCustomExercises(expandedType).length === 0 && <p className="text-xs text-slate-400">No exercises yet for {expandedType}.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <label className="label text-xs">Region-specific types &amp; exercises</label>
        <p className="mb-2 text-xs text-slate-400">Manage the types &amp; exercises you added inline under a specific region.</p>
        {getRegionsWithCustomTypes().length === 0 ? (
          <p className="text-xs text-slate-400">Nothing yet — add a type under a region from the exercise picker's "+ Add type".</p>
        ) : (
          <>
            <select className="input" value={manageRegion} onChange={(e) => { setManageRegion(e.target.value); setExpandedRTType('') }}>
              <option value="">Choose a region…</option>
              {getRegionsWithCustomTypes().map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {manageRegion && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {getCustomTypesForRegion(manageRegion).map((t) => (
                    <EditableChip
                      key={t} label={t}
                      editing={editingRegionType?.region === manageRegion && editingRegionType?.old === t} editVal={editingRegionType?.val ?? ''}
                      onStartEdit={() => setEditingRegionType({ region: manageRegion, old: t, val: t })}
                      onEditChange={(v) => setEditingRegionType({ region: manageRegion, old: t, val: v })}
                      onSaveEdit={saveRegionTypeEdit} onCancelEdit={() => setEditingRegionType(null)}
                      onDelete={() => removeRegionType(manageRegion, t)}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getCustomTypesForRegion(manageRegion).map((t) => (
                    <button key={t} type="button" onClick={() => setExpandedRTType((v) => (v === t ? '' : t))} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${expandedRTType === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t} exercises</button>
                  ))}
                </div>
                {expandedRTType && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex gap-2">
                      <input className="input h-9 text-sm" value={rtExDraft} onChange={(e) => setRtExDraft(e.target.value)} placeholder={`Exercise for ${manageRegion} · ${expandedRTType}…`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRTExercise(manageRegion, expandedRTType) } }} />
                      <button type="button" onClick={() => addRTExercise(manageRegion, expandedRTType)} className="btn-outline shrink-0 text-xs">Add</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getCustomExercisesForRegionType(manageRegion, expandedRTType).map((ex) => (
                        <EditableChip
                          key={ex} label={ex}
                          editing={editingRTEx?.region === manageRegion && editingRTEx?.type === expandedRTType && editingRTEx?.old === ex} editVal={editingRTEx?.val ?? ''}
                          onStartEdit={() => setEditingRTEx({ region: manageRegion, type: expandedRTType, old: ex, val: ex })}
                          onEditChange={(v) => setEditingRTEx({ region: manageRegion, type: expandedRTType, old: ex, val: v })}
                          onSaveEdit={saveRTExEdit} onCancelEdit={() => setEditingRTEx(null)}
                          onDelete={() => removeRTExercise(manageRegion, expandedRTType, ex)}
                        />
                      ))}
                      {getCustomExercisesForRegionType(manageRegion, expandedRTType).length === 0 && <p className="text-xs text-slate-400">No exercises yet for {expandedRTType}.</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function typesForAnyRegion(region, customTypes) {
  const builtIn = REHAB_REGIONS.includes(region) ? typesForRegion(region) : [...REGION_TYPES, ...WHOLE_BODY_TYPES]
  const merged = [...builtIn, ...customTypes.filter((t) => !builtIn.includes(t))]
  const regionScoped = getCustomTypesForRegion(region).filter((t) => !merged.includes(t))
  return [...merged, ...regionScoped]
}

export function exercisesForAnyMerged(region, type) {
  const builtIn = exercisesFor(region, type)
  const merged = [...builtIn, ...getCustomExercises(type).filter((c) => !builtIn.includes(c))]
  const regionScoped = getCustomExercisesForRegionType(region, type).filter((c) => !merged.includes(c))
  return [...merged, ...regionScoped]
}

export function AddExerciseWidget({ existingNames, onAdd }) {
  const favSets = useFavorites('rehab_sets')
  const favReps = useFavorites('rehab_reps')
  const favHold = useFavorites('rehab_hold')
  const favResistance = useFavorites('rehab_resistance')
  const favFrequency = useFavorites('rehab_frequency')
  const favRest = useFavorites('rehab_rest')
  const { isFav: isFavRegion, toggle: toggleFavRegion, sortWithFavs: sortRegions } = useFavorites('rehab_region')
  const { isFav: isFavType, toggle: toggleFavType, sortWithFavs: sortTypes } = useFavorites('rehab_type')
  const { isFav: isFavEx, toggle: toggleFavEx, sortWithFavs: sortEx } = useFavorites('rehab_exercise')

  const [selectedRegions, setSelectedRegions] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [checked, setChecked] = useState([])
  const [customRegions, setCustomRegions] = useState(() => getCustomRegions())
  const [customTypes, setCustomTypes] = useState(() => getCustomTypes())
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [typeDraft, setTypeDraft] = useState('')
  const [typeScope, setTypeScope] = useState('all')
  const [exDraft, setExDraft] = useState({})
  const [, forceTick] = useState(0)

  const regionOptions = sortRegions([...REHAB_REGIONS, ...customRegions.filter((r) => !REHAB_REGIONS.includes(r))])
  const typeOptions = sortTypes([...new Set(selectedRegions.flatMap((r) => typesForAnyRegion(r, customTypes)))])

  function toggleRegion(r) {
    setSelectedRegions((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))
  }
  function toggleType(t) {
    setSelectedTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))
  }
  function toggleExercise(region, type, name) {
    setChecked((c) => {
      const i = c.findIndex((e) => e.region === region && e.type === type && e.name === name)
      return i >= 0 ? c.filter((_, idx) => idx !== i) : [...c, { region, type, name }]
    })
  }
  const isChecked = (region, type, name) => checked.some((e) => e.region === region && e.type === type && e.name === name)

  function refreshCustom() { setCustomRegions(getCustomRegions()); setCustomTypes(getCustomTypes()); forceTick((t) => t + 1) }

  function addTypeInline() {
    const n = typeDraft.trim(); if (!n || !selectedRegions.length) return
    const targets = typeScope === 'all' || !selectedRegions.includes(typeScope) ? selectedRegions : [typeScope]
    targets.forEach((r) => addCustomTypeForRegion(r, n))
    setSelectedTypes((ts) => (ts.some((x) => x.toLowerCase() === n.toLowerCase()) ? ts : [...ts, n]))
    setTypeDraft(''); forceTick((t) => t + 1)
  }

  function addExerciseInline(region, type) {
    const key = `${region}|${type}`
    const n = (exDraft[key] || '').trim(); if (!n) return
    addCustomExerciseForRegionType(region, type, n)
    setChecked((c) => (c.some((e) => e.region === region && e.type === type && e.name === n) ? c : [...c, { region, type, name: n }]))
    setExDraft((d) => ({ ...d, [key]: '' })); forceTick((t) => t + 1)
  }

  const [editRegion, setEditRegion] = useState(null)
  const [editType, setEditType] = useState(null)
  const [editEx, setEditEx] = useState(null)

  const isCustomRegion = (r) => !REHAB_REGIONS.includes(r)
  const isCustomType = (t) => !BUILTIN_TYPES.includes(t)
  const isCustomExercise = (region, type, name) => !exercisesFor(region, type).includes(name)

  function saveRegionRename() {
    const { old, val } = editRegion; const n = (val || '').trim()
    if (n && n !== old) { updateCustomRegion(old, n); setSelectedRegions((rs) => rs.map((x) => (x === old ? n : x))) }
    setEditRegion(null); refreshCustom()
  }
  function deleteRegion(r) {
    if (!window.confirm(`Delete your custom region "${r}"?`)) return
    deleteCustomRegion(r); setSelectedRegions((rs) => rs.filter((x) => x !== r)); refreshCustom()
  }

  function saveTypeRename() {
    const { old, val } = editType; const n = (val || '').trim()
    if (n && n !== old) {
      if (getCustomTypes().includes(old)) updateCustomType(old, n)
      selectedRegions.forEach((r) => {
        if (getCustomTypesForRegion(r).includes(old)) { updateCustomTypeForRegion(r, old, n); renameRegionTypeExercises(r, old, n) }
      })
      setSelectedTypes((ts) => ts.map((x) => (x === old ? n : x)))
    }
    setEditType(null); refreshCustom()
  }
  function deleteType(t) {
    if (!window.confirm(`Delete your custom type "${t}" (and its exercises)?`)) return
    if (getCustomTypes().includes(t)) deleteCustomType(t)
    selectedRegions.forEach((r) => {
      if (getCustomTypesForRegion(r).includes(t)) { deleteCustomTypeForRegion(r, t); deleteRegionTypeExercises(r, t) }
    })
    setSelectedTypes((ts) => ts.filter((x) => x !== t)); refreshCustom()
  }

  function saveExRename() {
    const { region, type, old, val } = editEx; const n = (val || '').trim()
    if (n && n !== old) {
      if (getCustomExercises(type).includes(old)) updateCustomExercise(type, old, n)
      if (getCustomExercisesForRegionType(region, type).includes(old)) updateCustomExerciseForRegionType(region, type, old, n)
      setChecked((c) => c.map((e) => (e.region === region && e.type === type && e.name === old ? { ...e, name: n } : e)))
    }
    setEditEx(null); forceTick((t) => t + 1)
  }
  function deleteEx(region, type, name) {
    if (!window.confirm(`Delete your custom exercise "${name}"?`)) return
    if (getCustomExercises(type).includes(name)) deleteCustomExercise(type, name)
    if (getCustomExercisesForRegionType(region, type).includes(name)) deleteCustomExerciseForRegionType(region, type, name)
    setChecked((c) => c.filter((e) => !(e.region === region && e.type === type && e.name === name))); forceTick((t) => t + 1)
  }

  const groups = selectedRegions.flatMap((region) =>
    selectedTypes.filter((type) => typesForAnyRegion(region, customTypes).includes(type)).map((type) => ({ region, type }))
  )

  function addChecked() {
    if (!checked.length) return
    const overrides = {}
    if (favSets.latest) overrides.sets = favSets.latest
    if (favReps.latest) overrides.reps = favReps.latest
    if (favHold.latest) overrides.hold = favHold.latest
    if (favResistance.latest) overrides.resistance = favResistance.latest
    if (favFrequency.latest) overrides.frequency = favFrequency.latest
    if (favRest.latest) overrides.rest = favRest.latest
    onAdd(checked.map(({ region, type, name }) => ({ ...blankPrescription(region, type, name), ...overrides })))
    setChecked([])
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-700"><Plus size={14} /> Add exercise — pick as many as you need</p>
        <button type="button" onClick={() => setCustomModalOpen(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50">
          <Wand2 size={12} /> Add your own (Region / Type / Exercise)
        </button>
      </div>

      <div>
        <label className="label flex items-center gap-1 text-xs"><MapPin size={12} /> 1. Region(s) — tap all that apply</label>
        <div className="flex flex-wrap items-center gap-1.5">
          {regionOptions.map((r) => (
            <ManageableChip
              key={r} label={r} active={selectedRegions.includes(r)} fav={isFavRegion(r)} custom={isCustomRegion(r)}
              editing={editRegion?.old === r} editVal={editRegion?.val ?? ''}
              onToggleFav={() => toggleFavRegion(r)} onClick={() => toggleRegion(r)}
              onStartEdit={() => setEditRegion({ old: r, val: r })} onEditChange={(v) => setEditRegion({ old: r, val: v })}
              onSaveEdit={saveRegionRename} onCancelEdit={() => setEditRegion(null)} onDelete={() => deleteRegion(r)}
            />
          ))}
        </div>
      </div>

      {selectedRegions.length > 0 && (
        <div>
          <label className="label flex items-center gap-1 text-xs"><Layers size={12} /> 2. Exercise type(s) — tap all that apply</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {typeOptions.map((t) => (
              <ManageableChip
                key={t} label={t} active={selectedTypes.includes(t)} fav={isFavType(t)} custom={isCustomType(t)}
                editing={editType?.old === t} editVal={editType?.val ?? ''}
                onToggleFav={() => toggleFavType(t)} onClick={() => toggleType(t)}
                onStartEdit={() => setEditType({ old: t, val: t })} onEditChange={(v) => setEditType({ old: t, val: v })}
                onSaveEdit={saveTypeRename} onCancelEdit={() => setEditType(null)} onDelete={() => deleteType(t)}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <input
              className="input h-8 max-w-[220px] text-xs" value={typeDraft} onChange={(e) => setTypeDraft(e.target.value)}
              placeholder={selectedRegions.length > 1 ? '+ Add your own type…' : `+ Add a type for ${selectedRegions[0]}…`}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTypeInline() } }}
            />
            {selectedRegions.length > 1 && (
              <select
                className="h-8 shrink-0 rounded-lg border border-slate-200 bg-white pl-2.5 pr-7 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                value={selectedRegions.includes(typeScope) ? typeScope : 'all'}
                onChange={(e) => setTypeScope(e.target.value)} title="Which region(s) should get this type?"
              >
                <option value="all">for all {selectedRegions.length} selected regions</option>
                {selectedRegions.map((r) => <option key={r} value={r}>for {r} only</option>)}
              </select>
            )}
            <button type="button" onClick={addTypeInline} disabled={!typeDraft.trim()} className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-300 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-40"><Plus size={12} /> Add type</button>
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-3">
          <label className="label flex items-center gap-1 text-xs"><ListChecks size={12} /> 3. Exercises — tap all that apply</label>
          {groups.map(({ region, type }) => {
            const builtIn = exercisesFor(region, type)
            const custom = getCustomExercises(type)
            const rtCustom = getCustomExercisesForRegionType(region, type)
            const exercises = sortEx([...builtIn, ...custom.filter((c) => !builtIn.includes(c)), ...rtCustom.filter((c) => !builtIn.includes(c) && !custom.includes(c))])
            const key = `${region}|${type}`
            return (
              <div key={key} className="rounded-xl bg-white/60 p-2.5 ring-1 ring-brand-100">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-500">{region} · {type}</p>
                {exercises.length === 0 ? (
                  <p className="mb-2 text-xs text-slate-400">No exercises yet for this combination — add one below.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {exercises.map((name) => (
                      <ManageableChip
                        key={name}
                        label={name + (type === 'Balance' && BALANCE_LEVEL[name] ? ` (${BALANCE_LEVEL[name]})` : '')}
                        active={isChecked(region, type, name)}
                        fav={isFavEx(name)}
                        disabled={existingNames.includes(name)}
                        custom={isCustomExercise(region, type, name)}
                        editing={editEx?.region === region && editEx?.type === type && editEx?.old === name}
                        editVal={editEx?.val ?? ''}
                        onToggleFav={() => toggleFavEx(name)}
                        onClick={() => toggleExercise(region, type, name)}
                        onStartEdit={() => setEditEx({ region, type, old: name, val: name })}
                        onEditChange={(v) => setEditEx({ region, type, old: name, val: v })}
                        onSaveEdit={saveExRename} onCancelEdit={() => setEditEx(null)}
                        onDelete={() => deleteEx(region, type, name)}
                      />
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    className="input h-8 max-w-[220px] text-xs" value={exDraft[key] || ''} onChange={(e) => setExDraft((d) => ({ ...d, [key]: e.target.value }))}
                    placeholder={`+ Add exercise for ${type}…`}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExerciseInline(region, type) } }}
                  />
                  <button type="button" onClick={() => addExerciseInline(region, type)} disabled={!(exDraft[key] || '').trim()} className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-300 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-40"><Plus size={12} /> Add</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {checked.length > 0 && (
        <button type="button" onClick={addChecked} className="btn-primary text-sm">
          <Plus size={15} /> Add {checked.length} exercise{checked.length > 1 ? 's' : ''}
        </button>
      )}

      {customModalOpen && (
        <CustomTaxonomyModal onChanged={refreshCustom} onClose={() => { refreshCustom(); setCustomModalOpen(false) }} />
      )}
    </div>
  )
}

export function ExerciseCard({ ex, onChange, onRemove, hideDone }) {
  const set = (k) => (v) => onChange({ ...ex, [k]: v })
  const toggleProg = (p) => onChange({ ...ex, progression: ex.progression.includes(p) ? ex.progression.filter((x) => x !== p) : [...ex.progression, p] })
  const toggleDone = () => onChange({ ...ex, done: !ex.done })
  const { isFav: isFavProg, toggle: toggleFavProg, sortWithFavs: sortProg } = useFavorites('rehab_progression')
  const [changing, setChanging] = useState(false)
  const [customRegions] = useState(() => getCustomRegions())
  const [customTypes] = useState(() => getCustomTypes())

  const regionOptions = [...REHAB_REGIONS, ...customRegions.filter((r) => !REHAB_REGIONS.includes(r))]
  const typeOptions = typesForAnyRegion(ex.region, customTypes)
  const nameOptions = exercisesForAnyMerged(ex.region, ex.type)

  function changeRegion(r) {
    const nextTypes = typesForAnyRegion(r, customTypes)
    const keepType = nextTypes.includes(ex.type) ? ex.type : ''
    const keepName = keepType && exercisesForAnyMerged(r, keepType).includes(ex.name) ? ex.name : ''
    onChange({ ...ex, region: r, type: keepType, name: keepName })
  }
  function changeType(t) {
    const keepName = exercisesForAnyMerged(ex.region, t).includes(ex.name) ? ex.name : ''
    onChange({ ...ex, type: t, name: keepName })
  }

  return (
    <div className={`rounded-2xl border-2 p-3.5 transition ${ex.done ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        {changing ? (
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
            <FavSelect favKey="rehab_region" value={ex.region} options={regionOptions} onChange={changeRegion} placeholder="Region" />
            <FavSelect favKey="rehab_type" value={ex.type} options={typeOptions} onChange={changeType} placeholder="Type" />
            <FavSelect favKey="rehab_exercise_pick" value={ex.name} options={nameOptions} onChange={set('name')} placeholder="Exercise" />
          </div>
        ) : (
          <div>
            <p className="font-bold text-slate-900">{ex.name}</p>
            <p className="text-xs text-slate-400">{ex.region} · {ex.type}</p>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setChanging((v) => !v)} title="Change exercise" className={`grid h-7 w-7 place-items-center rounded-full ${changing ? 'bg-brand-100 text-brand-600' : 'text-slate-400 hover:bg-brand-50 hover:text-brand-600'}`}><Pencil size={14} /></button>
          <button type="button" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500"><X size={16} /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Sets"><FavSelect favKey="rehab_sets" value={ex.sets} options={SETS_OPTIONS.map(String)} onChange={set('sets')} /></Field>
        <Field label="Reps"><FavSelect favKey="rehab_reps" value={ex.reps} options={REPS_OPTIONS.map(String)} onChange={set('reps')} /></Field>
        <Field label="Hold"><FavSelect favKey="rehab_hold" value={ex.hold} options={HOLD_OPTIONS} onChange={set('hold')} /></Field>
        <Field label="Resistance"><FavSelect favKey="rehab_resistance" value={ex.resistance} options={RESISTANCE_OPTIONS} onChange={set('resistance')} /></Field>
        <Field label="Frequency"><FavSelect favKey="rehab_frequency" value={ex.frequency} options={FREQUENCY_OPTIONS} onChange={set('frequency')} /></Field>
        <Field label="Rest"><FavSelect favKey="rehab_rest" value={ex.rest} options={REST_OPTIONS} onChange={set('rest')} /></Field>
      </div>
      <div className="mt-2">
        <label className="label text-[11px]">Notes</label>
        <input className="input" value={ex.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="Optional notes…" />
      </div>
      <div className="mt-2">
        <p className="label text-[11px]">Progression (optional)</p>
        <div className="flex flex-wrap gap-1.5">
          {sortProg(PROGRESSION_OPTIONS).map((p) => (
            <StarChip key={p} label={p} active={ex.progression.includes(p)} fav={isFavProg(p)} onToggleFav={() => toggleFavProg(p)} onClick={() => toggleProg(p)} />
          ))}
        </div>
      </div>

      {!hideDone && (
        <button
          type="button" onClick={toggleDone}
          className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-extrabold uppercase tracking-wide transition ${
            ex.done ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
          }`}
        >
          {ex.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          {ex.done ? 'Completed' : 'Mark as Completed'}
        </button>
      )}
    </div>
  )
}

export function ReorderableRow({ children, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className="flex items-stretch gap-1"
    >
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5">
        <button type="button" onClick={onMoveUp} disabled={!canMoveUp} title="Move up" className="grid h-6 w-6 place-items-center rounded text-slate-900 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-900"><ChevronUp size={15} strokeWidth={2.75} /></button>
        <span className="grid h-6 w-6 cursor-grab place-items-center text-slate-900 active:cursor-grabbing" title="Drag to reorder"><GripVertical size={15} strokeWidth={2.75} /></span>
        <button type="button" onClick={onMoveDown} disabled={!canMoveDown} title="Move down" className="grid h-6 w-6 place-items-center rounded text-slate-900 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-900"><ChevronDown size={15} strokeWidth={2.75} /></button>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function DayEditor({ day, allDays, onCopyFromDay, onOpenCrossPatientCopy, onApplyFullTemplate, onChangeDay }) {
  const exercises = day.exercises || []
  const main = exercises.filter((e) => e.type !== 'Stretching')
  const stretches = exercises.filter((e) => e.type === 'Stretching')
  const [copySource, setCopySource] = useState('')
  const [templates, setTemplates] = useState([])
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal] = useState('')
  const [dragFrom, setDragFrom] = useState(null)

  useEffect(() => watchRehabTemplates(setTemplates), [])

  function updateExercise(idx, updated) {
    const next = [...exercises]; next[idx] = updated
    const allDone = next.length > 0 && next.every((e) => e.done)
    onChangeDay({ ...day, exercises: next, completed: allDone ? true : day.completed })
  }
  function removeExercise(idx) {
    onChangeDay({ ...day, exercises: exercises.filter((_, i) => i !== idx) })
  }
  function addExercises(newOnes) {
    onChangeDay({ ...day, exercises: [...exercises, ...newOnes] })
  }

  function reorderExercises(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx == null || toIdx == null) return
    const isStretch = exercises[fromIdx]?.type === 'Stretching'
    const sectionIdx = []
    exercises.forEach((e, i) => { if ((e.type === 'Stretching') === isStretch) sectionIdx.push(i) })
    const fromPos = sectionIdx.indexOf(fromIdx)
    const toPos = sectionIdx.indexOf(toIdx)
    if (fromPos === -1 || toPos === -1) return
    const order = [...sectionIdx]
    const [moved] = order.splice(fromPos, 1)
    order.splice(toPos, 0, moved)
    const next = [...exercises]
    sectionIdx.forEach((slot, k) => { next[slot] = exercises[order[k]] })
    onChangeDay({ ...day, exercises: next })
  }
  function moveExercise(idx, direction) {
    const isStretch = exercises[idx]?.type === 'Stretching'
    const sectionIdx = []
    exercises.forEach((e, i) => { if ((e.type === 'Stretching') === isStretch) sectionIdx.push(i) })
    const pos = sectionIdx.indexOf(idx)
    const targetPos = pos + direction
    if (targetPos < 0 || targetPos >= sectionIdx.length) return
    reorderExercises(idx, sectionIdx[targetPos])
  }

  function copyFromPicked() {
    if (!copySource) return
    onCopyFromDay(Number(copySource))
    setCopySource('')
  }

  async function saveAsTemplate() {
    const n = templateName.trim(); if (!n || !exercises.length) return
    try { await addRehabTemplate(n, [{ day: 1, exercises: exercises.map((e) => ({ ...e, done: false, notes: '', progression: [] })) }]) } catch (_) {}
    setTemplateName(''); setSavingTemplate(false)
  }
  async function renameTemplate(id) {
    const n = renameVal.trim(); if (!n) return
    try { await updateRehabTemplate(id, { name: n }) } catch (_) {}
    setRenamingId(null)
  }
  async function removeTemplate(id) {
    if (!window.confirm('Delete this template?')) return
    try { await deleteRehabTemplate(id) } catch (_) {}
  }
  function applyTemplateDay1(t) {
    const first = templateDays(t)[0]
    if (first) addExercises((first.exercises || []).map((e) => ({ ...e, done: false })))
  }

  const otherDaysWithExercises = (allDays || []).filter((d) => d.day !== day.day && (d.exercises || []).length > 0)
  const existingNames = exercises.map((e) => e.name)
  const doneCount = exercises.filter((e) => e.done).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40"><label className="label text-xs">Date</label><DateField value={day.date} onChange={(iso) => onChangeDay({ ...day, date: iso })} /></div>
        <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" checked={!!day.home} onChange={(e) => onChangeDay({ ...day, home: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Home program
        </label>
        <label className="mb-2.5 flex items-center gap-2 text-sm font-bold text-emerald-700">
          <input type="checkbox" checked={!!day.completed} onChange={(e) => onChangeDay({ ...day, completed: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
          Session completed
        </label>
        {exercises.length > 0 && <span className="mb-2.5 text-xs text-slate-400">{doneCount}/{exercises.length} exercises marked done</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-2.5">
        <Copy size={14} className="shrink-0 text-slate-400" />
        {/* Always shown, even before there's anything to copy — hiding it made
            the feature look missing on a plan whose other days are still empty. */}
        <select
          className="input h-9 w-auto text-xs disabled:cursor-not-allowed disabled:opacity-60"
          value={copySource} disabled={otherDaysWithExercises.length === 0}
          title={otherDaysWithExercises.length === 0 ? 'Add exercises to another day first, then you can copy them here' : 'Copy every exercise from another day of this plan'}
          onChange={(e) => setCopySource(e.target.value)}
        >
          <option value="">{otherDaysWithExercises.length === 0 ? 'Copy from day… (no other day has exercises yet)' : 'Copy from day…'}</option>
          {otherDaysWithExercises.map((d) => <option key={d.day} value={d.day}>Day {d.day} ({d.exercises.length} exercises)</option>)}
        </select>
        <button type="button" onClick={copyFromPicked} disabled={!copySource} className="btn-outline px-2.5 py-1.5 text-xs disabled:opacity-40">Copy</button>
        <button type="button" onClick={onOpenCrossPatientCopy} className="btn-outline px-2.5 py-1.5 text-xs">Copy from another patient</button>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {savingTemplate ? (
            <>
              <input autoFocus className="input h-9 w-40 text-xs" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveAsTemplate() } }} />
              <button type="button" onClick={saveAsTemplate} className="btn-outline px-2.5 py-1.5 text-xs">Save</button>
              <button type="button" onClick={() => setSavingTemplate(false)} className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={14} /></button>
            </>
          ) : (
            exercises.length > 0 && <button type="button" onClick={() => setSavingTemplate(true)} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><LayoutTemplate size={13} /> Save this day as template</button>
          )}
        </div>
      </div>
      {templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Templates:</span>
          {templates.map((t) => {
            const dayCount = templateDays(t).length
            return renamingId === t.id ? (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-brand-400 bg-white py-1 pl-2.5 pr-1">
                <input autoFocus className="w-32 border-0 bg-transparent text-xs focus:outline-none" value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); renameTemplate(t.id) } }} />
                <button type="button" onClick={() => renameTemplate(t.id)} className="grid h-6 w-6 place-items-center rounded-full text-brand-600 hover:bg-brand-50"><Check size={13} /></button>
                <button type="button" onClick={() => setRenamingId(null)} className="grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={13} /></button>
              </span>
            ) : (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-xs">
                <button type="button" onClick={() => applyTemplateDay1(t)} title={dayCount > 1 ? `Add Day 1 of ${dayCount} to this day` : 'Add to this day'} className="font-medium text-slate-700 hover:text-brand-600">
                  {t.name} <span className="text-slate-400">({dayCount > 1 ? `${dayCount} days, ` : ''}{templateExerciseCount(t)} ex)</span>
                </button>
                {dayCount > 1 && onApplyFullTemplate && (
                  <button type="button" onClick={() => onApplyFullTemplate(t)} title={`Apply all ${dayCount} days to this plan from Day 1`} className="grid h-5 w-5 place-items-center rounded-full text-slate-300 hover:bg-brand-50 hover:text-brand-600"><LayoutTemplate size={11} /></button>
                )}
                <button type="button" onClick={() => { setRenamingId(t.id); setRenameVal(t.name) }} title="Rename" className="grid h-5 w-5 place-items-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-brand-600"><Pencil size={11} /></button>
                <button type="button" onClick={() => removeTemplate(t.id)} title="Delete" className="grid h-5 w-5 place-items-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={11} /></button>
              </span>
            )
          })}
        </div>
      )}

      <AddExerciseWidget existingNames={existingNames} onAdd={addExercises} />

      {exercises.length === 0 && <p className="text-sm text-slate-400">No exercises added for this day yet.</p>}

      {main.length > 0 && (
        <div className="space-y-2">
          {main.map((ex, visualIdx) => {
            const idx = exercises.indexOf(ex)
            return (
              <ReorderableRow
                key={idx}
                canMoveUp={visualIdx > 0} canMoveDown={visualIdx < main.length - 1}
                onMoveUp={() => moveExercise(idx, -1)} onMoveDown={() => moveExercise(idx, 1)}
                onDragStart={() => setDragFrom(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); reorderExercises(dragFrom, idx); setDragFrom(null) }}
                onDragEnd={() => setDragFrom(null)}
              >
                <ExerciseCard ex={ex} onChange={(u) => updateExercise(idx, u)} onRemove={() => removeExercise(idx)} />
              </ReorderableRow>
            )
          })}
        </div>
      )}

      {stretches.length > 0 && (
        <div className="border-t-2 border-dashed border-slate-200 pt-3">
          <p className="mb-2 text-sm font-bold text-brand-700">Stretches</p>
          <div className="space-y-2">
            {stretches.map((ex, visualIdx) => {
              const idx = exercises.indexOf(ex)
              return (
                <ReorderableRow
                  key={idx}
                  canMoveUp={visualIdx > 0} canMoveDown={visualIdx < stretches.length - 1}
                  onMoveUp={() => moveExercise(idx, -1)} onMoveDown={() => moveExercise(idx, 1)}
                  onDragStart={() => setDragFrom(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); reorderExercises(dragFrom, idx); setDragFrom(null) }}
                  onDragEnd={() => setDragFrom(null)}
                >
                  <ExerciseCard ex={ex} onChange={(u) => updateExercise(idx, u)} onRemove={() => removeExercise(idx)} />
                </ReorderableRow>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function PlanTips({ days, activeDayData }) {
  const total = days.length
  const pending = days.filter((d) => !d.completed)
  const tips = []

  if (total > 0 && pending.length === 0) {
    tips.push({ tone: 'success', text: `All ${total} session${total > 1 ? 's' : ''} are completed — this plan is fully done.` })
  } else if (pending.length > 0) {
    tips.push({ tone: 'info', text: `${pending.length} of ${total} session${total > 1 ? 's' : ''} still pending: ${pending.map((d) => `Day ${d.day}`).join(', ')}.` })
  }

  if (activeDayData) {
    const exs = activeDayData.exercises || []
    if (exs.length === 0) {
      tips.push({ tone: 'warn', text: `Day ${activeDayData.day} has no exercises prescribed yet — add some above before marking it complete.` })
    } else {
      const undone = exs.filter((e) => !e.done)
      if (undone.length > 0) {
        tips.push({ tone: 'warn', text: `Day ${activeDayData.day}: ${undone.length} exercise${undone.length > 1 ? 's' : ''} not completed yet — ${undone.map((e) => e.name).join(', ')}.` })
      }
    }
  }

  if (!tips.length) return null

  const toneCls = {
    success: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    info: 'border-brand-500 bg-brand-50 text-brand-800',
    warn: 'border-amber-500 bg-amber-50 text-amber-800',
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-400"><Lightbulb size={13} /> Tips &amp; progress</p>
      {tips.map((t, i) => (
        <div key={i} className={`flex items-start gap-2.5 rounded-xl border-l-[6px] px-3.5 py-3 text-sm font-semibold leading-snug sm:text-base ${toneCls[t.tone]}`}>
          <Lightbulb size={18} className="mt-0.5 shrink-0" />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

export function CopyFromPatientModal({ clients, currentClientId, onApply, onClose }) {
  const [q, setQ] = useState('')
  const [pickedClientId, setPickedClientId] = useState('')
  const [plans, setPlans] = useState([])
  const [pickedPlanId, setPickedPlanId] = useState('')
  const [pickedDays, setPickedDays] = useState([])

  useEffect(() => {
    if (!pickedClientId) { setPlans([]); return }
    return watchRehabPlans(pickedClientId, setPlans)
  }, [pickedClientId])

  const otherClients = clients
    .filter((c) => c.id !== currentClientId)
    .filter((c) => !q || [c.name, c.clientId, c.phone].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20)
  const pickedPlan = plans.find((p) => p.id === pickedPlanId)
  const days = pickedPlan?.days || []
  const allDaysPicked = days.length > 0 && pickedDays.length === days.length

  function pickClient(id) { setPickedClientId(id); setPickedPlanId(''); setPickedDays([]) }
  function pickPlan(id) { setPickedPlanId(id); setPickedDays([]) }
  function toggleDay(dayNum) { setPickedDays((ds) => (ds.includes(dayNum) ? ds.filter((x) => x !== dayNum) : [...ds, dayNum])) }
  function toggleAllDays() { setPickedDays(allDaysPicked ? [] : days.map((d) => d.day)) }

  function apply() {
    const picked = days
      .filter((d) => pickedDays.includes(d.day))
      .sort((a, b) => a.day - b.day)
      .flatMap((d) => (d.exercises || []).map((e) => ({ ...e, done: false, progression: [...e.progression] })))
    if (!picked.length) return
    onApply(picked)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg animate-pop-in space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Copy from another patient</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div>
          <label className="label text-xs">Patient</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={15} />
            <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or ID…" />
          </div>
          <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-200">
            {otherClients.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No matches.</p>
            ) : otherClients.map((c) => (
              <button
                key={c.id} type="button" onClick={() => pickClient(c.id)}
                className={`flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-brand-50 ${pickedClientId === c.id ? 'bg-brand-50 font-semibold text-brand-700' : ''}`}
              >
                <span>{c.name}</span><span className="text-xs text-slate-400">{c.clientId}</span>
              </button>
            ))}
          </div>
        </div>

        {pickedClientId && (
          <div>
            <label className="label text-xs">Plan</label>
            {plans.length === 0 ? (
              <p className="text-sm text-slate-400">This patient has no rehab plans yet.</p>
            ) : (
              <div className="space-y-1">
                {plans.map((p) => (
                  <button
                    key={p.id} type="button" onClick={() => pickPlan(p.id)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${pickedPlanId === p.id ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {fmtDate(p.startDate)} · {p.totalDays} day{p.totalDays > 1 ? 's' : ''}{p.bill?.service ? ` · ${p.bill.service}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {pickedPlan && (
          <div>
            <div className="flex items-center justify-between">
              <label className="label text-xs">Day(s) — tick all you want to bring over</label>
              {days.length > 0 && (
                <button type="button" onClick={toggleAllDays} className="text-xs font-semibold text-brand-600 hover:underline">{allDaysPicked ? 'Clear all' : 'Select all'}</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <button
                  key={d.day} type="button" onClick={() => toggleDay(d.day)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${pickedDays.includes(d.day) ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Day {d.day} ({(d.exercises || []).length})
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">Tick one, several, or all days — their exercises are combined into the current day here.</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={apply} disabled={!pickedDays.length} className="btn-primary disabled:opacity-40"><Copy size={16} /> Copy {pickedDays.length > 1 ? `${pickedDays.length} days'` : 'exercises'} here</button>
        </div>
      </div>
    </div>
  )
}

const blankTemplateDay = (n) => ({ day: n, exercises: [] })
const blankTemplateForm = () => ({ id: null, name: '', days: [blankTemplateDay(1)] })

export function RehabTemplateManager({ onClose }) {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState(null)
  const [activeDay, setActiveDay] = useState(1)
  const [daysText, setDaysText] = useState('1')
  const [copySource, setCopySource] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => watchRehabTemplates(setTemplates), [])

  function startNew() {
    setForm(blankTemplateForm()); setActiveDay(1); setDaysText('1'); setCopySource(''); setError('')
  }
  function startEdit(t) {
    const days = templateDays(t).map((d) => ({ day: d.day, exercises: (d.exercises || []).map((e) => ({ ...e, progression: [...(e.progression || [])] })) }))
    const safeDays = days.length ? days : [blankTemplateDay(1)]
    setForm({ id: t.id, name: t.name, days: safeDays }); setActiveDay(1); setDaysText(String(safeDays.length)); setCopySource(''); setError('')
  }
  async function removeTemplate(t) {
    if (!window.confirm(`Delete template "${t.name}"? This cannot be undone.`)) return
    try { await deleteRehabTemplate(t.id) } catch (_) {}
  }

  function setTotalDays(raw) {
    const total = Math.max(1, Math.min(MAX_DAYS, Number(raw) || 1))
    setForm((f) => ({ ...f, days: Array.from({ length: total }, (_, i) => f.days[i] || blankTemplateDay(i + 1)) }))
  }
  function handleDaysInput(e) {
    const digits = onlyDigits(e.target.value).slice(0, 2)
    setDaysText(digits)
    if (digits) setTotalDays(digits)
  }
  function handleDaysBlur() {
    if (!daysText) setDaysText(String(form.days.length))
  }

  useEffect(() => { if (form && !form.days.find((d) => d.day === activeDay)) setActiveDay(form.days[0]?.day || 1) }, [form, activeDay])

  function updateDay(dayNum, updated) {
    setForm((f) => ({ ...f, days: f.days.map((d) => (d.day === dayNum ? updated : d)) }))
  }

  const activeDayData = form ? (form.days.find((d) => d.day === activeDay) || form.days[0]) : null

  function copyFromDay(sourceDayNum) {
    const src = form.days.find((d) => d.day === Number(sourceDayNum))
    if (!src || !activeDayData) return
    if (activeDayData.exercises?.length > 0 && !window.confirm(`Replace Day ${activeDayData.day}'s current exercises with Day ${sourceDayNum}'s?`)) return
    updateDay(activeDayData.day, { ...activeDayData, exercises: src.exercises.map((e) => ({ ...e, progression: [...(e.progression || [])] })) })
    setCopySource('')
  }

  async function save() {
    const name = form.name.trim()
    if (!name) { setError('Please give this template a name.'); return }
    if (!form.days.some((d) => (d.exercises || []).length > 0)) { setError('Add at least one exercise to at least one day.'); return }
    setBusy(true); setError('')
    try {
      const days = form.days.map((d) => ({ day: d.day, exercises: (d.exercises || []).map((e) => ({ ...e, done: false })) }))
      if (form.id) await updateRehabTemplate(form.id, { name, days })
      else await addRehabTemplate(name, days)
      setForm(null)
    } catch (err) {
      console.error('save rehab template failed:', err)
      setError('Could not save the template. Please try again.')
    }
    setBusy(false)
  }

  if (!form) {
    return (
      <div className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><LayoutTemplate size={22} /></div>
            <div>
              <h2 className="font-bold text-slate-900">Rehab templates</h2>
              <p className="text-sm text-slate-500">Build reusable, multi-day exercise plans — apply them to any patient later.</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={startNew} className="btn-primary"><Plus size={16} /> New template</button>
            {onClose && <button type="button" onClick={onClose} className="btn-ghost">Back</button>}
          </div>
        </div>

        {templates.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No templates yet. Create one above.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {templates.map((t) => {
              const dayCount = templateDays(t).length
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium text-slate-700">
                    {t.name} <span className="text-xs font-normal text-slate-400">({dayCount} day{dayCount > 1 ? 's' : ''}, {templateExerciseCount(t)} exercises)</span>
                  </span>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => startEdit(t)} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><Pencil size={13} /> Edit</button>
                    <button type="button" onClick={() => removeTemplate(t)} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"><Trash2 size={13} /> Delete</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  const existingNames = (activeDayData?.exercises || []).map((e) => e.name)
  const otherDaysWithExercises = form.days.filter((d) => d.day !== activeDay && (d.exercises || []).length > 0)

  return (
    <div className="card space-y-4 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">{form.id ? 'Edit template' : 'New template'}</h2>
        <button type="button" onClick={() => setForm(null)} className="text-sm font-medium text-brand-600 hover:underline">Back to templates</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label text-sm">Template name</label>
          <input autoFocus className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Post-ACL Week 1" />
        </div>
        <div>
          <label className="label text-sm">No. of days</label>
          <input className="input" inputMode="numeric" value={daysText} onChange={handleDaysInput} onBlur={handleDaysBlur} placeholder="Enter the days" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap gap-2">
          {form.days.map((d) => (
            <button
              key={d.day} type="button" onClick={() => setActiveDay(d.day)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${activeDay === d.day ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Day {d.day}
              {d.exercises?.length ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeDay === d.day ? 'bg-white/25' : 'bg-slate-200'}`}>{d.exercises.length} ex</span> : null}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">{form.days.length} day{form.days.length > 1 ? 's' : ''} total</span>
      </div>

      {activeDayData && (
        <div className="space-y-4">
          {otherDaysWithExercises.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-2.5">
              <Copy size={14} className="shrink-0 text-slate-400" />
              <select className="input h-9 w-auto text-xs" value={copySource} onChange={(e) => setCopySource(e.target.value)}>
                <option value="">Copy from day…</option>
                {otherDaysWithExercises.map((d) => <option key={d.day} value={d.day}>Day {d.day} ({d.exercises.length} exercises)</option>)}
              </select>
              <button type="button" onClick={() => copySource && copyFromDay(copySource)} disabled={!copySource} className="btn-outline px-2.5 py-1.5 text-xs disabled:opacity-40">Copy</button>
            </div>
          )}

          <AddExerciseWidget
            existingNames={existingNames}
            onAdd={(newOnes) => updateDay(activeDayData.day, { ...activeDayData, exercises: [...(activeDayData.exercises || []), ...newOnes] })}
          />

          {(activeDayData.exercises || []).length === 0 ? (
            <p className="text-sm text-slate-400">No exercises added for this day yet.</p>
          ) : (
            <div className="space-y-2">
              {activeDayData.exercises.map((ex, idx) => (
                <ExerciseCard
                  key={idx} ex={ex} hideDone
                  onChange={(u) => { const next = [...activeDayData.exercises]; next[idx] = u; updateDay(activeDayData.day, { ...activeDayData, exercises: next }) }}
                  onRemove={() => updateDay(activeDayData.day, { ...activeDayData, exercises: activeDayData.exercises.filter((_, i) => i !== idx) })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
        <button type="button" onClick={save} disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {form.id ? 'Update template' : 'Save template'}</button>
      </div>
    </div>
  )
}
