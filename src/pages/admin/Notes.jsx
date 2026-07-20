// "Notes & Goals" — a lightweight, Google-Keep-style scratchpad for the admin:
// quick notes (free text or a checklist of goals/to-dos), taggable, colour-
// coded, searchable, sortable, and archivable. Not patient data — this is the
// clinic's own internal notebook, so it lives as its own top-level module.
import { useEffect, useMemo, useState } from 'react'
import {
  StickyNote, Plus, X, Search, Trash2, Archive, ArchiveRestore,
  Type, ListChecks, Check, Loader2, LayoutGrid,
} from 'lucide-react'
import { watchNotes, addNote, updateNote, deleteNote } from '../../lib/firestore'
import { fmtDateTime } from '../../lib/format'
import AdminPageHeader from '../../components/AdminPageHeader'

const COLORS = [
  { id: '', label: 'Default' },
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'purple', label: 'Purple' },
  { id: 'pink', label: 'Pink' },
  { id: 'slate', label: 'Slate' },
]
const SWATCH_DOT = {
  red: 'bg-red-500', orange: 'bg-orange-500', green: 'bg-green-500', blue: 'bg-blue-500',
  purple: 'bg-purple-500', pink: 'bg-pink-500', slate: 'bg-slate-500',
}
const CARD_BG = {
  '': 'bg-white border-slate-100',
  red: 'bg-red-50 border-red-200', orange: 'bg-orange-50 border-orange-200',
  green: 'bg-green-50 border-green-200', blue: 'bg-blue-50 border-blue-200',
  purple: 'bg-purple-50 border-purple-200', pink: 'bg-pink-50 border-pink-200',
  slate: 'bg-slate-100 border-slate-300',
}

function blankNote() {
  return { title: '', type: 'text', content: '', items: [], tags: [], color: '', archived: false }
}

function parseTags(s) {
  return String(s || '').split(',').map((t) => t.trim()).filter(Boolean)
}

export default function Notes() {
  const [notes, setNotes] = useState(null) // null = still loading
  useEffect(() => watchNotes(setNotes), [])
  const loading = notes === null
  const list = notes || []
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState('updated')
  const [tagFilter, setTagFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'text' | 'checklist'
  const [showArchived, setShowArchived] = useState(false)
  const [modalNote, setModalNote] = useState(null) // note object being created/edited, or null

  const allTags = useMemo(() => [...new Set(list.flatMap((n) => n.tags || []))].sort(), [list])

  const pool = list.filter((n) => !!n.archived === showArchived)
  const filtered = pool
    .filter((n) => typeFilter === 'all' || n.type === typeFilter)
    .filter((n) => !tagFilter || (n.tags || []).includes(tagFilter))
    .filter((n) => {
      if (!q) return true
      const hay = [n.title, n.content, ...(n.items || []).map((i) => i.text), ...(n.tags || [])].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    .sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
      if (sortBy === 'oldest') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
      return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0) // last updated
    })

  const archivedCount = list.filter((n) => n.archived).length

  async function save(note) {
    const payload = {
      title: note.title.trim(),
      type: note.type,
      content: note.type === 'text' ? note.content.trim() : '',
      items: note.type === 'checklist' ? note.items.filter((i) => i.text.trim()) : [],
      tags: note.tags,
      color: note.color,
      archived: !!note.archived,
    }
    if (note.id) await updateNote(note.id, payload)
    else await addNote(payload)
    setModalNote(null)
  }

  async function toggleArchive(n) { await updateNote(n.id, { archived: !n.archived }) }
  async function remove(n) { if (window.confirm(`Delete "${n.title || 'this note'}"? This cannot be undone.`)) await deleteNote(n.id) }
  // touch:false — ticking a box shouldn't bump "last updated" and jump the
  // note to a new spot in the grid while you're mid-click.
  async function toggleChecklistItem(n, idx) {
    const items = (n.items || []).map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
    await updateNote(n.id, { items }, { touch: false })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Notes & Goals" subtitle="Quick notes — research, to-do lists, journal entries, ideas." />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title & content…" />
        </div>
        <select className="input h-[42px] w-auto shrink-0" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="updated">Sort by: Last updated</option>
          <option value="title">Sort by: Title</option>
          <option value="oldest">Sort by: Oldest first</option>
        </select>
        <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1">
          {[['all', 'All', LayoutGrid], ['text', 'Notes', Type], ['checklist', 'Checklist', ListChecks]].map(([v, l, Icon]) => (
            <button
              key={v} type="button" onClick={() => setTypeFilter(v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${typeFilter === v ? 'bg-white text-brand-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon size={13} /> {l}
            </button>
          ))}
        </div>
        {allTags.length > 0 && (
          <select className="input h-[42px] w-auto shrink-0" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <button
          type="button" onClick={() => setShowArchived((v) => !v)}
          className={`btn-outline shrink-0 px-3 py-2 text-xs ${showArchived ? 'bg-brand-50' : ''}`}
        >
          <Archive size={14} /> {showArchived ? 'Back to active' : `Archived (${archivedCount})`}
        </button>
        {!showArchived && (
          <button type="button" onClick={() => setModalNote(blankNote())} className="btn-primary shrink-0"><Plus size={16} /> New note</button>
        )}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-400"><StickyNote size={26} /></div>
          <p className="mt-3 text-sm text-slate-400">
            {showArchived ? 'No archived notes.' : q || tagFilter ? 'No notes match your search.' : 'No notes yet — create your first one above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => (
            <div
              key={n.id} role="button" tabIndex={0}
              onClick={() => setModalNote(n)}
              onKeyDown={(e) => { if (e.key === 'Enter') setModalNote(n) }}
              className={`flex h-72 cursor-pointer flex-col rounded-2xl border p-4 shadow-sm transition hover:shadow-soft ${CARD_BG[n.color] || CARD_BG['']}`}
            >
              <div className="flex shrink-0 items-start justify-between gap-2">
                <p className="min-w-0 flex-1 break-words font-bold text-slate-900">{n.title || 'Untitled'}</p>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleArchive(n) }} title={n.archived ? 'Unarchive' : 'Archive'} className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-brand-600">
                    {n.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); remove(n) }} title="Delete" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
                {n.type === 'checklist' ? (
                  <ul className="space-y-1.5">
                    {(n.items || []).map((it, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <button
                          type="button" onClick={(e) => { e.stopPropagation(); toggleChecklistItem(n, i) }}
                          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${it.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'}`}
                        >
                          {it.done && <Check size={11} />}
                        </button>
                        <span className={it.done ? 'text-slate-400 line-through' : 'text-slate-700'}>{it.text}</span>
                      </li>
                    ))}
                    {(n.items || []).length === 0 && <li className="text-sm text-slate-400">No items.</li>}
                  </ul>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{n.content || <span className="text-slate-400">Empty note.</span>}</p>
                )}
              </div>

              {(n.tags || []).length > 0 && (
                <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
                  {n.tags.map((t) => (
                    <button
                      key={t} type="button"
                      onClick={(e) => { e.stopPropagation(); setShowArchived(false); setTagFilter(t) }}
                      className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 hover:text-brand-600"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-2 shrink-0 text-[11px] text-slate-400">Updated {fmtDateTime(n.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}

      {modalNote && <NoteModal note={modalNote} onSave={save} onClose={() => setModalNote(null)} />}
    </div>
  )
}

function NoteModal({ note, onSave, onClose }) {
  const [title, setTitle] = useState(note.title || '')
  const [type, setType] = useState(note.type || 'text')
  const [content, setContent] = useState(note.content || '')
  const [items, setItems] = useState(note.items?.length ? note.items : [])
  const [itemDraft, setItemDraft] = useState('')
  const [tagsText, setTagsText] = useState((note.tags || []).join(', '))
  const [color, setColor] = useState(note.color || '')
  const [busy, setBusy] = useState(false)

  function addItem() {
    const t = itemDraft.trim(); if (!t) return
    setItems((its) => [...its, { text: t, done: false }])
    setItemDraft('')
  }
  function removeItem(i) { setItems((its) => its.filter((_, idx) => idx !== i)) }
  function toggleItem(i) { setItems((its) => its.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it))) }
  function editItemText(i, text) { setItems((its) => its.map((it, idx) => (idx === i ? { ...it, text } : it))) }

  async function submit() {
    setBusy(true)
    await onSave({ ...note, title, type, content, items, tags: parseTags(tagsText), color })
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl animate-pop-in space-y-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{note.id ? 'Edit note' : 'New note'}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div>
          <label className="label text-xs">Title</label>
          <input autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title…" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label text-xs">Content</label>
            <div className="mb-1.5 flex gap-1 rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => setType('text')} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${type === 'text' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                <Type size={12} /> Text
              </button>
              <button type="button" onClick={() => setType('checklist')} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${type === 'checklist' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                <ListChecks size={12} /> Checklist
              </button>
            </div>
          </div>

          {type === 'text' ? (
            <textarea className="input min-h-[160px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your note…" />
          ) : (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => toggleItem(i)} className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${it.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                    {it.done && <Check size={12} />}
                  </button>
                  <input className={`input h-9 flex-1 text-sm ${it.done ? 'text-slate-400 line-through' : ''}`} value={it.text} onChange={(e) => editItemText(i, e.target.value)} />
                  <button type="button" onClick={() => removeItem(i)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="grid h-5 w-5 shrink-0 place-items-center rounded border border-dashed border-slate-300" />
                <input
                  className="input h-9 flex-1 text-sm" value={itemDraft} onChange={(e) => setItemDraft(e.target.value)}
                  placeholder="Add an item / goal…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                />
                <button type="button" onClick={addItem} className="btn-outline h-9 shrink-0 px-2.5 text-xs">Add</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label text-xs">Tags (comma separated)</label>
          <input className="input" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="research, to-do, idea" />
        </div>

        <div>
          <label className="label text-xs">Colour</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id} type="button" title={c.label} onClick={() => setColor(c.id)}
                className={`grid h-9 w-9 place-items-center rounded-full border-2 transition ${color === c.id ? 'border-brand-600 ring-2 ring-brand-200' : 'border-slate-200'} ${c.id ? SWATCH_DOT[c.id] : 'bg-white'}`}
              >
                {!c.id && <StickyNote size={15} className="text-slate-400" />}
                {c.id && color === c.id && <Check size={15} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={submit} disabled={busy || !title.trim()} className="btn-primary disabled:opacity-40">
            {busy ? <Loader2 size={18} className="animate-spin" /> : null} Save
          </button>
        </div>
      </div>
    </div>
  )
}
