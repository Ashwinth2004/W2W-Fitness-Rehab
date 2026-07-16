import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Dumbbell, Search, Loader2, Save, ArrowRight, Plus, CheckCircle2, Circle, BadgeCheck, X, Copy, Pencil, Trash2,
  IndianRupee, Star, PlayCircle, ListChecks, MapPin, Layers, Wand2, Check, Lightbulb, TrendingUp,
} from 'lucide-react'
import {
  watchClients, addRehabPlan, updateRehabPlan, watchRehabPlans, deleteRehabPlan,
  watchServiceCharges, ensureRehabPackagesSeeded, setAccountingForRehabPlan, deleteAccountingForRehabPlan,
} from '../../lib/firestore'
import {
  REHAB_REGIONS, typesForRegion, exercisesFor, SETS_OPTIONS, REPS_OPTIONS, HOLD_OPTIONS,
  RESISTANCE_OPTIONS, FREQUENCY_OPTIONS, REST_OPTIONS, PROGRESSION_OPTIONS, blankPrescription, BALANCE_LEVEL,
} from '../../lib/rehabExercises'
import { getCustomExercises, addCustomExercise } from '../../lib/customExercises'
import { useFavorites } from '../../lib/useFavorites'
import { avatarRingClass } from '../../lib/patientAvatar'
import { todayISO, fmtDate, addDaysISO } from '../../lib/format'
import { onlyDigits } from '../../lib/validate'
import { REHAB_MODULE_LIVE } from '../../lib/constants'
import ClientForm from '../../components/ClientForm'
import DateField from '../../components/DateField'
import TherapistSelect from '../../components/TherapistSelect'
import ServiceSelect from '../../components/ServiceSelect'
import FavSelect from '../../components/FavSelect'
import PackagePriceList from '../../components/PackagePriceList'
import RehabPerformance from '../../components/RehabPerformance'
import ContactActions from '../../components/ContactActions'
import RehabBadge from '../../components/RehabBadge'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useUnsaved } from '../../context/UnsavedContext'

const MAX_DAYS = 60
const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']

function blankDay(n, startDate) {
  return { day: n, date: startDate ? addDaysISO(startDate, n - 1) : '', home: false, completed: false, exercises: [] }
}

function blankPlan() {
  const start = todayISO()
  return {
    startDate: start, totalDays: 1, therapist: '', reason: '', note: '',
    bill: { service: '', amount: '', paid: '', mode: 'Cash', addToAccounting: true },
    days: [blankDay(1, start)],
  }
}

function isPlanComplete(p) {
  const days = p.days || []
  return days.length > 0 && days.every((d) => d.completed)
}

// Placeholder shown on any deployed/production build (see REHAB_MODULE_LIVE).
// The nav link and route are real — only the content is a "coming soon" note
// — so the client-facing site never exposes the in-progress workflow.
function RehabComingSoon() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <AdminPageHeader title="Rehab & Exercises" />
      <div className="grid flex-1 place-items-center">
        <div className="card mx-auto w-full max-w-xl p-10 text-center sm:p-14">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand-50 text-brand-600"><Dumbbell size={48} /></div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 sm:text-4xl">Currently under development</h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
            This module is being built by the <span className="font-semibold text-brand-600">AK Digital Solution</span> development team and isn't live yet. It'll appear here once ready.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Rehab() {
  if (!REHAB_MODULE_LIVE) return <RehabComingSoon />
  return <RehabApp />
}

function RehabApp() {
  const [clients, setClients] = useState([])
  const [params, setParams] = useSearchParams()
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  useEffect(() => watchClients(setClients), [])

  const clientId = params.get('client') || ''
  const client = useMemo(() => clients.find((c) => c.id === clientId) || null, [clients, clientId])

  if (!clientId) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Rehab & Exercises">
          {showForm && <button onClick={() => setShowForm(false)} className="text-sm font-medium text-brand-600 hover:underline">Back to patient list</button>}
        </AdminPageHeader>
        {showForm ? (
          <ClientForm
            clients={clients}
            defaultPrograms={['W2W Fitness & Rehab']}
            onCreated={(id) => { setShowForm(false); setParams({ client: id }) }}
            onClose={() => setShowForm(false)}
          />
        ) : (
          <RehabClientPicker clients={clients} onPick={(id) => setParams({ client: id })} onNew={() => setShowForm(true)} />
        )}
      </div>
    )
  }

  if (!clients.length) return <div className="grid place-items-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>

  if (!client) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Rehab & Exercises" />
        <RehabClientPicker clients={clients} note="That patient could not be found — pick again." onPick={(id) => setParams({ client: id })} onNew={() => setShowForm(true)} />
      </div>
    )
  }

  return (
    <RehabPlanner
      key={`${client.id}:${params.get('plan') || ''}`}
      client={client}
      editId={params.get('plan') || ''}
      onChangeClient={() => setParams({})}
      navigate={navigate}
    />
  )
}

function RehabClientPicker({ clients, onPick, onNew, note }) {
  const [q, setQ] = useState('')
  const filtered = q
    ? clients.filter((c) => [c.name, c.phone, c.clientId, c.email].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()))
    : clients

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Dumbbell size={22} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Choose a patient</h2>
            <p className="text-sm text-slate-500">Tap a patient below to build their rehab plan, or register a new one.</p>
          </div>
        </div>
        {note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{note}</p>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <input
              className="input pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && filtered[0]) { e.preventDefault(); onPick(filtered[0].id) } }}
              placeholder="Search by name, phone or ID…"
            />
          </div>
          <button onClick={onNew} className="btn-outline shrink-0"><Plus size={16} /> Register new patient</button>
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="card py-12 text-center text-sm text-slate-400">No patients yet. Register your first patient above.</p>
      ) : filtered.length === 0 ? (
        <p className="card py-12 text-center text-sm text-slate-400">No patients match “{q}”.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onPick(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(c.id) } }}
              className="card cursor-pointer p-5 transition hover:shadow-soft hover:ring-1 hover:ring-brand-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 ${avatarRingClass(c)}`}>
                    {c.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs font-medium text-brand-600"><BadgeCheck size={13} /> {c.clientId}<RehabBadge client={c} /></p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">Since {fmtDate(c.createdAt)}</p>
                <div onClick={(e) => e.stopPropagation()}><ContactActions phone={c.phone} size="sm" /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// A chip split into a star zone (favorite toggle) + label zone (select toggle) —
// the shared building block for exercise checklists and progression tags.
function StarChip({ label, active, fav, disabled, onToggleFav, onClick }) {
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

// One region → type → exercise checklist for adding exercises to the active
// day. Multi-select all in one go; supports admin-added custom exercises
// mapped to the chosen type (added inline, right at the end of the checklist),
// and favorites (starred region/type/exercise bubble to the top of their
// lists — and the most recently starred sets/reps/hold/resistance/frequency/
// rest becomes the default for any exercise added from here).
function AddExerciseWidget({ existingNames, onAdd }) {
  const favRegion = useFavorites('rehab_region')
  const favType = useFavorites('rehab_type')
  const favSets = useFavorites('rehab_sets')
  const favReps = useFavorites('rehab_reps')
  const favHold = useFavorites('rehab_hold')
  const favResistance = useFavorites('rehab_resistance')
  const favFrequency = useFavorites('rehab_frequency')
  const favRest = useFavorites('rehab_rest')
  const { isFav: isFavEx, toggle: toggleFavEx, sortWithFavs: sortEx } = useFavorites('rehab_exercise')

  const [region, setRegion] = useState(() => favRegion.latest || '')
  const [type, setType] = useState(() => {
    const r = favRegion.latest || '', t = favType.latest || ''
    return r && t && typesForRegion(r).includes(t) ? t : ''
  })
  const [checked, setChecked] = useState([])
  const [customExercises, setCustomExercises] = useState(() => getCustomExercises(type))
  const [customOpen, setCustomOpen] = useState(false)
  const [customDraft, setCustomDraft] = useState('')

  const types = region ? typesForRegion(region) : []
  const builtIn = region && type ? exercisesFor(region, type) : []
  const exercises = type ? sortEx([...builtIn, ...customExercises.filter((c) => !builtIn.includes(c))]) : []

  useEffect(() => { setCustomExercises(getCustomExercises(type)); setCustomOpen(false); setCustomDraft('') }, [type])

  function pickRegion(r) { setRegion(r); setType(''); setChecked([]) }
  function pickType(t) { setType(t); setChecked([]) }
  function toggle(name) { setChecked((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name])) }

  // Add every checked exercise in ONE update — batching each into separate
  // calls made only the last one stick (each call closed over the same stale
  // exercise list), so this always builds the full array up front. New
  // exercises default to the most recently favorited sets/reps/etc, if any.
  function addChecked() {
    if (!checked.length) return
    const overrides = {}
    if (favSets.latest) overrides.sets = favSets.latest
    if (favReps.latest) overrides.reps = favReps.latest
    if (favHold.latest) overrides.hold = favHold.latest
    if (favResistance.latest) overrides.resistance = favResistance.latest
    if (favFrequency.latest) overrides.frequency = favFrequency.latest
    if (favRest.latest) overrides.rest = favRest.latest
    onAdd(checked.map((name) => ({ ...blankPrescription(region, type, name), ...overrides })))
    setChecked([])
  }

  function addCustom() {
    const n = customDraft.trim(); if (!n || !type) return
    addCustomExercise(type, n)
    setCustomExercises(getCustomExercises(type))
    setCustomDraft(''); setCustomOpen(false)
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-3 sm:p-4">
      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-700"><Plus size={14} /> Add exercise</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1 text-xs"><MapPin size={12} /> 1. Region</label>
          <FavSelect favKey="rehab_region" value={region} options={REHAB_REGIONS} onChange={pickRegion} placeholder="— Select region —" />
        </div>
        <div>
          <label className="label flex items-center gap-1 text-xs"><Layers size={12} /> 2. Exercise type</label>
          <FavSelect favKey="rehab_type" value={type} options={types} onChange={pickType} placeholder="— Select type —" disabled={!region} />
        </div>
      </div>

      {type && (
        <div>
          <label className="label flex items-center gap-1 text-xs"><ListChecks size={12} /> 3. Exercises — tap all that apply</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {exercises.map((name) => (
              <StarChip
                key={name}
                label={name + (type === 'Balance' && BALANCE_LEVEL[name] ? ` (${BALANCE_LEVEL[name]})` : '')}
                active={checked.includes(name)}
                fav={isFavEx(name)}
                disabled={existingNames.includes(name)}
                onToggleFav={() => toggleFavEx(name)}
                onClick={() => toggle(name)}
              />
            ))}
            {customOpen ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-400 bg-white py-1 pl-2.5 pr-1">
                <input
                  autoFocus className="w-28 border-0 bg-transparent text-xs focus:outline-none sm:w-36" value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } if (e.key === 'Escape') { setCustomOpen(false); setCustomDraft('') } }}
                  placeholder="Exercise name…"
                />
                <button type="button" onClick={addCustom} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-brand-600 hover:bg-brand-50"><Check size={13} /></button>
                <button type="button" onClick={() => { setCustomOpen(false); setCustomDraft('') }} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={13} /></button>
              </span>
            ) : (
              <button
                type="button" onClick={() => setCustomOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
              >
                <Wand2 size={12} /> Add your own
              </button>
            )}
          </div>
        </div>
      )}

      {checked.length > 0 && (
        <button type="button" onClick={addChecked} className="btn-primary text-sm">
          <Plus size={15} /> Add {checked.length} exercise{checked.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return <div><label className="label text-[11px]">{label}</label>{children}</div>
}

// One prescribed exercise: sets/reps/hold/resistance/frequency/rest/notes +
// progression, plus a bold "Mark as Completed" action for follow-up tracking.
function ExerciseCard({ ex, onChange, onRemove }) {
  const set = (k) => (v) => onChange({ ...ex, [k]: v })
  const toggleProg = (p) => onChange({ ...ex, progression: ex.progression.includes(p) ? ex.progression.filter((x) => x !== p) : [...ex.progression, p] })
  const toggleDone = () => onChange({ ...ex, done: !ex.done })
  const { isFav: isFavProg, toggle: toggleFavProg, sortWithFavs: sortProg } = useFavorites('rehab_progression')

  return (
    <div className={`rounded-2xl border-2 p-3.5 transition ${ex.done ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-900">{ex.name}</p>
          <p className="text-xs text-slate-400">{ex.region} · {ex.type}</p>
        </div>
        <button type="button" onClick={onRemove} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500"><X size={16} /></button>
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

      <button
        type="button" onClick={toggleDone}
        className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-extrabold uppercase tracking-wide transition ${
          ex.done ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
        }`}
      >
        {ex.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        {ex.done ? 'Completed' : 'Mark as Completed'}
      </button>
    </div>
  )
}

// One day's editor: date, home-program flag, session-completed flag, and the
// exercise list — always anchored BELOW the Add Exercise widget (stretches
// grouped in their own sub-section, matching the clinic's paper sheets).
function DayEditor({ day, canCopy, onCopyFromPrev, onChangeDay }) {
  const exercises = day.exercises || []
  const main = exercises.filter((e) => e.type !== 'Stretching')
  const stretches = exercises.filter((e) => e.type === 'Stretching')

  function updateExercise(idx, updated) {
    const next = [...exercises]; next[idx] = updated
    // Auto-detect: once every exercise is ticked done, mark the session
    // completed automatically (unticking one doesn't force it back off).
    const allDone = next.length > 0 && next.every((e) => e.done)
    onChangeDay({ ...day, exercises: next, completed: allDone ? true : day.completed })
  }
  function removeExercise(idx) {
    onChangeDay({ ...day, exercises: exercises.filter((_, i) => i !== idx) })
  }
  function addExercises(newOnes) {
    onChangeDay({ ...day, exercises: [...exercises, ...newOnes] })
  }

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
        {canCopy && (
          <button type="button" onClick={onCopyFromPrev} className="btn-outline mb-1.5 ml-auto text-xs"><Copy size={13} /> Copy from Day {day.day - 1}</button>
        )}
      </div>

      <AddExerciseWidget existingNames={existingNames} onAdd={addExercises} />

      {exercises.length === 0 && <p className="text-sm text-slate-400">No exercises added for this day yet.</p>}

      {main.length > 0 && (
        <div className="space-y-2">
          {main.map((ex) => {
            const idx = exercises.indexOf(ex)
            return <ExerciseCard key={idx} ex={ex} onChange={(u) => updateExercise(idx, u)} onRemove={() => removeExercise(idx)} />
          })}
        </div>
      )}

      {stretches.length > 0 && (
        <div className="border-t-2 border-dashed border-slate-200 pt-3">
          <p className="mb-2 text-sm font-bold text-brand-700">Stretches</p>
          <div className="space-y-2">
            {stretches.map((ex) => {
              const idx = exercises.indexOf(ex)
              return <ExerciseCard key={idx} ex={ex} onChange={(u) => updateExercise(idx, u)} onRemove={() => removeExercise(idx)} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Derived, read-only guidance computed purely from the current plan state —
// no separate data to maintain. Tells the admin what's pending at a glance:
// which days still need attention, and which exercises in today's tab aren't
// ticked off yet.
function PlanTips({ days, activeDayData }) {
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

function RehabPlanner({ client, editId = '', onChangeClient, navigate }) {
  const [plans, setPlans] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState(blankPlan)
  const [activeDay, setActiveDay] = useState(1)
  const [billOpen, setBillOpen] = useState(false)
  const [showPerf, setShowPerf] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [therapistInvalid, setTherapistInvalid] = useState(false)
  const [daysText, setDaysText] = useState(String(blankPlan().totalDays))
  const { setDirty, guard } = useUnsaved()
  const editLoaded = useRef(false)

  useEffect(() => watchRehabPlans(client.id, setPlans), [client.id])
  useEffect(() => watchServiceCharges(setServices), [])
  useEffect(() => { ensureRehabPackagesSeeded() }, [])
  useEffect(() => () => setDirty(false), [setDirty])

  // Keep the "Plan length" text in sync with the committed value — but only
  // when that value actually changes (picking a package, loading a saved
  // plan). While the admin is mid-typing (see handleDaysInput) the field can
  // sit empty without this effect snapping it back to "1".
  useEffect(() => { setDaysText(String(form.totalDays)) }, [form.totalDays])

  const billBalance = Math.max(0, (Number(form.bill.amount) || 0) - (Number(form.bill.paid) || 0))
  const setBillMoney = (k) => (e) => { setForm((f) => ({ ...f, bill: { ...f.bill, [k]: onlyDigits(e.target.value).slice(0, 7) } })); setDirty(true) }

  // Default the prescriber to the client's last handler, once known.
  useEffect(() => { setForm((f) => ({ ...f, therapist: f.therapist || plans[0]?.therapist || client.therapist || 'Sakthi Saravanan' })) }, [plans, client])

  // Edit mode: load the chosen saved plan into the form (once, when it arrives).
  useEffect(() => {
    if (!editId || editLoaded.current || !plans.length) return
    const p = plans.find((x) => x.id === editId)
    if (!p) return
    editLoaded.current = true
    setForm({
      startDate: p.startDate || todayISO(),
      totalDays: p.totalDays || p.days?.length || 1,
      therapist: p.therapist || '',
      reason: p.reason || '',
      note: p.note || '',
      bill: {
        service: p.bill?.service || '', amount: p.bill?.amount != null ? String(p.bill.amount) : '',
        paid: p.bill?.paid != null ? String(p.bill.paid) : '', mode: p.bill?.mode || 'Cash',
        addToAccounting: p.bill?.addToAccounting !== false,
      },
      days: p.days?.length ? p.days : [blankDay(1, p.startDate)],
    })
    if (p.bill?.service) setBillOpen(true)
    setActiveDay(1)
  }, [editId, plans])

  // Keep the active tab valid if the day count shrinks below it.
  useEffect(() => {
    if (!form.days.find((d) => d.day === activeDay)) setActiveDay(form.days[0]?.day || 1)
  }, [form.days, activeDay])

  function setTotalDays(raw) {
    const total = Math.max(1, Math.min(MAX_DAYS, Number(raw) || 1))
    setForm((f) => ({ ...f, totalDays: total, days: Array.from({ length: total }, (_, i) => f.days[i] || blankDay(i + 1, f.startDate)) }))
    setDirty(true)
  }

  // The "Plan length" field is deliberately NOT a plain controlled number —
  // committing straight to form.totalDays (min 1) meant clearing the field to
  // type a fresh number instantly snapped back to "1", so backspace never
  // worked. Typed digits are held in `daysText` and only pushed into
  // form.totalDays once there's something to clamp; an empty field stays
  // empty until blur, where it falls back to the last committed value.
  function handleDaysInput(e) {
    const digits = onlyDigits(e.target.value).slice(0, 2)
    setDaysText(digits)
    if (digits) setTotalDays(digits)
  }
  function handleDaysBlur() {
    if (!daysText) setDaysText(String(form.totalDays))
  }

  function setStartDate(iso) {
    setForm((f) => ({ ...f, startDate: iso, days: f.days.map((d, i) => (d.date ? d : { ...d, date: addDaysISO(iso, i) })) }))
    setDirty(true)
  }

  function updateDay(dayNum, updated) {
    setForm((f) => ({ ...f, days: f.days.map((d) => (d.day === dayNum ? updated : d)) }))
    setDirty(true)
  }

  // Picking a package auto-fills its price, opens the billing panel, and —
  // when known — sets the plan length to its class count (still editable).
  function pickPackage(name, amount, classes) {
    setForm((f) => ({ ...f, bill: { ...f.bill, service: name, ...(amount != null ? { amount: String(amount) } : {}) } }))
    setBillOpen(true)
    if (classes) setTotalDays(classes)
    setDirty(true)
  }

  // Copies the PREVIOUS day's exercises (not always Day 1) — most plans build
  // day-on-day, so this is what actually saves re-entry each time. `done` is
  // reset since it's a fresh day yet to be performed.
  function copyFromPrevDay(dayNum) {
    const prev = form.days.find((d) => d.day === dayNum - 1)
    const target = form.days.find((d) => d.day === dayNum)
    if (!prev || !target) return
    updateDay(dayNum, { ...target, exercises: prev.exercises.map((e) => ({ ...e, done: false, progression: [...e.progression] })) })
  }

  async function save(e) {
    e.preventDefault(); setError('')
    if (!form.therapist) {
      setTherapistInvalid(true)
      setError('Please choose who is prescribing this plan.')
      requestAnimationFrame(() => document.getElementById('rehab-therapist')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    setBusy(true)
    try {
      const billData = {
        service: (form.bill.service || '').trim(), amount: Number(form.bill.amount) || 0,
        paid: Number(form.bill.paid) || 0, balance: billBalance, mode: form.bill.mode,
        addToAccounting: form.bill.addToAccounting !== false,
      }
      const data = { ...form, bill: billData }

      let planId = editId
      if (editId) await updateRehabPlan(client.id, editId, data)
      else { planId = await addRehabPlan(client.id, data) }

      // Mirror the package charge into Accounting (best-effort — a limited admin
      // without accounting access must not have this block the plan save).
      try {
        if (billData.addToAccounting && (billData.amount > 0 || billData.paid > 0)) {
          await setAccountingForRehabPlan(planId, {
            date: form.startDate, clientId: client.clientId, clientDocId: client.id, clientName: client.name,
            service: billData.service, therapist: form.therapist,
            amount: billData.amount, paid: billData.paid, balance: billData.balance, mode: billData.mode,
          })
        } else {
          await deleteAccountingForRehabPlan(planId)
        }
      } catch (_) { /* accounting sync is best-effort */ }

      setDirty(false); setSaved(true)
    } catch (err) {
      console.error('save rehab plan failed:', err)
      setError('Could not save the plan. Please try again.')
    }
    setBusy(false)
  }

  async function removePlan(p) {
    if (!window.confirm(`Delete this ${p.totalDays || p.days?.length || ''}-day rehab plan? This cannot be undone.`)) return
    await deleteRehabPlan(client.id, p.id)
    try { await deleteAccountingForRehabPlan(p.id) } catch (_) { /* best-effort */ }
  }

  // Bulk shortcut — ticks every exercise and every day as done, without
  // needing to open the full editor. Used on the Active Session banner and
  // the Previous rehab plans list.
  async function markPlanComplete(p) {
    if (!window.confirm('Mark every day and exercise in this plan as completed?')) return
    const days = (p.days || []).map((d) => ({ ...d, completed: true, exercises: (d.exercises || []).map((e) => ({ ...e, done: true })) }))
    await updateRehabPlan(client.id, p.id, { ...p, days })
  }

  const activePlans = plans.filter((p) => p.id !== editId && !isPlanComplete(p))

  if (saved) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Rehab & Exercises" />
        <div className="card mx-auto max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-500" size={48} />
          <h2 className="mt-3 text-xl font-bold">{editId ? 'Plan updated' : 'Rehab plan saved'}</h2>
          <p className="mt-1 text-slate-500">
            {form.totalDays}-day plan {editId ? 'updated' : 'created'} for {client.name} ({client.clientId}){form.bill.service ? ` — ${form.bill.service}` : ''}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to={`/admin/clients/${client.id}`} className="btn-primary">Open patient page <ArrowRight size={16} /></Link>
            <button onClick={() => { if (editId) navigate(`/admin/rehab?client=${client.id}`); else { setForm(blankPlan()); setActiveDay(1); setBillOpen(false); setSaved(false) } }} className="btn-outline">Add another plan</button>
            <button onClick={onChangeClient} className="btn-ghost">Another patient</button>
          </div>
        </div>
      </div>
    )
  }

  const activeDayData = form.days.find((d) => d.day === activeDay) || form.days[0]

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="space-y-5">
        <AdminPageHeader title="Rehab & Exercises">
          <button type="button" onClick={() => guard(() => navigate(`/admin/clients/${client.id}`))} className="text-sm font-medium text-brand-600 hover:underline">Open patient page →</button>
          <button type="button" onClick={() => guard(() => onChangeClient())} className="text-sm font-medium text-brand-600 hover:underline">Change patient</button>
        </AdminPageHeader>

        <div className="card space-y-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{client.name}</p>
              <p className="flex items-center text-sm text-slate-500">{client.clientId}<RehabBadge client={client} /> · {client.phone}</p>
            </div>
          </div>

          {activePlans.length > 0 && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-emerald-700"><PlayCircle size={20} /> Active Session{activePlans.length > 1 ? 's' : ''}</p>
              <div className="mt-2 space-y-2">
                {activePlans.map((p) => {
                  const done = (p.days || []).filter((d) => d.completed).length
                  const total = p.totalDays || p.days?.length || 0
                  return (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{p.bill?.service || 'Rehab plan'} · Day {Math.min(done + 1, total)} of {total}</p>
                        <p className="text-xs text-slate-500">Started {fmtDate(p.startDate)}{p.reason ? ` · ${p.reason}` : ''}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => guard(() => navigate(`/admin/rehab?client=${client.id}&plan=${p.id}`))} className="btn-primary px-3 py-1.5 text-xs">Continue <ArrowRight size={14} /></button>
                        <button type="button" onClick={() => markPlanComplete(p)} className="btn-outline px-3 py-1.5 text-xs"><CheckCircle2 size={13} /> Mark complete</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label text-sm">Prescribed by (Physiotherapist) *</label>
              <TherapistSelect id="rehab-therapist" invalid={therapistInvalid} value={form.therapist} onChange={(v) => { setForm((f) => ({ ...f, therapist: v })); setDirty(true); setTherapistInvalid(false) }} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label text-sm">Plan start date</label><DateField value={form.startDate} onChange={setStartDate} /></div>
              <div>
                <label className="label text-sm">Plan length (days)</label>
                <input className="input" inputMode="numeric" value={daysText} onChange={handleDaysInput} onBlur={handleDaysBlur} placeholder="Enter the days" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label text-sm">Rehab for</label>
              <input className="input" value={form.reason} onChange={(e) => { setForm((f) => ({ ...f, reason: e.target.value })); setDirty(true) }} placeholder="e.g. Right knee pain, lat. gastro strain" />
            </div>
            <div>
              <label className="label text-sm">Note</label>
              <input className="input" value={form.note} onChange={(e) => { setForm((f) => ({ ...f, note: e.target.value })); setDirty(true) }} placeholder="Optional note" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-soft ring-1 ring-amber-100">
          <button
            type="button" onClick={() => setBillOpen((v) => !v)}
            className="flex w-full flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-3 text-left text-white sm:px-5"
          >
            <span className="flex flex-wrap items-center gap-2 font-bold">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20"><IndianRupee size={16} /></span>
              Package &amp; Billing
              {form.bill.service && <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{form.bill.service}</span>}
            </span>
            <span className="shrink-0 text-xs font-semibold opacity-90">{billOpen ? 'Hide ▲' : 'Click to open ▼'}</span>
          </button>
          {billOpen && (
            <div className="space-y-3 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label text-sm">Package / Service</label>
                  <ServiceSelect value={form.bill.service} services={services} onChange={pickPackage} />
                </div>
                <div><label className="label text-sm">Amount charged (Rs.)</label><input className="input" inputMode="numeric" value={form.bill.amount} onChange={setBillMoney('amount')} placeholder="0" /></div>
                <div><label className="label text-sm">Amount paid (Rs.)</label><input className="input" inputMode="numeric" value={form.bill.paid} onChange={setBillMoney('paid')} placeholder="0" /></div>
                <div><label className="label text-sm">Mode</label><FavSelect favKey="rehab_pay_mode" value={form.bill.mode} options={PAY_MODES} onChange={(m) => { setForm((f) => ({ ...f, bill: { ...f.bill, mode: m } })); setDirty(true) }} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-amber-100">
                <span className="text-slate-500">Balance due</span>
                <span className={`font-bold ${billBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Rs. {billBalance.toLocaleString('en-IN')}</span>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.bill.addToAccounting !== false} onChange={(e) => { setForm((f) => ({ ...f, bill: { ...f.bill, addToAccounting: e.target.checked } })); setDirty(true) }} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                Add this charge to Accounting → Patient Charges
              </label>
              <p className="text-xs text-slate-400">Picking a package sets its price and, when known, the plan length above.</p>
              <PackagePriceList services={services} value={form.bill.service} onPick={pickPackage} />
              <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {editId ? 'Update plan' : 'Save plan'}</button>
            </div>
          )}
        </div>

        <div className="card p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {form.days.map((d) => (
                <button
                  key={d.day} type="button" onClick={() => setActiveDay(d.day)}
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
            <span className="text-xs text-slate-400">{form.days.filter((d) => d.completed).length}/{form.days.length} sessions completed</span>
          </div>
          <div className="pt-4">
            {activeDayData && (
              <DayEditor
                day={activeDayData}
                canCopy={activeDayData.day !== 1 && (form.days.find((d) => d.day === activeDayData.day - 1)?.exercises.length > 0)}
                onCopyFromPrev={() => copyFromPrevDay(activeDayData.day)}
                onChangeDay={(updated) => updateDay(activeDayData.day, updated)}
              />
            )}
          </div>
        </div>

        {editId && <PlanTips days={form.days} activeDayData={activeDayData} />}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => guard(() => onChangeClient())} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {editId ? 'Update plan' : 'Save plan'}</button>
        </div>
      </form>

      {plans.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-brand-700">Previous rehab plans</h3>
            <button type="button" onClick={() => setShowPerf(true)} className="btn-outline px-3 py-1.5 text-xs"><TrendingUp size={14} /> View Performance</button>
          </div>
          <ul className="divide-y divide-slate-100">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-slate-700">
                  {fmtDate(p.startDate)} · {p.totalDays} day{p.totalDays > 1 ? 's' : ''}
                  {p.bill?.service ? ` · ${p.bill.service}` : ''}{p.reason ? ` · ${p.reason}` : ''}
                  {' · '}<span className={isPlanComplete(p) ? 'font-semibold text-emerald-600' : 'text-emerald-600'}>{(p.days || []).filter((d) => d.completed).length}/{p.days?.length || p.totalDays} completed</span>
                </span>
                <div className="flex gap-3">
                  <Link to={`/admin/rehab?client=${client.id}&plan=${p.id}`} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><Pencil size={13} /> Edit</Link>
                  {!isPlanComplete(p) && <button type="button" onClick={() => markPlanComplete(p)} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"><CheckCircle2 size={13} /> Mark complete</button>}
                  <button type="button" onClick={() => removePlan(p)} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"><Trash2 size={13} /> Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showPerf && <RehabPerformance client={client} plans={plans} onClose={() => setShowPerf(false)} />}
    </div>
  )
}
