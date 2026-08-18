import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader2, Save, CheckCircle2, ArrowRight, Plus, IndianRupee, LayoutGrid, TrendingUp,
  Pencil, Trash2, PlayCircle, X,
} from 'lucide-react'
import {
  watchRehabPlans, addRehabPlan, updateRehabPlan, deleteRehabPlan,
  watchServiceCharges, ensureRehabPackagesSeeded,
  setAccountingForRehabPlan, deleteAccountingForRehabPlan,
  updateClient,
} from '../lib/firestore'
import { todayISO, fmtDate, addDaysISO } from '../lib/format'
import { onlyDigits } from '../lib/validate'
import DateField from './DateField'
import TherapistSelect from './TherapistSelect'
import ServiceSelect from './ServiceSelect'
import FavSelect from './FavSelect'
import PackagePriceList from './PackagePriceList'
import RehabPerformance from './RehabPerformance'
import RehabClusterTrack from './RehabClusterTrack'
import AdminPageHeader from './AdminPageHeader'
import { useUnsaved } from '../context/UnsavedContext'
import {
  MAX_DAYS, PAY_MODES, blankDay, blankPlan, isPlanComplete,
  templateDays, DayEditor, PlanTips, CopyFromPatientModal,
} from './RehabPlannerShared'

export default function HomeVisitRehabFlow({ client, role, onChangeClient, navigate }) {
  const [plans, setPlans] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState(() => blankPlan(true))
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
  const [daysText, setDaysText] = useState(String(blankPlan(true).totalDays))
  const { setDirty, guard } = useUnsaved()
  const editLoaded = useRef(false)

  useEffect(() => watchRehabPlans(client.id, setPlans), [client.id])
  useEffect(() => { if (role !== 'homevisit') watchServiceCharges(setServices) }, [role])
  useEffect(() => { ensureRehabPackagesSeeded() }, [])
  useEffect(() => () => setDirty(false), [setDirty])

  useEffect(() => { setDaysText(String(form.totalDays)) }, [form.totalDays])

  const billBalance = Math.max(0, (Number(form.bill.amount) || 0) - (Number(form.bill.paid) || 0))
  const setBillMoney = (k) => (e) => { setForm((f) => ({ ...f, bill: { ...f.bill, [k]: onlyDigits(e.target.value).slice(0, 7) } })); setDirty(true) }

  useEffect(() => { setForm((f) => ({ ...f, therapist: f.therapist || client.therapist || 'Sakthi Saravanan' })) }, [client])

  useEffect(() => {
    if (!plans.length) return
    const p = plans[0]
    editLoaded.current = true
    setForm({
      startDate: p.startDate || todayISO(),
      totalDays: p.totalDays || p.days?.length || 7,
      therapist: p.therapist || '',
      reason: p.reason || '',
      note: p.note || '',
      bill: {
        service: p.bill?.service || '', amount: p.bill?.amount != null ? String(p.bill.amount) : '',
        paid: p.bill?.paid != null ? String(p.bill.paid) : '', mode: p.bill?.mode || 'Cash',
        addToAccounting: p.bill?.addToAccounting !== false,
      },
      days: p.days?.length ? p.days : [blankDay(1, p.startDate, true)],
    })
    if (p.bill?.service) setBillOpen(true)
    setActiveDay(1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.days.find((d) => d.day === activeDay)) setActiveDay(form.days[0]?.day || 1)
  }, [form.days, activeDay])

  function setTotalDays(raw) {
    const total = Math.max(1, Math.min(MAX_DAYS, Number(raw) || 1))
    setForm((f) => ({ ...f, totalDays: total, days: Array.from({ length: total }, (_, i) => f.days[i] || blankDay(i + 1, f.startDate, true)) }))
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
        if (tDay) return { ...blankDay(dayNum, f.startDate, true), exercises: (tDay.exercises || []).map((e) => ({ ...e, done: false })) }
        return f.days[i] || blankDay(dayNum, f.startDate, true)
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
      requestAnimationFrame(() => document.getElementById('hv-rehab-therapist')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
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

      await addRehabPlan(client.id, data)

      if (role !== 'homevisit') {
        try {
          if (billData.addToAccounting && (billData.amount > 0 || billData.paid > 0)) {
            await setAccountingForRehabPlan(client.id, {
              date: form.startDate, clientId: client.clientId, clientDocId: client.id, clientName: client.name,
              service: billData.service, therapist: form.therapist,
              amount: billData.amount, paid: billData.paid, balance: billData.balance, mode: billData.mode,
            })
          }
        } catch (_) {}
      }

      try {
        if (!Array.isArray(client.programs) || !client.programs.includes('W2W Home Visit')) {
          await updateClient(client.id, { programs: [...(Array.isArray(client.programs) ? client.programs : []), 'W2W Home Visit'] })
        }
      } catch (_) {}

      setSavedPlan({ ...data })
      setDirty(false); setSaved(true)
    } catch (err) {
      console.error('save home visit rehab plan failed:', err)
      setError('Could not save the plan. Please try again.')
    }
    setBusy(false)
  }

  async function removePlan(p) {
    if (!window.confirm(`Delete this ${p.totalDays || p.days?.length || ''}-day rehab plan? This cannot be undone.`)) return
    await deleteRehabPlan(client.id, p.id)
    if (role !== 'homevisit') {
      try { await deleteAccountingForRehabPlan(p.id) } catch (_) {}
    }
  }

  async function markPlanComplete(p) {
    if (!window.confirm('Mark every day and exercise in this plan as completed?')) return
    const days = (p.days || []).map((d) => ({ ...d, completed: true, exercises: (d.exercises || []).map((e) => ({ ...e, done: true })) }))
    await updateRehabPlan(client.id, p.id, { ...p, days })
  }

  const activeDayData = form.days.find((d) => d.day === activeDay) || form.days[0]

  if (saved) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Home Visit - Rehab & Exercise" />
        <div className="card mx-auto max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-500" size={48} />
          <h2 className="mt-3 text-xl font-bold">Rehab plan saved</h2>
          <p className="mt-1 text-slate-500">
            {form.totalDays}-day plan created for {client.name} ({client.clientId}){form.bill.service ? ` — ${form.bill.service}` : ''}.
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
            <button onClick={() => { setForm(blankPlan(true)); setActiveDay(1); setBillOpen(false); setSaved(false); setSavedPlan(null) }} className="btn-outline">Add another plan</button>
            <button onClick={onChangeClient} className="btn-ghost">Another patient</button>
          </div>
        </div>
        {trackPlan && <RehabClusterTrack client={client} plan={trackPlan} plans={plans} onClose={() => setTrackPlan(null)} />}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="space-y-5">
        <AdminPageHeader title="Home Visit - Rehab & Exercise">
          <button type="button" onClick={() => guard(onChangeClient)} className="text-sm font-medium text-brand-600 hover:underline">Change patient</button>
        </AdminPageHeader>

        <div className="card space-y-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{client.name}</p>
              <p className="flex items-center text-sm text-slate-500">{client.clientId} · Home Visit - Rehab & Exercise [R] · {client.phone}</p>
            </div>
            <button type="button" onClick={() => guard(onChangeClient)} className="btn-outline shrink-0 px-3 py-1.5 text-xs">Change patient</button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label text-sm">Prescribed by (Physiotherapist) *</label>
              <TherapistSelect id="hv-rehab-therapist" invalid={therapistInvalid} value={form.therapist} onChange={(v) => { setForm((f) => ({ ...f, therapist: v })); setDirty(true); setTherapistInvalid(false) }} />
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

        {role !== 'homevisit' && (
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
              <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save plan</button>
            </div>
          )}
        </div>
        )}

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

        <PlanTips days={form.days} activeDayData={activeDayData} />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => guard(onChangeClient)} className="btn-ghost">Cancel</button>
          {role !== 'homevisit' && (
            <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save plan</button>
          )}
        </div>
      </form>

      {plans.length > 0 && role !== 'homevisit' && (
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
          clients={[client]}
          currentClientId={client.id}
          onApply={applyExercisesToActiveDay}
          onClose={() => setCopyModalOpen(false)}
        />
      )}
    </div>
  )
}
