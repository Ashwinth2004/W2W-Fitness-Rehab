import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Dumbbell, Search, Loader2, Save, ArrowRight, Plus, CheckCircle2, Circle, BadgeCheck, X, Copy, Pencil, Trash2,
  IndianRupee, Star, PlayCircle, ListChecks, MapPin, Layers, Wand2, Check, Lightbulb, TrendingUp, LayoutTemplate,
} from 'lucide-react'
import {
  watchClients, addRehabPlan, updateRehabPlan, watchRehabPlans, deleteRehabPlan,
  watchServiceCharges, ensureRehabPackagesSeeded, setAccountingForRehabPlan, deleteAccountingForRehabPlan,
  watchRehabTemplates, addRehabTemplate, deleteRehabTemplate,
} from '../../lib/firestore'
import {
  REHAB_REGIONS, REGION_TYPES, WHOLE_BODY_TYPES, typesForRegion, exercisesFor, SETS_OPTIONS, REPS_OPTIONS, HOLD_OPTIONS,
  RESISTANCE_OPTIONS, FREQUENCY_OPTIONS, REST_OPTIONS, PROGRESSION_OPTIONS, blankPrescription, BALANCE_LEVEL,
} from '../../lib/rehabExercises'
import { getCustomExercises, addCustomExercise } from '../../lib/customExercises'
import { getCustomRegions, addCustomRegion, getCustomTypes, addCustomType } from '../../lib/customTaxonomy'
import { useFavorites } from '../../lib/useFavorites'
import PatientAvatar from '../../components/PatientAvatar'
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
      clients={clients}
      editId={params.get('plan') || ''}
      onChangeClient={() => setParams({})}
      navigate={navigate}
    />
  )
}

const isRehabClient = (c) => Array.isArray(c?.programs) && c.programs.includes('W2W Fitness & Rehab')

function RehabClientPicker({ clients, onPick, onNew, note }) {
  const [q, setQ] = useState('')
  // Default to rehab-registered patients only — showing every Treatment-only
  // client here too was cluttered and easy to mis-pick. "Show all clients"
  // below reveals everyone when a Treatment-only patient needs a plan too.
  const [showAll, setShowAll] = useState(false)
  const rehabClients = clients.filter(isRehabClient)
  const pool = showAll ? clients : rehabClients
  const filtered = q
    ? pool.filter((c) => [c.name, c.phone, c.clientId, c.email].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()))
    : pool

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
        <p className="card py-12 text-center text-sm text-slate-400">
          {showAll ? `No patients match “${q}”.` : rehabClients.length === 0 ? 'No patients registered for W2W Fitness & Rehab yet.' : `No rehab patients match “${q}”.`}
        </p>
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
                  <PatientAvatar client={c} />
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

      {clients.length > 0 && rehabClients.length !== clients.length && (
        <div className="text-center">
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm font-medium text-brand-600 hover:underline">
            {showAll ? 'Show rehab patients only ▲' : 'Not seeing who you need? Show all clients too ▾'}
          </button>
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

// An inline "add your own" control — a dashed pill that expands into a text
// box + confirm/cancel. Shared by the Region, Type and per-group Exercise
// custom-add rows so a brand new one can be typed in without leaving the chip row.
function AddOwnChip({ placeholder, onAdd }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  function submit() {
    const n = draft.trim(); if (!n) return
    onAdd(n)
    setDraft(''); setOpen(false)
  }
  if (!open) {
    return (
      <button
        type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
      >
        <Wand2 size={12} /> Add your own
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand-400 bg-white py-1 pl-2.5 pr-1">
      <input
        autoFocus className="w-28 border-0 bg-transparent text-xs focus:outline-none sm:w-36" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } if (e.key === 'Escape') { setOpen(false); setDraft('') } }}
        placeholder={placeholder}
      />
      <button type="button" onClick={submit} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-brand-600 hover:bg-brand-50"><Check size={13} /></button>
      <button type="button" onClick={() => { setOpen(false); setDraft('') }} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={13} /></button>
    </span>
  )
}

// Which exercise TYPES make sense for a region — built-in mapping for known
// regions, everything for a custom (admin-added) region; admin-added custom
// types are always offered everywhere, on top of that.
function typesForAnyRegion(region, customTypes) {
  const builtIn = REHAB_REGIONS.includes(region) ? typesForRegion(region) : [...REGION_TYPES, ...WHOLE_BODY_TYPES]
  return [...builtIn, ...customTypes.filter((t) => !builtIn.includes(t))]
}

// Multi-region, multi-type, multi-exercise bulk builder for the active day.
// Pick as many regions and types as needed, tick every exercise wanted across
// all of them, and add the whole batch in one go — instead of one
// region/type/exercise at a time. Supports admin-added custom regions, types
// and exercises (all "Add your own"), and favorites (starred region/type/
// exercise bubble to the top — and the most recently starred/pinned sets/
// reps/hold/resistance/frequency/rest becomes the default for new exercises).
function AddExerciseWidget({ existingNames, onAdd }) {
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
  const [checked, setChecked] = useState([]) // [{ region, type, name }]
  const [customRegions, setCustomRegions] = useState(() => getCustomRegions())
  const [customTypes, setCustomTypes] = useState(() => getCustomTypes())
  const [tick, setTick] = useState(0) // bumped after a custom exercise is added, to refresh per-type lists

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

  function addOwnRegion(name) { addCustomRegion(name); setCustomRegions(getCustomRegions()); setSelectedRegions((rs) => [...rs, name]) }
  function addOwnType(name) { addCustomType(name); setCustomTypes(getCustomTypes()); setSelectedTypes((ts) => [...ts, name]) }
  function addOwnExercise(region, type, name) { addCustomExercise(type, name); setTick((t) => t + 1); toggleExercise(region, type, name) }

  // One visible group per valid region+type combination actually in play.
  const groups = selectedRegions.flatMap((region) =>
    selectedTypes.filter((type) => typesForAnyRegion(region, customTypes).includes(type)).map((type) => ({ region, type }))
  )

  // Add every checked exercise in ONE update — batching each into separate
  // calls made only the last one stick (each call closed over the same stale
  // exercise list), so this always builds the full array up front. New
  // exercises default to the most recently favorited/pinned sets/reps/etc.
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
      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-700"><Plus size={14} /> Add exercise — pick as many as you need</p>

      <div>
        <label className="label flex items-center gap-1 text-xs"><MapPin size={12} /> 1. Region(s) — tap all that apply</label>
        <div className="flex flex-wrap items-center gap-1.5">
          {regionOptions.map((r) => (
            <StarChip key={r} label={r} active={selectedRegions.includes(r)} fav={isFavRegion(r)} onToggleFav={() => toggleFavRegion(r)} onClick={() => toggleRegion(r)} />
          ))}
          <AddOwnChip placeholder="Region name…" onAdd={addOwnRegion} />
        </div>
      </div>

      {selectedRegions.length > 0 && (
        <div>
          <label className="label flex items-center gap-1 text-xs"><Layers size={12} /> 2. Exercise type(s) — tap all that apply</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {typeOptions.map((t) => (
              <StarChip key={t} label={t} active={selectedTypes.includes(t)} fav={isFavType(t)} onToggleFav={() => toggleFavType(t)} onClick={() => toggleType(t)} />
            ))}
            <AddOwnChip placeholder="Type name…" onAdd={addOwnType} />
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-3">
          <label className="label flex items-center gap-1 text-xs"><ListChecks size={12} /> 3. Exercises — tap all that apply</label>
          {groups.map(({ region, type }) => {
            const builtIn = exercisesFor(region, type)
            const custom = getCustomExercises(type) // read fresh each render; `tick` state forces the re-render after an add
            const exercises = sortEx([...builtIn, ...custom.filter((c) => !builtIn.includes(c))])
            return (
              <div key={`${region}|${type}`} className="rounded-xl bg-white/60 p-2.5 ring-1 ring-brand-100">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-500">{region} · {type}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {exercises.map((name) => (
                    <StarChip
                      key={name}
                      label={name + (type === 'Balance' && BALANCE_LEVEL[name] ? ` (${BALANCE_LEVEL[name]})` : '')}
                      active={isChecked(region, type, name)}
                      fav={isFavEx(name)}
                      disabled={existingNames.includes(name)}
                      onToggleFav={() => toggleFavEx(name)}
                      onClick={() => toggleExercise(region, type, name)}
                    />
                  ))}
                  <AddOwnChip placeholder="Exercise name…" onAdd={(name) => addOwnExercise(region, type, name)} />
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
    </div>
  )
}

function Field({ label, children }) {
  return <div><label className="label text-[11px]">{label}</label>{children}</div>
}

function exercisesForAnyMerged(region, type) {
  const builtIn = exercisesFor(region, type)
  return [...builtIn, ...getCustomExercises(type).filter((c) => !builtIn.includes(c))]
}

// One prescribed exercise: sets/reps/hold/resistance/frequency/rest/notes +
// progression, plus a bold "Mark as Completed" action for follow-up tracking.
// The exercise's identity (region/type/name) is editable in place via the
// pencil toggle — no need to remove and re-add to swap which exercise this is.
function ExerciseCard({ ex, onChange, onRemove }) {
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
function DayEditor({ day, allDays, onCopyFromDay, onOpenCrossPatientCopy, onChangeDay }) {
  const exercises = day.exercises || []
  const main = exercises.filter((e) => e.type !== 'Stretching')
  const stretches = exercises.filter((e) => e.type === 'Stretching')
  const [copySource, setCopySource] = useState('')
  const [templates, setTemplates] = useState([])
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  useEffect(() => watchRehabTemplates(setTemplates), [])

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

  function copyFromPicked() {
    if (!copySource) return
    onCopyFromDay(Number(copySource))
    setCopySource('')
  }

  async function saveAsTemplate() {
    const n = templateName.trim(); if (!n || !exercises.length) return
    try { await addRehabTemplate(n, exercises.map((e) => ({ ...e, done: false }))) } catch (_) { /* rules may need publishing */ }
    setTemplateName(''); setSavingTemplate(false)
  }
  async function removeTemplate(id) {
    if (!window.confirm('Delete this template?')) return
    try { await deleteRehabTemplate(id) } catch (_) { /* rules may need publishing */ }
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

      {/* Copy & Templates — reuse an existing day, another patient's plan, or a saved named set */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-2.5">
        <Copy size={14} className="shrink-0 text-slate-400" />
        {otherDaysWithExercises.length > 0 && (
          <>
            <select className="input h-9 w-auto text-xs" value={copySource} onChange={(e) => setCopySource(e.target.value)}>
              <option value="">Copy from day…</option>
              {otherDaysWithExercises.map((d) => <option key={d.day} value={d.day}>Day {d.day} ({d.exercises.length} exercises)</option>)}
            </select>
            <button type="button" onClick={copyFromPicked} disabled={!copySource} className="btn-outline px-2.5 py-1.5 text-xs disabled:opacity-40">Copy</button>
          </>
        )}
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
          {templates.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-xs">
              <button type="button" onClick={() => addExercises(t.exercises.map((e) => ({ ...e, done: false })))} className="font-medium text-slate-700 hover:text-brand-600">
                {t.name} <span className="text-slate-400">({t.exercises.length})</span>
              </button>
              <button type="button" onClick={() => removeTemplate(t.id)} className="grid h-5 w-5 place-items-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={11} /></button>
            </span>
          ))}
        </div>
      )}

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

function RehabPlanner({ client, clients = [], editId = '', onChangeClient, navigate }) {
  const [plans, setPlans] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState(blankPlan)
  const [activeDay, setActiveDay] = useState(1)
  const [billOpen, setBillOpen] = useState(false)
  const [showPerf, setShowPerf] = useState(false)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
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
  // reset since it's a fresh day yet to be performed. Works from any day in
  // the plan, not just the immediately previous one — always targets the
  // currently active day, and confirms before overwriting existing work.
  function copyFromDay(sourceDayNum) {
    const src = form.days.find((d) => d.day === sourceDayNum)
    if (!src || !activeDayData) return
    if (activeDayData.exercises?.length > 0 && !window.confirm(`Replace Day ${activeDayData.day}'s current exercises with Day ${sourceDayNum}'s?`)) return
    updateDay(activeDayData.day, { ...activeDayData, exercises: src.exercises.map((e) => ({ ...e, done: false, progression: [...e.progression] })) })
  }

  // Cross-patient copy: pull a specific day's exercises from ANY other
  // patient's rehab history straight into the active day of this plan.
  function applyExercisesToActiveDay(exercises) {
    if (!activeDayData) return
    updateDay(activeDayData.day, { ...activeDayData, exercises: [...(activeDayData.exercises || []), ...exercises] })
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
            <Link to={`/admin/clients/${client.id}`} className="btn-outline shrink-0 px-3 py-1.5 text-xs">View Profile <ArrowRight size={14} /></Link>
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
                allDays={form.days}
                onCopyFromDay={copyFromDay}
                onOpenCrossPatientCopy={() => setCopyModalOpen(true)}
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
      {copyModalOpen && (
        <CopyFromPatientModal
          clients={clients}
          currentClientId={client.id}
          onApply={applyExercisesToActiveDay}
          onClose={() => setCopyModalOpen(false)}
        />
      )}
    </div>
  )
}

// Clone a specific day's exercises from ANY other patient's rehab history
// straight into the active day here — search patient → pick a plan → pick a
// day → copy. Complements named templates for one-off "do what I did for
// this other patient" reuse.
function CopyFromPatientModal({ clients, currentClientId, onApply, onClose }) {
  const [q, setQ] = useState('')
  const [pickedClientId, setPickedClientId] = useState('')
  const [plans, setPlans] = useState([])
  const [pickedPlanId, setPickedPlanId] = useState('')
  const [pickedDay, setPickedDay] = useState('')

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

  function pickClient(id) { setPickedClientId(id); setPickedPlanId(''); setPickedDay('') }
  function pickPlan(id) { setPickedPlanId(id); setPickedDay('') }

  function apply() {
    const day = days.find((d) => String(d.day) === String(pickedDay))
    if (!day) return
    onApply((day.exercises || []).map((e) => ({ ...e, done: false, progression: [...e.progression] })))
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
            <label className="label text-xs">Day</label>
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <button
                  key={d.day} type="button" onClick={() => setPickedDay(d.day)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${String(pickedDay) === String(d.day) ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Day {d.day} ({(d.exercises || []).length})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={apply} disabled={!pickedDay} className="btn-primary disabled:opacity-40"><Copy size={16} /> Copy exercises here</button>
        </div>
      </div>
    </div>
  )
}
