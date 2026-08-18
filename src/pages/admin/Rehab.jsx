import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Dumbbell, Search, Loader2, Save, ArrowRight, Plus, CheckCircle2, BadgeCheck,
  IndianRupee, PlayCircle, LayoutGrid, TrendingUp,
} from 'lucide-react'
import {
  watchClients, addRehabPlan, updateRehabPlan, watchRehabPlans, deleteRehabPlan,
  watchServiceCharges, ensureRehabPackagesSeeded, setAccountingForRehabPlan, deleteAccountingForRehabPlan,
  updateClient,
} from '../../lib/firestore'
import { todayISO, fmtDate, addDaysISO } from '../../lib/format'
import { onlyDigits } from '../../lib/validate'
import { REHAB_MODULE_LIVE } from '../../lib/constants'
import PatientAvatar from '../../components/PatientAvatar'
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
import HomeVisitBadge from '../../components/HomeVisitBadge'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useUnsaved } from '../../context/UnsavedContext'
import {
  MAX_DAYS, PAY_MODES, blankDay, blankPlan, isPlanComplete,
  templateDays, templateExerciseCount,
  DayEditor, PlanTips, CopyFromPatientModal, RehabTemplateManager,
} from '../../components/RehabPlannerShared'

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

  useEffect(() => {
    return watchClients(setClients)
  }, [])

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
const isHomeVisitClient = (c) => Array.isArray(c?.programs) && c.programs.includes('W2W Home Visit')
const isHomeVisitOnlyClient = (c) => Array.isArray(c?.programs) && c.programs.length === 1 && c.programs[0] === 'W2W Home Visit'
const isRehabEligible = (c) => isRehabClient(c) || (isHomeVisitClient(c) && !isHomeVisitOnlyClient(c))

function RehabClientPicker({ clients, onPick, onNew, onTemplates, note }) {
  const [q, setQ] = useState('')
  const [showAll, setShowAll] = useState(false)
  const visibleClients = clients.filter((c) => !isHomeVisitOnlyClient(c))
  const rehabClients = visibleClients.filter(isRehabEligible)
  const pool = showAll ? visibleClients : rehabClients
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
          {showAll ? `No patients match "${q}".` : rehabClients.length === 0 ? 'No patients registered for W2W Fitness & Rehab yet.' : `No rehab patients match "${q}".`}
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
                    <p className="flex items-center gap-1 text-xs font-medium text-brand-600"><BadgeCheck size={13} /> {c.clientId}<RehabBadge client={c} /><FitnessBadge client={c} /><HomeVisitBadge client={c} /></p>
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

function RehabPlanner({ client, clients = [], editId = '', onChangeClient, navigate }) {
  const [plans, setPlans] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState(() => blankPlan(false))
  const [activeDay, setActiveDay] = useState(1)
  const [billOpen, setBillOpen] = useState(false)
  const [showPerf, setShowPerf] = useState(false)
  const [trackPlan, setTrackPlan] = useState(null)
  const [savedPlan, setSavedPlan] = useState(null)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [therapistInvalid, setTherapistInvalid] = useState(false)
  const [daysText, setDaysText] = useState(String(blankPlan(false).totalDays))
  const { setDirty, guard } = useUnsaved()
  const editLoaded = useRef(false)

  useEffect(() => watchRehabPlans(client.id, setPlans), [client.id])
  useEffect(() => watchServiceCharges(setServices), [])
  useEffect(() => { ensureRehabPackagesSeeded() }, [])
  useEffect(() => () => setDirty(false), [setDirty])

  useEffect(() => { setDaysText(String(form.totalDays)) }, [form.totalDays])

  const billBalance = Math.max(0, (Number(form.bill.amount) || 0) - (Number(form.bill.paid) || 0))
  const setBillMoney = (k) => (e) => { setForm((f) => ({ ...f, bill: { ...f.bill, [k]: onlyDigits(e.target.value).slice(0, 7) } })); setDirty(true) }

  useEffect(() => { setForm((f) => ({ ...f, therapist: f.therapist || plans[0]?.therapist || client.therapist || 'Sakthi Saravanan' })) }, [plans, client])

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

  useEffect(() => {
    if (!form.days.find((d) => d.day === activeDay)) setActiveDay(form.days[0]?.day || 1)
  }, [form.days, activeDay])

  function setTotalDays(raw) {
    const total = Math.max(1, Math.min(MAX_DAYS, Number(raw) || 1))
    setForm((f) => ({ ...f, totalDays: total, days: Array.from({ length: total }, (_, i) => f.days[i] || blankDay(i + 1, f.startDate)) }))
    setDirty(true)
  }

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

  function pickPackage(name, amount, classes) {
    setForm((f) => ({ ...f, bill: { ...f.bill, service: name, ...(amount != null ? { amount: String(amount) } : {}) } }))
    setBillOpen(true)
    if (classes) setTotalDays(classes)
    setDirty(true)
  }

  function copyFromDay(sourceDayNum) {
    const src = form.days.find((d) => d.day === sourceDayNum)
    if (!src || !activeDayData) return
    if (activeDayData.exercises?.length > 0 && !window.confirm(`Replace Day ${activeDayData.day}'s current exercises with Day ${sourceDayNum}'s?`)) return
    updateDay(activeDayData.day, { ...activeDayData, exercises: src.exercises.map((e) => ({ ...e, done: false, progression: [...e.progression] })) })
  }

  function applyExercisesToActiveDay(exercises) {
    if (!activeDayData) return
    updateDay(activeDayData.day, { ...activeDayData, exercises: [...(activeDayData.exercises || []), ...exercises] })
  }

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
      } catch (_) {}

      try {
        if (!Array.isArray(client.programs) || !client.programs.includes('W2W Fitness & Rehab')) {
          await updateClient(client.id, { programs: [...(Array.isArray(client.programs) ? client.programs : []), 'W2W Fitness & Rehab'] })
        }
      } catch (_) {}

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
    try { await deleteAccountingForRehabPlan(p.id) } catch (_) {}
  }

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
            <button onClick={() => { if (editId) navigate(`/admin/rehab?client=${client.id}`); else { setForm(blankPlan(false)); setActiveDay(1); setBillOpen(false); setSaved(false) } }} className="btn-outline">Add another plan</button>
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
              <p className="flex items-center text-sm text-slate-500">{client.clientId}<RehabBadge client={client} /><FitnessBadge client={client} /><HomeVisitBadge client={client} /> · {client.phone}</p>
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
