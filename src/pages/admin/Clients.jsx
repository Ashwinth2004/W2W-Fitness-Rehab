import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Plus, Search, X, BadgeCheck, Stethoscope, Dumbbell, Activity } from 'lucide-react'
import { watchClients, findClientByClientId } from '../../lib/firestore'
import { fmtDate, matchesDateFilter } from '../../lib/format'
import ContactActions from '../../components/ContactActions'
import AdminFilter from '../../components/AdminFilter'
import ClientForm from '../../components/ClientForm'
import AdminPageHeader from '../../components/AdminPageHeader'
import RehabBadge from '../../components/RehabBadge'
import FitnessBadge from '../../components/FitnessBadge'
import PatientAvatar from '../../components/PatientAvatar'

// A client can be enrolled in any combination of programs — a client on
// several shows up under each matching single-program filter as well as "All".
const isPhysioClient = (c) => Array.isArray(c?.programs) && c.programs.includes('W2W Treatment')
const isRehabClient = (c) => Array.isArray(c?.programs) && c.programs.includes('W2W Fitness & Rehab')
const isFitnessClient = (c) => Array.isArray(c?.programs) && c.programs.includes('W2W Fitness')
const PROGRAM_FILTERS = [
  { key: 'all', label: 'All', icon: Users },
  { key: 'physio', label: 'Physio', icon: Stethoscope },
  { key: 'rehab', label: 'Rehab & Exercises', icon: Dumbbell },
  { key: 'fitness', label: 'Fitness', icon: Activity },
]

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [lookupMsg, setLookupMsg] = useState('')
  const [dateFilter, setDateFilter] = useState({ day: '', month: '' })
  const [programFilter, setProgramFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => watchClients(setClients), [])

  const programPool = programFilter === 'physio' ? clients.filter(isPhysioClient)
    : programFilter === 'rehab' ? clients.filter(isRehabClient)
    : programFilter === 'fitness' ? clients.filter(isFitnessClient)
    : clients

  const filtered = programPool
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
      <AdminPageHeader title="Clients / Patients">
        <button onClick={() => { setShowForm((v) => !v); if (searchParams.get('new')) setSearchParams({}) }} className="btn-primary">
          {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Close' : 'New Client'}
        </button>
      </AdminPageHeader>

      {showForm && (
        <ClientForm
          clients={clients}
          onCreated={(id, dest) => { setShowForm(false); navigate(dest === 'treatment' ? `/admin/treatment?client=${id}` : `/admin/clients/${id}`) }}
          onClose={() => { setShowForm(false); if (searchParams.get('new')) setSearchParams({}) }}
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

      <div className="card space-y-2 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Filter by program</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAM_FILTERS.map((f) => {
            const count = f.key === 'physio' ? clients.filter(isPhysioClient).length
              : f.key === 'rehab' ? clients.filter(isRehabClient).length
              : f.key === 'fitness' ? clients.filter(isFitnessClient).length
              : clients.length
            const active = programFilter === f.key
            return (
              <button
                key={f.key} type="button" onClick={() => setProgramFilter(f.key)}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition ${
                  active ? 'border-brand-600 bg-brand-600 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-white/20' : 'bg-brand-50 text-brand-600'}`}>
                  <f.icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold leading-tight">{f.label}</span>
                  <span className={`block text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>{count} patient{count === 1 ? '' : 's'}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card p-4"><AdminFilter filter={dateFilter} setFilter={setDateFilter} /></div>

      {filtered.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center">
          <Users className="text-slate-300" size={48} />
          <p className="mt-3 text-slate-400">
            {clients.length
              ? (programFilter !== 'all' ? `No ${PROGRAM_FILTERS.find((f) => f.key === programFilter)?.label.toLowerCase()} patients match.` : 'No matches.')
              : 'No clients yet. Add your first client.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/admin/clients/${c.id}`} className="card p-5 transition hover:shadow-soft">
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
                <div onClick={(e) => e.preventDefault()}><ContactActions phone={c.phone} size="sm" /></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
