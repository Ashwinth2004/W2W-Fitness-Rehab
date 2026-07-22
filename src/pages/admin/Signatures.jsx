import { useEffect, useMemo, useState } from 'react'
import { PenLine, Search, Trash2, X } from 'lucide-react'
import { watchClients, watchSignatures, saveSignature, deleteSignature } from '../../lib/firestore'
import { consentDeclarationFor } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import SignaturePad from '../../components/SignaturePad'

// Capture a patient's signature (drawn once) → stored per client → shown on the
// "Patient's signature" line of that client's generated reports.
export default function Signatures() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [sigs, setSigs] = useState([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)   // client currently being signed
  const [busy, setBusy] = useState(false)

  useEffect(() => watchClients(setClients), [])
  useEffect(() => watchSignatures(setSigs), [])

  const sigByClient = useMemo(() => {
    const m = {}
    sigs.forEach((s) => { m[s.clientId || s.id] = s })
    return m
  }, [sigs])

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const arr = term
      ? clients.filter((c) => [c.name, c.phone, c.clientId].filter(Boolean).join(' ').toLowerCase().includes(term))
      : clients
    return arr.slice(0, 100)
  }, [clients, q])

  async function handleSave(dataUrl) {
    if (!editing || !dataUrl) return
    setBusy(true)
    try {
      await saveSignature(editing.id, editing.name, dataUrl, user?.email || '')
      setEditing(null)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(client) {
    if (!window.confirm(`Delete ${client.name}'s signature?`)) return
    await deleteSignature(client.id)
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Signatures" />
      <p className="-mt-2 text-sm text-slate-500">
        Capture a patient's signature once — it then appears automatically on the “Patient's signature” line of their reports.
      </p>

      <div className="card flex items-center gap-2 p-3">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input
          className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder="Search by name, phone, or Client ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden p-0">
        {list.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">{clients.length ? 'No matching clients.' : 'No clients yet.'}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((c) => {
              const sig = sigByClient[c.id]
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.clientId || '—'}{c.phone ? ` · ${c.phone}` : ''}</p>
                  </div>
                  {sig ? (
                    <img src={sig.dataUrl} alt="signature" className="h-10 max-w-[140px] shrink-0 object-contain" />
                  ) : (
                    <span className="shrink-0 text-xs text-slate-400">No signature</span>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => setEditing(c)} className="btn-outline px-3 py-1.5 text-xs">
                      <PenLine size={14} /> {sig ? 'Edit' : 'Create'}
                    </button>
                    {sig && (
                      <button onClick={() => handleDelete(c)} title="Delete signature" className="grid h-8 w-8 place-items-center rounded text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4" onClick={() => !busy && setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-slate-900">{sigByClient[editing.id] ? 'Edit' : 'Create'} signature</h2>
                <p className="text-xs text-slate-500">{editing.name}{editing.clientId ? ` · ${editing.clientId}` : ''}</p>
              </div>
              <button onClick={() => !busy && setEditing(null)} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <p className="mb-3 max-h-28 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{consentDeclarationFor(editing.programs)}</p>
            <SignaturePad
              initial={sigByClient[editing.id]?.dataUrl || ''}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
              busy={busy}
            />
          </div>
        </div>
      )}
    </div>
  )
}
