import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Plus, Search, X, BadgeCheck } from 'lucide-react'
import { watchClients, findClientByClientId } from '../../lib/firestore'
import { fmtDate, matchesDateFilter } from '../../lib/format'
import ContactActions from '../../components/ContactActions'
import AdminFilter from '../../components/AdminFilter'
import ClientForm from '../../components/ClientForm'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [lookupMsg, setLookupMsg] = useState('')
  const [dateFilter, setDateFilter] = useState({ day: '', month: '' })
  const navigate = useNavigate()

  useEffect(() => watchClients(setClients), [])

  const filtered = clients
    .filter((c) => matchesDateFilter(c.createdAt, dateFilter))
    .filter((c) =>
      !search ? true : [c.name, c.clientId, c.phone, c.email].join(' ').toLowerCase().includes(search.toLowerCase())
    )

  // Direct lookup by exact client ID (e.g. W2W-0007)
  async function handleLookup(e) {
    e.preventDefault()
    if (!/w2w-\d+/i.test(search)) return
    setLookupMsg('')
    const found = await findClientByClientId(search)
    if (found) navigate(`/admin/clients/${found.id}`)
    else setLookupMsg(`No client found with ID "${search}".`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Clients / Patients</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Close' : 'New Client'}
        </button>
      </div>

      {showForm && (
        <ClientForm
          clients={clients}
          onCreated={(id) => { setShowForm(false); navigate(`/admin/clients/${id}`) }}
          onClose={() => setShowForm(false)}
        />
      )}

      <form onSubmit={handleLookup} className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Search by name, phone, or enter Client ID (e.g. W2W-0007) and press Enter"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setLookupMsg('') }}
        />
      </form>
      {lookupMsg && <p className="text-sm text-red-500">{lookupMsg}</p>}

      <div className="card p-4"><AdminFilter filter={dateFilter} setFilter={setDateFilter} /></div>

      {filtered.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center">
          <Users className="text-slate-300" size={48} />
          <p className="mt-3 text-slate-400">{clients.length ? 'No matches.' : 'No clients yet. Add your first client.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/admin/clients/${c.id}`} className="card p-5 transition hover:shadow-soft">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
                    {c.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs font-medium text-brand-600"><BadgeCheck size={13} /> {c.clientId}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">Since {fmtDate(c.createdAt)}</p>
                <div onClick={(e) => e.preventDefault()}><ContactActions phone={c.phone} size="sm" /></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
