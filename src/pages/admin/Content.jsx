import { useEffect, useState } from 'react'
import { Star, Trash2, Plus, Check, Eye, EyeOff, Newspaper, MessageSquareQuote, Loader2 } from 'lucide-react'
import {
  watchTestimonials, createTestimonial, setTestimonialApproved, deleteTestimonial,
  watchPosts, createPost, updatePost, deletePost,
} from '../../lib/firestore'
import { fmtDate } from '../../lib/format'

export default function Content() {
  const [tab, setTab] = useState('reviews')
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">Content</h1>
      <div className="flex gap-2">
        {[
          { id: 'reviews', label: 'Reviews', icon: MessageSquareQuote },
          { id: 'blog', label: 'Blog', icon: Newspaper },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'reviews' ? <Reviews /> : <BlogManager />}
    </div>
  )
}

function Reviews() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', text: '', rating: 5 })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => watchTestimonials(setItems), [])

  async function add(e) {
    e.preventDefault()
    if (!form.name || !form.text) return
    await createTestimonial({ name: form.name.trim(), text: form.text.trim(), rating: Number(form.rating), approved: true })
    setForm({ name: '', text: '', rating: 5 })
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card grid gap-3 p-5 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
        <div><label className="label text-xs">Client Name</label><input className="input" value={form.name} onChange={set('name')} /></div>
        <div><label className="label text-xs">Review</label><input className="input" value={form.text} onChange={set('text')} placeholder="What the client said…" /></div>
        <div className="flex items-end gap-2">
          <div><label className="label text-xs">Rating</label><select className="input w-20" value={form.rating} onChange={set('rating')}>{[5,4,3,2,1].map((n)=><option key={n}>{n}</option>)}</select></div>
          <button className="btn-primary"><Plus size={16} /> Add</button>
        </div>
      </form>
      <p className="text-xs text-slate-400">Approved reviews appear on the public homepage. Toggle the eye to show/hide.</p>
      {items.length === 0 ? (
        <p className="card py-10 text-center text-sm text-slate-400">No reviews yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <div key={t.id} className={`card p-5 ${t.approved ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <div className="flex">{Array.from({ length: t.rating || 5 }).map((_, i) => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setTestimonialApproved(t.id, !t.approved)} title={t.approved ? 'Hide' : 'Show'} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">{t.approved ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                  <button onClick={() => deleteTestimonial(t.id)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{t.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function BlogManager() {
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState({ title: '', excerpt: '', body: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => watchPosts(setPosts), [])

  async function add(e) {
    e.preventDefault()
    if (!form.title || !form.body) return
    setBusy(true)
    await createPost({
      title: form.title.trim(),
      slug: slugify(form.title) + '-' + Math.random().toString(36).slice(2, 6),
      excerpt: form.excerpt.trim() || form.body.slice(0, 140),
      body: form.body.trim(),
      published: true,
    })
    setForm({ title: '', excerpt: '', body: '' })
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card space-y-3 p-5">
        <div><label className="label text-xs">Title</label><input className="input" value={form.title} onChange={set('title')} placeholder="Article title" /></div>
        <div><label className="label text-xs">Short Excerpt (optional)</label><input className="input" value={form.excerpt} onChange={set('excerpt')} placeholder="One-line summary shown on the blog list" /></div>
        <div><label className="label text-xs">Body</label><textarea className="input min-h-[140px]" value={form.body} onChange={set('body')} placeholder="Write the full article here…" /></div>
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
