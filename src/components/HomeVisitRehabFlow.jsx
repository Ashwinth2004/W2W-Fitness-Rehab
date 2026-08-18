import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Save, CheckCircle2, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react'
import {
  watchRehabPlans, addRehabPlan, updateRehabPlan, deleteRehabPlan,
  setAccountingForRehabPlan, deleteAccountingForRehabPlan,
} from '../lib/firestore'
import { todayISO, fmtDate, addDaysISO } from '../lib/format'
import { onlyDigits } from '../lib/validate'
import DateField from './DateField'
import TherapistSelect from './TherapistSelect'
import ServiceSelect from './ServiceSelect'
import RehabClusterTrack from './RehabClusterTrack'
import AdminPageHeader from './AdminPageHeader'

const MAX_DAYS = 60
const PAY_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']

function blankDay(n, startDate) {
  return { day: n, date: startDate ? addDaysISO(startDate, n - 1) : '', home: true, completed: false, exercises: [] }
}

function blankPlan() {
  const start = todayISO()
  return {
    startDate: start, totalDays: 7, therapist: '', reason: '', note: '',
    bill: { service: '', amount: '', paid: '', mode: 'Cash', addToAccounting: true },
    days: [blankDay(1, start), blankDay(2, start)],
  }
}

export default function HomeVisitRehabFlow({ client, role, onChangeClient, navigate }) {
  const [plans, setPlans] = useState([])
  const [services, setServices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState('')
  const [form, setForm] = useState(blankPlan())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => setDirty(false), [])
  useEffect(() => watchRehabPlans(client.id, setPlans), [client.id])

  const billBalance = Math.max(0, (Number(form.bill.amount) || 0) - (Number(form.bill.paid) || 0))

  async function savePlan(e) {
    e?.preventDefault?.()
    setBusy(true)
    setError('')
    try {
      const billData = {
        service: (form.bill.service || '').trim(),
        amount: Number(form.bill.amount) || 0,
        paid: Number(form.bill.paid) || 0,
        balance: billBalance,
        mode: form.bill.mode,
        addToAccounting: form.bill.addToAccounting !== false,
      }
      const data = {
        startDate: form.startDate || todayISO(),
        totalDays: Number(form.totalDays) || 1,
        therapist: (form.therapist || '').trim(),
        reason: (form.reason || '').trim(),
        note: (form.note || '').trim(),
        bill: billData,
        days: form.days,
      }

      if (editId) {
        await updateRehabPlan(client.id, editId, data)
      } else {
        await addRehabPlan(client.id, data)
      }

      if (billData.addToAccounting && (billData.amount > 0 || billData.paid > 0)) {
        const planId = editId || Object.keys(plans)[0]
        await setAccountingForRehabPlan(planId, {
          date: data.startDate,
          clientId: client.clientId,
          clientDocId: client.id,
          clientName: client.name,
          service: billData.service,
          therapist: data.therapist,
          amount: billData.amount,
          paid: billData.paid,
          balance: billData.balance,
          mode: billData.mode,
        })
      }

      setShowForm(false)
      setEditId('')
      setForm(blankPlan())
      setBusy(false)
    } catch (err) {
      console.error('save plan failed:', err)
      setError('Could not save. Please try again.')
      setBusy(false)
    }
  }

  async function deletePlan(planId) {
    if (!window.confirm('Delete this plan? This cannot be undone.')) return
    try {
      await deleteRehabPlan(client.id, planId)
      await deleteAccountingForRehabPlan(planId)
    } catch (_) {}
  }

  if (showForm) {
    return (
      <form onSubmit={savePlan} className="space-y-5">
        <AdminPageHeader title="Home Visit - Rehab & Exercise">
          <button type="button" onClick={() => setShowForm(false)} className="text-sm font-medium text-brand-600 hover:underline">Back to plans</button>
        </AdminPageHeader>

        <div className="card space-y-4 p-5 md:p-6">
          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-lg font-bold text-slate-900">{client.name}</p>
            <p className="text-sm text-slate-500">{client.clientId} · {client.phone}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label text-sm">Therapist *</label>
              <TherapistSelect value={form.therapist} onChange={(v) => setForm({...form, therapist: v})} />
            </div>
            <div>
              <label className="label text-sm">Start date</label>
              <DateField value={form.startDate} onChange={(iso) => setForm({...form, startDate: iso})} max={todayISO()} />
            </div>
          </div>

          <div>
            <label className="label text-sm">Reason / Diagnosis</label>
            <input className="input" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} placeholder="Why this plan?" />
          </div>

          <div>
            <label className="label text-sm">Charges &amp; Billing</label>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="label text-xs">Service</label>
                <ServiceSelect value={form.bill.service} services={services} onChange={(name, amount) => setForm({...form, bill: {...form.bill, service: name, amount: String(amount || '')}})} />
              </div>
              <div>
                <label className="label text-xs">Amount (Rs.)</label>
                <input className="input" inputMode="numeric" value={form.bill.amount} onChange={(e) => setForm({...form, bill: {...form.bill, amount: onlyDigits(e.target.value).slice(0, 7)}})} placeholder="0" />
              </div>
              <div>
                <label className="label text-xs">Paid (Rs.)</label>
                <input className="input" inputMode="numeric" value={form.bill.paid} onChange={(e) => setForm({...form, bill: {...form.bill, paid: onlyDigits(e.target.value).slice(0, 7)}})} placeholder="0" />
              </div>
              <div>
                <label className="label text-xs">Mode</label>
                <select className="input" value={form.bill.mode} onChange={(e) => setForm({...form, bill: {...form.bill, mode: e.target.value}})}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</select>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">Balance due</span>
              <span className={`font-bold ${billBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Rs. {billBalance.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {editId ? 'Update' : 'Create'} Plan</button>
          </div>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Home Visit - Rehab & Exercise">
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} /> New Exercise Plan</button>
      </AdminPageHeader>

      <div className="card p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{client.name}</h2>
            <p className="text-sm text-slate-500">{client.clientId} · Home Visit - Rehab & Exercise [R]</p>
          </div>
          <button type="button" onClick={onChangeClient} className="btn-ghost">Different client</button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-slate-500">No exercise plans yet. Click "New Exercise Plan" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">Days {plan.startDate ? fmtDate(plan.startDate) : 'N/A'}</p>
                  <p className="text-sm text-slate-500">{plan.totalDays} days · Therapist: {plan.therapist || 'N/A'}</p>
                  {plan.reason && <p className="mt-1 text-sm text-slate-600">{plan.reason}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setEditId(plan.id); setShowForm(true) }} className="btn-outline px-3 py-1.5 text-sm"><Pencil size={14} /> Edit</button>
                  <button type="button" onClick={() => deletePlan(plan.id)} className="btn-ghost px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              {plan.days && plan.days.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <RehabClusterTrack client={client} plans={[plan]} editingPlanId={plan.id} onUpdate={() => setPlans([...plans])} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
