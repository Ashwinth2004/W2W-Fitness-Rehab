import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Dumbbell, Search, Loader2, Save, ArrowRight, Plus, CheckCircle2, Circle, BadgeCheck, X, Copy, Pencil, Trash2,
  IndianRupee, Star, PlayCircle, ListChecks, MapPin, Layers, Wand2, Check, Lightbulb, TrendingUp, LayoutTemplate,
  LayoutGrid,
} from 'lucide-react'
import {
  watchClients, addRehabPlan, updateRehabPlan, watchRehabPlans, deleteRehabPlan,
  watchServiceCharges, ensureRehabPackagesSeeded, setAccountingForRehabPlan, deleteAccountingForRehabPlan,
  watchRehabTemplates, addRehabTemplate, updateRehabTemplate, deleteRehabTemplate, updateClient,
} from '../../lib/firestore'
import {
  REHAB_REGIONS, REGION_TYPES, WHOLE_BODY_TYPES, typesForRegion, exercisesFor, SETS_OPTIONS, REPS_OPTIONS, HOLD_OPTIONS,
  RESISTANCE_OPTIONS, FREQUENCY_OPTIONS, REST_OPTIONS, PROGRESSION_OPTIONS, blankPrescription, BALANCE_LEVEL,
} from '../../lib/rehabExercises'
import {
  getCustomExercises, addCustomExercise, updateCustomExercise, deleteCustomExercise,
  getCustomExercisesForRegionType, addCustomExerciseForRegionType, deleteCustomExerciseForRegionType,
  updateCustomExerciseForRegionType, renameRegionTypeExercises, deleteRegionTypeExercises,
} from '../../lib/customExercises'
import {
  getCustomRegions, addCustomRegion, updateCustomRegion, deleteCustomRegion,
  getCustomTypes, addCustomType, updateCustomType, deleteCustomType,
  getCustomTypesForRegion, addCustomTypeForRegion, deleteCustomTypeForRegion,
  updateCustomTypeForRegion, getRegionsWithCustomTypes,
} from '../../lib/customTaxonomy'
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
import RehabClusterTrack from '../../components/RehabClusterTrack'
import ContactActions from '../../components/ContactActions'
import RehabBadge from '../../components/RehabBadge'
import FitnessBadge from '../../components/FitnessBadge'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useUnsaved } from '../../context/UnsavedContext'

const MAX_DAYS = 60
const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']
// The fixed, built-in exercise types — anything NOT in here is an admin-added
// custom type (and therefore renamable/deletable in the picker).
const BUILTIN_TYPES = [...REGION_TYPES, ...WHOLE_BODY_TYPES]

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

// Templates are stored as { name, days: [{ day, exercises }] }. Older
// templates saved before this schema (flat { exercises }) still work —
// treated as a single Day 1.
function templateDays(t) {
  return t?.days?.length ? t.days : (t?.exercises ? [{ day: 1, exercises: t.exercises }] : [])
}
function templateExerciseCount(t) {
  return templateDays(t).reduce((s, d) => s + (d.exercises?.length || 0), 0)
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
  const [showTemplates, setShowTemplates] = useState(false)
  const navigate = useNavigate()

  useEffect(() => watchClients(setClients), [])

  const clientId = params.get('client') || ''
  const client = useMemo(() => clients.find((c) => c.id === clientId) || null, [clients, clientId])

  if (!clientId) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Rehab & Exercises">
          {(showForm || showTemplates) && (
            <button onClick={() => { setShowForm(false); setShowTemplates(false) }} className="text-sm font-medium text-brand-600 hover:underline">Back to patient list</button>
          )}
        </AdminPageHeader>
        {showForm ? (
          <ClientForm
            clients={clients}
            defaultPrograms={['W2W Fitness & Rehab']}
            onCreated={(id) => { setShowForm(false); setParams({ client: id }) }}
            onClose={() => setShowForm(false)}
          />
        ) : showTemplates ? (
          <RehabTemplateManager onClose={() => setShowTemplates(false)} />
        ) : (
          <RehabClientPicker clients={clients} onPick={(id) => setParams({ client: id })} onNew={() => setShowForm(true)} onTemplates={() => setShowTemplates(true)} />
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

function RehabClientPicker({ clients, onPick, onNew, onTemplates, note }) {
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

      {onTemplates && (
        <button
          type="button" onClick={onTemplates}
          className="card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-soft hover:ring-1 hover:ring-brand-200 sm:p-5"
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><LayoutTemplate size={22} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">Create Rehab Templates</p>
            <p className="text-sm text-slate-500">Build multi-day exercise templates from scratch — use them on any patient's plan later.</p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-slate-300" />
        </button>
      )}

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
                    <p className="flex items-center gap-1 text-xs font-medium text-brand-600"><BadgeCheck size={13} /> {c.clientId}<RehabBadge client={c} /><FitnessBadge client={c} /></p>
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

// A small inline rename/delete row shared by the Region/Type/Exercise lists
// inside the "Add your own" popup.
function EditableChip({ label, editing, editVal, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete }) {
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

// A StarChip that, for admin-created (custom) items only, also carries inline
// rename + delete controls right in the picker — so a wrongly-added region,
// type or exercise can be fixed or removed on the spot without opening the
// "Add your own" popup. Built-in items render as a plain StarChip.
function ManageableChip({
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

// "Add your own" — a popup with two tabs: a step-by-step wizard for building
// a brand new region (Region name → Types → Exercises per type → Save), and
// a flat "Manage existing" editor (rename/delete) for anything already
// created. Saves land in the same stores AddExerciseWidget already reads, so
// the normal Region → Type → Exercises flow shows them automatically after.
function CustomTaxonomyModal({ onClose, onChanged }) {
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

// Step 1: Region name → Step 2: which exercise type(s) apply (checkboxes off
// every type already in use, or type your own) → Step 3: which exercises
// belong under each of those types (existing ones shown for reference, plus
// an add box) → Save commits everything to the custom stores in one go.
function CreateRegionWizard({ onSaved, onClose }) {
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

// Flat rename/delete editor for every custom region, type and exercise
// created so far — the old "Add your own" behavior, now split into its own
// tab alongside the step-by-step creation wizard above.
function ManageTaxonomyPanel({ onChanged }) {
  const [regions, setRegions] = useState(() => getCustomRegions())
  const [types, setTypes] = useState(() => getCustomTypes())
  const [regionDraft, setRegionDraft] = useState('')
  const [typeDraft, setTypeDraft] = useState('')
  const [editingRegion, setEditingRegion] = useState(null)
  const [editingType, setEditingType] = useState(null)
  const [expandedType, setExpandedType] = useState('')
  const [exDraft, setExDraft] = useState('')
  const [editingEx, setEditingEx] = useState(null)
  // Region-specific (inline-added) types & exercises management.
  const [manageRegion, setManageRegion] = useState('')
  const [expandedRTType, setExpandedRTType] = useState('')
  const [rtExDraft, setRtExDraft] = useState('')
  const [editingRegionType, setEditingRegionType] = useState(null)
  const [editingRTEx, setEditingRTEx] = useState(null)
  const [, forceTick] = useState(0)

  function refresh() { setRegions(getCustomRegions()); setTypes(getCustomTypes()); onChanged?.() }
  function refreshExercises() { forceTick((t) => t + 1); onChanged?.() }
  function bump() { forceTick((t) => t + 1); onChanged?.() }

  // Region-scoped type management (inline-added under a specific region).
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

      {/* Region-specific additions — types/exercises added inline under one
          region (e.g. Shoulder). Pick a region to rename or delete them. */}
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

// Which exercise TYPES make sense for a region — built-in mapping for known
// regions, everything for a custom (admin-added) region; global custom types
// (from the "Add your own" popup) are offered everywhere, plus any
// region-scoped types added inline for THIS region only.
function typesForAnyRegion(region, customTypes) {
  const builtIn = REHAB_REGIONS.includes(region) ? typesForRegion(region) : [...REGION_TYPES, ...WHOLE_BODY_TYPES]
  const merged = [...builtIn, ...customTypes.filter((t) => !builtIn.includes(t))]
  const regionScoped = getCustomTypesForRegion(region).filter((t) => !merged.includes(t))
  return [...merged, ...regionScoped]
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
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [typeDraft, setTypeDraft] = useState('') // inline "add type" for the selected region(s)
  const [typeScope, setTypeScope] = useState('all') // 'all' selected regions, or one region name
  const [exDraft, setExDraft] = useState({}) // inline "add exercise", keyed by "region|type"
  const [, forceTick] = useState(0) // bumped after a custom exercise/type is added, to refresh lists

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

  // The "Add your own" popup writes straight into the shared custom stores —
  // refresh what this widget reads once it's closed (or on each change).
  function refreshCustom() { setCustomRegions(getCustomRegions()); setCustomTypes(getCustomTypes()); forceTick((t) => t + 1) }

  // Inline "add type" — creates a region-scoped custom type and auto-selects
  // it so its exercise group opens right away. Scope decides which region(s)
  // get it: 'all' currently-selected regions, or one specific region. Either
  // way it's stored per region, so it never appears under regions that didn't
  // get it.
  function addTypeInline() {
    const n = typeDraft.trim(); if (!n || !selectedRegions.length) return
    const targets = typeScope === 'all' || !selectedRegions.includes(typeScope) ? selectedRegions : [typeScope]
    targets.forEach((r) => addCustomTypeForRegion(r, n))
    setSelectedTypes((ts) => (ts.some((x) => x.toLowerCase() === n.toLowerCase()) ? ts : [...ts, n]))
    setTypeDraft(''); forceTick((t) => t + 1)
  }

  // Inline "add exercise" — creates a region+type-scoped custom exercise and
  // ticks it, so it's included in this batch. Scoped to that exact region+type.
  function addExerciseInline(region, type) {
    const key = `${region}|${type}`
    const n = (exDraft[key] || '').trim(); if (!n) return
    addCustomExerciseForRegionType(region, type, n)
    setChecked((c) => (c.some((e) => e.region === region && e.type === type && e.name === n) ? c : [...c, { region, type, name: n }]))
    setExDraft((d) => ({ ...d, [key]: '' })); forceTick((t) => t + 1)
  }

  // ---- Inline rename / delete of admin-created items in the picker ----------
  const [editRegion, setEditRegion] = useState(null) // { old, val }
  const [editType, setEditType] = useState(null) // { old, val }
  const [editEx, setEditEx] = useState(null) // { region, type, old, val }

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

  // A custom type can be global (from the popup) and/or region-scoped under any
  // of the selected regions — rename/delete it wherever it lives for them.
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
          {/* Inline add — a new type scoped to the chosen region(s) */}
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
            const custom = getCustomExercises(type) // global (from popup)
            const rtCustom = getCustomExercisesForRegionType(region, type) // region+type scoped (inline)
            // read fresh each render; forceTick triggers the re-render after an add
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
                {/* Inline add — a new exercise just for THIS region + type */}
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

function Field({ label, children }) {
  return <div><label className="label text-[11px]">{label}</label>{children}</div>
}

function exercisesForAnyMerged(region, type) {
  const builtIn = exercisesFor(region, type)
  const merged = [...builtIn, ...getCustomExercises(type).filter((c) => !builtIn.includes(c))]
  const regionScoped = getCustomExercisesForRegionType(region, type).filter((c) => !merged.includes(c))
  return [...merged, ...regionScoped]
}

// One prescribed exercise: sets/reps/hold/resistance/frequency/rest/notes +
// progression, plus a bold "Mark as Completed" action for follow-up tracking.
// The exercise's identity (region/type/name) is editable in place via the
// pencil toggle — no need to remove and re-add to swap which exercise this is.
function ExerciseCard({ ex, onChange, onRemove, hideDone }) {
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

// One day's editor: date, home-program flag, session-completed flag, and the
// exercise list — always anchored BELOW the Add Exercise widget (stretches
// grouped in their own sub-section, matching the clinic's paper sheets).
function DayEditor({ day, allDays, onCopyFromDay, onOpenCrossPatientCopy, onApplyFullTemplate, onChangeDay }) {
  const exercises = day.exercises || []
  const main = exercises.filter((e) => e.type !== 'Stretching')
  const stretches = exercises.filter((e) => e.type === 'Stretching')
  const [copySource, setCopySource] = useState('')
  const [templates, setTemplates] = useState([])
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal] = useState('')

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

  // A template is a blank slate to prescribe fresh each time it's applied —
  // carry over the exercise identity and dosage, but never today's per-patient
  // notes, progression ticks, or completion state.
  async function saveAsTemplate() {
    const n = templateName.trim(); if (!n || !exercises.length) return
    try { await addRehabTemplate(n, [{ day: 1, exercises: exercises.map((e) => ({ ...e, done: false, notes: '', progression: [] })) }]) } catch (_) { /* rules may need publishing */ }
    setTemplateName(''); setSavingTemplate(false)
  }
  async function renameTemplate(id) {
    const n = renameVal.trim(); if (!n) return
    try { await updateRehabTemplate(id, { name: n }) } catch (_) { /* rules may need publishing */ }
    setRenamingId(null)
  }
  async function removeTemplate(id) {
    if (!window.confirm('Delete this template?')) return
    try { await deleteRehabTemplate(id) } catch (_) { /* rules may need publishing */ }
  }
  // Single-day quick-apply — brings just the template's Day 1 exercises into
  // the current day. Multi-day templates also get "Apply full plan" (below),
  // which populates the whole plan from Day 1 via onApplyFullTemplate.
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
  const [trackPlan, setTrackPlan] = useState(null)
  const [savedPlan, setSavedPlan] = useState(null) // just-saved plan, offered for immediate tracking
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

  // Applies every day of a (possibly multi-day) named template to this plan,
  // starting from Day 1 — extending the plan length if the template is
  // longer, and overwriting matching days (with confirmation) since this is
  // meant as "load this whole canned protocol onto this patient".
  function applyFullTemplate(template) {
    const tDays = templateDays(template)
    if (!tDays.length) return
    const hasExisting = form.days.some((d) => d.day <= tDays.length && (d.exercises || []).length > 0)
    if (hasExisting && !window.confirm(`Apply "${template.name}" (${tDays.length} day${tDays.length > 1 ? 's' : ''}) to this plan, starting from Day 1? This will overwrite Days 1-${tDays.length} where they already have exercises.`)) return
    const total = Math.max(form.totalDays, tDays.length)
    setForm((f) => {
      const newDays = Array.from({ length: total }, (_, i) => {
        const dayNum = i + 1
        const tDay = tDays.find((d) => d.day === dayNum)
        if (tDay) return { ...blankDay(dayNum, f.startDate), exercises: (tDay.exercises || []).map((e) => ({ ...e, done: false })) }
        return f.days[i] || blankDay(dayNum, f.startDate)
      })
      return { ...f, totalDays: total, days: newDays }
    })
    setDaysText(String(total))
    setActiveDay(1)
    setDirty(true)
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

      // A Treatment-only patient who's just been given a rehab plan is, by
      // definition, now on both — tag it automatically (best-effort).
      try {
        if (!Array.isArray(client.programs) || !client.programs.includes('W2W Fitness & Rehab')) {
          await updateClient(client.id, { programs: [...(Array.isArray(client.programs) ? client.programs : []), 'W2W Fitness & Rehab'] })
        }
      } catch (_) { /* best-effort */ }

      setSavedPlan({ ...data, id: planId })
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

          {savedPlan && (
            <button
              type="button" onClick={() => setTrackPlan(savedPlan)}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-violet-200 transition hover:scale-[1.01] hover:shadow-xl"
            >
              <LayoutGrid size={22} /> Open to Start Tracking <ArrowRight size={20} />
            </button>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to={`/admin/clients/${client.id}`} className="btn-primary">Open patient page <ArrowRight size={16} /></Link>
            <button onClick={() => { if (editId) navigate(`/admin/rehab?client=${client.id}`); else { setForm(blankPlan()); setActiveDay(1); setBillOpen(false); setSaved(false) } }} className="btn-outline">Add another plan</button>
            <button onClick={onChangeClient} className="btn-ghost">Another patient</button>
          </div>
        </div>
        {trackPlan && <RehabClusterTrack client={client} plan={trackPlan} plans={plans} onClose={() => setTrackPlan(null)} />}
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
              <p className="flex items-center text-sm text-slate-500">{client.clientId}<RehabBadge client={client} /><FitnessBadge client={client} /> · {client.phone}</p>
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
                        <button
                          type="button" onClick={() => setTrackPlan(p)} title="Open the cluster tracker for this plan"
                          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:scale-[1.03] hover:shadow-md"
                        >
                          <LayoutGrid size={14} /> Track Progress
                        </button>
                        <button type="button" onClick={() => guard(() => navigate(`/admin/rehab?client=${client.id}&plan=${p.id}`))} className="btn-primary px-3 py-1.5 text-xs">Update Plan <ArrowRight size={14} /></button>
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
                onApplyFullTemplate={applyFullTemplate}
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
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button" onClick={() => setTrackPlan(p)} title="Open the cluster tracker for this plan"
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:scale-[1.03] hover:shadow-md"
                  >
                    <LayoutGrid size={13} /> Track Progress
                  </button>
                  <Link to={`/admin/rehab?client=${client.id}&plan=${p.id}`} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><Pencil size={13} /> Update Plan</Link>
                  {!isPlanComplete(p) && <button type="button" onClick={() => markPlanComplete(p)} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"><CheckCircle2 size={13} /> Mark complete</button>}
                  <button type="button" onClick={() => removePlan(p)} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"><Trash2 size={13} /> Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showPerf && <RehabPerformance client={client} plans={plans} onClose={() => setShowPerf(false)} />}
      {trackPlan && <RehabClusterTrack client={client} plan={trackPlan} plans={plans} onClose={() => setTrackPlan(null)} />}
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
    // Combine every ticked day's exercises, in day order, into one list.
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

function blankTemplateDay(n) {
  return { day: n, exercises: [] }
}
function blankTemplateForm() {
  return { id: null, name: '', days: [blankTemplateDay(1)] }
}

// Standalone, patient-free multi-day template builder — reached from the
// "Create Rehab Templates" entry on the Rehab home page. Saves into the same
// top-level `rehabTemplates` collection DayEditor's "Save this day as
// template" writes to, so anything built here shows up in the per-patient
// plan editor automatically (single-day quick-apply and "Apply full plan").
function RehabTemplateManager({ onClose }) {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState(null) // null = list view
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
    try { await deleteRehabTemplate(t.id) } catch (_) { /* rules may need publishing */ }
  }

  function setTotalDays(raw) {
    const total = Math.max(1, Math.min(MAX_DAYS, Number(raw) || 1))
    setForm((f) => ({ ...f, days: Array.from({ length: total }, (_, i) => f.days[i] || blankTemplateDay(i + 1)) }))
  }
  // Same free-typing workaround as the plan-length field on the patient
  // planner — see handleDaysInput there for why it isn't a plain controlled number.
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
