import { useEffect, useState } from 'react'
import { Trash2, Plus, Eye, EyeOff, Loader2 } from 'lucide-react'
import { watchPosts, createPost, updatePost, deletePost } from '../../lib/firestore'
import { fmtDate } from '../../lib/format'
import AdminPageHeader from '../../components/AdminPageHeader'
import { useUnsaved } from '../../context/UnsavedContext'

export default function Content() {
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Blogs" />
      <BlogManager />
    </div>
  )
}

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function BlogManager() {
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState({ title: '', excerpt: '', body: '' })
  const [busy, setBusy] = useState(false)
  const { setDirty } = useUnsaved()
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true) }

  useEffect(() => watchPosts(setPosts), [])
  useEffect(() => () => setDirty(false), [setDirty])

  async function add(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setBusy(true)
    await createPost({
      title: form.title.trim(),
      slug: slugify(form.title) + '-' + Math.random().toString(36).slice(2, 6),
      excerpt: form.excerpt.trim() || form.body.trim().replace(/\s+/g, ' ').slice(0, 160),
      body: form.body.trim(),
      published: true,
    })
    setForm({ title: '', excerpt: '', body: '' })
    setDirty(false)
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card space-y-3 p-5">
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

        <div className="flex justify-end"><button disabled={busy} className="btn-primary">{busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Publish Post</button></div>
      </form>

      {posts.length === 0 ? (
        <p className="card py-10 text-center text-sm text-slate-400">No posts yet. The blog shows sample health tips until you publish your own.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{p.title}</p>
                <p className="text-xs text-slate-500">{p.published ? 'Published' : 'Hidden'} · {fmtDate(p.createdAt)} · /blog/{p.slug}</p>
              </div>
              <div className="flex gap-1">
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
