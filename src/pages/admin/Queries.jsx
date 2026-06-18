import { useEffect, useState } from 'react'
import { Inbox, Trash2, Check, Search } from 'lucide-react'
import { watchEnquiries, setEnquiryStatus, deleteEnquiry } from '../../lib/firestore'
import { fmtDateTime, matchesDateFilter } from '../../lib/format'
import ContactActions from '../../components/ContactActions'
import StatusBadge from '../../components/StatusBadge'
import AdminFilter from '../../components/AdminFilter'

export default function Queries() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState({ day: '', month: '' })

  useEffect(() => watchEnquiries(setItems), [])

  const filtered = items
    .filter((e) => (filter === 'all' ? true : filter === 'new' ? e.status === 'new' : e.status === 'read'))
    .filter((e) => matchesDateFilter(e.createdAt, dateFilter))
    .filter((e) =>
      !search ? true : [e.name, e.phone, e.email, e.service, e.message].join(' ').toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Enquiries</h1>
        <div className="flex items-center gap-2">
          {['all', 'new', 'read'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition ${
                filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
        <input className="input pl-10" placeholder="Search name, phone, service…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card p-4"><AdminFilter filter={dateFilter} setFilter={setDateFilter} /></div>

      {filtered.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center">
          <Inbox className="text-slate-300" size={48} />
          <p className="mt-3 text-slate-400">No enquiries here yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((e) => (
            <div key={e.id} className={`card p-5 ${e.status === 'new' ? 'ring-2 ring-red-200' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{e.name}</h3>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {e.service} · {fmtDateTime(e.createdAt)}
                  </p>
                  {e.email && <p className="text-sm text-slate-500">{e.email}</p>}
                </div>
                <ContactActions phone={e.phone} showNumber />
              </div>
              {e.message && <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{e.message}</p>}
              <div className="mt-4 flex justify-end gap-2">
                {e.status === 'new' && (
                  <button onClick={() => setEnquiryStatus(e.id, 'read')} className="btn-ghost px-3 py-1.5 text-sm">
                    <Check size={16} /> Mark read
                  </button>
                )}
                <button
                  onClick={() => window.confirm('Delete this enquiry?') && deleteEnquiry(e.id)}
                  className="btn-ghost px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
