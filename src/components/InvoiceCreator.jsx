import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, Trash2, Star, FileDown, Send, Loader2, IndianRupee, Receipt, X, CheckCircle2,
} from 'lucide-react'
import {
  watchClients, watchServiceCharges, watchInvoiceServices, addInvoiceService,
  createInvoice, watchInvoices, deleteInvoice,
} from '../lib/firestore'
import { generateInvoice } from '../lib/pdf'
import { todayISO, fmtDate } from '../lib/format'
import { onlyDigits, isValidMobile } from '../lib/validate'
import DateField from './DateField'

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN')

const DEFAULT_TERMS =
  '1. Amount once paid is non-refundable.\n'
  + '2. Please retain this invoice for your records — it may be required for insurance or reimbursement claims.\n'
  + '3. For any billing queries, please contact us within 7 days of the invoice date.'

const blankItem = () => ({ name: '', qty: '1', price: '', amount: 0 })

// One line item — a free-typed name with a combined-services suggestions
// list underneath (clinic services from Accounting, read-only reuse here,
// plus this module's own invoice-only favorites). Picking a suggestion
// auto-fills the price; typing a brand-new name+price offers "Save as
// favorite", which writes ONLY to the invoice-only list — it deliberately
// never touches the shared serviceCharges collection.
function ItemRow({ item, onChange, onRemove, suggestions, onSaveFavorite }) {
  const [open, setOpen] = useState(false)
  const set = (k) => (v) => {
    const next = { ...item, [k]: v }
    const qty = Number(next.qty) || 0
    const price = Number(next.price) || 0
    next.amount = qty * price
    onChange(next)
  }
  const isKnown = suggestions.some((s) => s.name.toLowerCase() === item.name.trim().toLowerCase())
  const matches = item.name.trim()
    ? suggestions.filter((s) => s.name.toLowerCase().includes(item.name.trim().toLowerCase())).slice(0, 6)
    : suggestions.slice(0, 6)

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-2 pr-2">
        <div className="relative">
          <input
            className="input h-9 text-sm" value={item.name} placeholder="Item / service name"
            onChange={(e) => set('name')(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && matches.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl">
              {matches.map((s) => (
                <li key={s.source + s.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); const next = { ...item, name: s.name, price: String(s.amount) }; next.amount = (Number(next.qty) || 0) * s.amount; onChange(next); setOpen(false) }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-brand-50"
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{rs(s.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {item.name.trim() && !isKnown && (
          <button type="button" onClick={() => onSaveFavorite(item.name.trim(), item.price)} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline">
            <Star size={11} /> Save as favorite
          </button>
        )}
      </td>
      <td className="w-16 py-2 pr-2"><input className="input h-9 text-center text-sm" inputMode="numeric" value={item.qty} onChange={(e) => set('qty')(onlyDigits(e.target.value).slice(0, 3) || '1')} /></td>
      <td className="w-28 py-2 pr-2"><input className="input h-9 text-sm" inputMode="numeric" value={item.price} placeholder="0" onChange={(e) => set('price')(onlyDigits(e.target.value).slice(0, 8))} /></td>
      <td className="w-28 py-2 pr-2 pt-4 text-right text-sm font-semibold text-slate-700">{rs(item.amount)}</td>
      <td className="w-9 py-2 pt-3">
        <button type="button" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
      </td>
    </tr>
  )
}

export default function InvoiceCreator() {
  const [clients, setClients] = useState([])
  const [serviceCharges, setServiceCharges] = useState([])
  const [invoiceServices, setInvoiceServices] = useState([])
  const [recent, setRecent] = useState([])

  const [lookup, setLookup] = useState('')
  const [pickedClient, setPickedClient] = useState(null)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [date, setDate] = useState(todayISO())
  const [items, setItems] = useState([blankItem()])
  const [received, setReceived] = useState('')
  const [terms, setTerms] = useState(DEFAULT_TERMS)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => watchClients(setClients), [])
  useEffect(() => watchServiceCharges(setServiceCharges), [])
  useEffect(() => watchInvoiceServices(setInvoiceServices), [])
  useEffect(() => watchInvoices(setRecent), [])

  // Combined suggestion list — clinic services (reused, read-only here) +
  // this module's own favorites — de-duplicated by name.
  const suggestions = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const s of [...invoiceServices, ...serviceCharges]) {
      const key = (s.name || '').trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push({ name: s.name, amount: Number(s.amount) || 0, source: invoiceServices.includes(s) ? 'invoice' : 'clinic' })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }, [invoiceServices, serviceCharges])

  const matches = useMemo(() => {
    const q = lookup.trim().toLowerCase()
    if (!q || pickedClient) return []
    return clients
      .filter((c) => [c.name, c.phone, c.clientId].filter(Boolean).join(' ').toLowerCase().includes(q))
      .slice(0, 6)
  }, [lookup, clients, pickedClient])

  function pickClient(c) {
    setPickedClient(c); setLookup(''); setClientName(c.name || ''); setClientPhone(c.phone || '')
  }
  function clearClient() {
    setPickedClient(null); setClientName(''); setClientPhone('')
  }

  function updateItem(i, next) { setItems((arr) => arr.map((it, idx) => (idx === i ? next : it))) }
  function removeItem(i) { setItems((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr)) }
  function addItem() { setItems((arr) => [...arr, blankItem()]) }
  async function saveFavorite(name, price) {
    try { await addInvoiceService(name, price) } catch (_) { /* rules may need publishing */ }
  }

  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const receivedNum = Math.max(0, Number(received) || 0)
  const balance = Math.max(0, subtotal - receivedNum)

  function resetForm() {
    setPickedClient(null); setClientName(''); setClientPhone(''); setDate(todayISO())
    setItems([blankItem()]); setReceived(''); setTerms(DEFAULT_TERMS); setMsg(''); setError('')
  }

  async function go(action) {
    setError(''); setMsg('')
    const name = clientName.trim()
    const phone = clientPhone.trim()
    const validItems = items.filter((it) => it.name.trim() && Number(it.amount) > 0)
    if (!name) { setError('Enter or pick the client’s name.'); return }
    if (phone && !isValidMobile(phone)) { setError('Enter a valid 10-digit contact number, or leave it blank.'); return }
    if (!validItems.length) { setError('Add at least one item with a price.'); return }
    setBusy(action)
    try {
      const { invoiceNo } = await createInvoice({
        date, clientName: name, clientPhone: phone, clientDocId: pickedClient?.id || null,
        items: validItems.map((it) => ({ name: it.name.trim(), qty: Number(it.qty) || 1, price: Number(it.price) || 0, amount: Number(it.amount) || 0 })),
        subtotal, received: receivedNum, balance, terms,
      })
      const res = await generateInvoice({ invoiceNo, date, clientName: name, clientPhone: phone, items: validItems, received: receivedNum, terms }, { action })
      setMsg(res === 'shared' ? `Invoice ${invoiceNo} shared.` : res === 'downloaded' ? `Invoice ${invoiceNo} downloaded.` : `Invoice ${invoiceNo} saved.`)
    } catch (err) {
      console.error('invoice failed:', err)
      setError('Could not create the invoice. Please try again.')
    }
    setBusy('')
  }

  async function redownload(inv) {
    try { await generateInvoice(inv, { action: 'download' }) } catch (_) { /* best-effort */ }
  }
  async function removeInvoice(inv) {
    if (!window.confirm(`Delete invoice ${inv.invoiceNo}? This cannot be undone.`)) return
    try { await deleteInvoice(inv.id) } catch (_) {}
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Receipt size={22} /></div>
          <div>
            <h2 className="font-bold text-slate-900">Create Invoice</h2>
            <p className="text-sm text-slate-500">Pick an existing client or enter details manually, add items, and generate a branded Tax Invoice PDF.</p>
          </div>
        </div>

        {/* Client */}
        {pickedClient ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-brand-50 px-4 py-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-800">{pickedClient.name} <span className="font-normal text-slate-500">· {pickedClient.clientId}</span></p>
              <p className="text-xs text-slate-500">{pickedClient.phone}</p>
            </div>
            <button type="button" onClick={clearClient} className="rounded-full p-1.5 text-slate-400 hover:bg-white"><X size={16} /></button>
          </div>
        ) : (
          <div className="relative">
            <label className="label text-xs">Find existing client (optional)</label>
            <Search className="pointer-events-none absolute left-3 top-[34px] text-slate-400" size={16} />
            <input className="input pl-9" value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Search by name, phone or ID…" />
            {matches.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => pickClient(c)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50">
                      <span className="font-medium text-slate-800">{c.name}</span>
                      <span className="text-xs text-slate-500">{c.clientId} · {c.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!pickedClient && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label text-xs">Client name *</label><input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Full name" /></div>
            <div><label className="label text-xs">Contact number</label><input className="input" inputMode="numeric" value={clientPhone} onChange={(e) => setClientPhone(onlyDigits(e.target.value).slice(0, 10))} placeholder="10-digit mobile" /></div>
          </div>
        )}

        <div className="max-w-xs">
          <label className="label text-xs">Invoice date</label>
          <DateField value={date} onChange={setDate} />
        </div>

        {/* Items */}
        <div>
          <label className="label text-xs">Items</label>
          <div className="overflow-x-auto rounded-xl border border-slate-200 p-3">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Item name</th><th className="pb-2">Qty</th><th className="pb-2">Price/Unit</th><th className="pb-2 text-right">Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <ItemRow key={i} item={it} onChange={(next) => updateItem(i, next)} onRemove={() => removeItem(i)} suggestions={suggestions} onSaveFavorite={saveFavorite} />
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addItem} className="btn-outline mt-2 px-3 py-1.5 text-xs"><Plus size={14} /> Add item</button>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-2xl border border-slate-100 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-700"><IndianRupee size={15} /> Payment</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label text-xs">Subtotal</label><p className="input flex items-center bg-slate-50 font-semibold text-slate-700">{rs(subtotal)}</p></div>
            <div>
              <label className="label text-xs">Amount received</label>
              <input className="input" inputMode="numeric" value={received} onChange={(e) => setReceived(onlyDigits(e.target.value).slice(0, 8))} placeholder="0" />
            </div>
            <div><label className="label text-xs">Balance due</label><p className={`input flex items-center bg-slate-50 font-semibold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{rs(balance)}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setReceived(String(subtotal))} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Mark fully received (before/after treatment)</button>
            <button type="button" onClick={() => setReceived('')} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Mark as balance / unpaid</button>
          </div>
        </div>

        {/* Terms */}
        <div>
          <label className="label text-xs">Terms and Conditions</label>
          <textarea className="input min-h-[80px]" value={terms} onChange={(e) => setTerms(e.target.value)} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={resetForm} className="btn-ghost">Clear</button>
          <button type="button" onClick={() => go('share')} disabled={!!busy} className="btn-outline">{busy === 'share' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send</button>
          <button type="button" onClick={() => go('download')} disabled={!!busy} className="btn-primary">{busy === 'download' ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} Create &amp; Download</button>
        </div>
        {msg && <p className="flex items-center justify-end gap-1.5 text-right text-sm text-emerald-600"><CheckCircle2 size={15} /> {msg}</p>}
      </div>

      {/* Recent invoices */}
      {recent.length > 0 && (
        <div className="card p-5 md:p-6">
          <h3 className="mb-3 font-bold text-slate-900">Recent Invoices</h3>
          <div className="space-y-2">
            {recent.slice(0, 15).map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{inv.invoiceNo} · {inv.clientName}</p>
                  <p className="text-xs text-slate-500">{fmtDate(inv.date)} · {rs(inv.subtotal)} {inv.balance > 0 ? `· Balance ${rs(inv.balance)}` : '· Paid'}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => redownload(inv)} title="Download again" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-brand-50 hover:text-brand-600"><FileDown size={15} /></button>
                  <button type="button" onClick={() => removeInvoice(inv)} title="Delete" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
