import { useEffect, useState } from 'react'
import { Trash2, Plus, Eye, EyeOff, Loader2, Pencil, Save, Link2, Check } from 'lucide-react'
import { watchPosts, createPost, updatePost, deletePost } from '../../lib/firestore'
import { fmtDate } from '../../lib/format'
import { SITE_URL } from '../../lib/constants'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useUnsaved } from '../../context/UnsavedContext'

// Copy text to the clipboard, falling back to a hidden textarea where the
// async Clipboard API isn't available (older/non-secure contexts).
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

// A share/copy button that briefly confirms it copied.
function CopyLinkButton({ url, label = 'Copy link', title, className = '' }) {
  const [done, setDone] = useState(false)
  async function go() {
    if (await copyText(url)) { setDone(true); setTimeout(() => setDone(false), 1600) }
  }
  return (
    <button
      type="button" onClick={go} title={title || url}
      className={className || 'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-brand-600'}
    >
      {done ? <Check size={14} className="text-emerald-600" /> : <Link2 size={14} />}
      {done ? 'Copied!' : label}
    </button>
  )
}

export default function Content() {
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Blogs">
        <CopyLinkButton
          url={`${SITE_URL}/blog`} label="Copy blog page link" title="Share the blog page with clients"
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
        />
      </AdminPageHeader>
      <BlogManager />
    </div>
  )
}

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function BlogManager() {
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState({ title: '', excerpt: '', body: '' })
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const { setDirty } = useUnsaved()
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true) }

  useEffect(() => watchPosts(setPosts), [])
  useEffect(() => () => setDirty(false), [setDirty])

  function resetForm() {
    setForm({ title: '', excerpt: '', body: '' })
    setEditingId(null)
    setDirty(false)
  }

  function edit(p) {
    setEditingId(p.id)
    setForm({ title: p.title || '', excerpt: p.excerpt || '', body: p.body || '' })
    setDirty(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setBusy(true)
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || form.body.trim().replace(/\s+/g, ' ').slice(0, 160),
      body: form.body.trim(),
    }
    if (editingId) {
      // Keep the existing slug so published links stay valid.
      await updatePost(editingId, payload)
    } else {
      await createPost({
        ...payload,
        slug: slugify(form.title) + '-' + Math.random().toString(36).slice(2, 6),
        published: true,
      })
    }
    resetForm()
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">{editingId ? 'Edit post' : 'New post'}</h2>
          {editingId && <button type="button" onClick={resetForm} className="text-sm text-slate-500 hover:underline">Cancel edit</button>}
        </div>
        <div><label className="label text-xs">Title</label><input className="input" value={form.title} onChange={set('title')} placeholder="Article title" /></div>
        <div><label className="label text-xs">Short Excerpt (optional)</label><input className="input" value={form.excerpt} onChange={set('excerpt')} placeholder="One-line summary shown on the blog list" /></div>

        <div>
          <label className="label text-xs">Body</label>
          <textarea
            className="input min-h-[260px] leading-relaxed"
            value={form.body}
            onChange={set('body')}
            placeholder={'Write your article here…\n\nJust type normally. Leave a blank line between paragraphs — your text appears exactly as you write it.'}
          />
          <p className="mt-1 text-[11px] text-slate-400">Plain text — write naturally. Each blank line starts a new paragraph; no special formatting needed.</p>
        </div>

        <div className="flex justify-end"><button disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus size={18} />} {editingId ? 'Save Changes' : 'Publish Post'}</button></div>
      </form>

      {posts.length === 0 ? (
        <p className="card py-10 text-center text-sm text-slate-400">No posts yet. The blog shows sample health tips until you publish your own.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{p.title}</p>
                <p className="truncate text-xs text-slate-500">{p.published ? 'Published' : 'Hidden'} · {fmtDate(p.createdAt)} · /blog/{p.slug}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <CopyLinkButton url={`${SITE_URL}/blog/${p.slug}`} label="Copy link" title={`Share "${p.title}"`} />
                <button onClick={() => edit(p)} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                <button onClick={() => updatePost(p.id, { published: !p.published })} title={p.published ? 'Hide' : 'Publish'} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">{p.published ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                <button onClick={() => window.confirm('Delete this post?') && deletePost(p.id)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
