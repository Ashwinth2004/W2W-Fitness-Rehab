import { useEffect, useRef, useState } from 'react'
import {
  Trash2, Plus, Eye, EyeOff, Loader2,
  Bold, Italic, Heading2, Heading3, List, Quote, Link2,
} from 'lucide-react'
import { watchPosts, createPost, updatePost, deletePost } from '../../lib/firestore'
import { fmtDate } from '../../lib/format'
import Markdown from '../../components/Markdown'

export default function Content() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">Blogs</h1>
      <BlogManager />
    </div>
  )
}

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function ToolBtn({ onClick, title, children }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title}
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-brand-700">
      {children}
    </button>
  )
}

function BlogManager() {
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState({ title: '', excerpt: '', body: '' })
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const bodyRef = useRef(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => watchPosts(setPosts), [])

  // Wrap the current selection with markdown markers (e.g. **bold**).
  function surround(before, after = before) {
    const ta = bodyRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const sel = value.slice(s, e) || 'text'
    const next = value.slice(0, s) + before + sel + after + value.slice(e)
    setForm((f) => ({ ...f, body: next }))
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length })
  }
  // Prefix the current line (e.g. "## ", "- ", "> ").
  function linePrefix(prefix) {
    const ta = bodyRef.current
    if (!ta) return
    const { selectionStart: s, value } = ta
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
    setForm((f) => ({ ...f, body: next }))
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + prefix.length })
  }

  async function add(e) {
    e.preventDefault()
    if (!form.title || !form.body) return
    setBusy(true)
    await createPost({
      title: form.title.trim(),
      slug: slugify(form.title) + '-' + Math.random().toString(36).slice(2, 6),
      excerpt: form.excerpt.trim() || form.body.replace(/[#*_>`-]/g, '').trim().slice(0, 160),
      body: form.body.trim(),
      published: true,
    })
    setForm({ title: '', excerpt: '', body: '' })
    setPreview(false)
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card space-y-3 p-5">
        <div><label className="label text-xs">Title</label><input className="input" value={form.title} onChange={set('title')} placeholder="Article title" /></div>
        <div><label className="label text-xs">Short Excerpt (optional)</label><input className="input" value={form.excerpt} onChange={set('excerpt')} placeholder="One-line summary shown on the blog list" /></div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label text-xs">Body</label>
            <button type="button" onClick={() => setPreview((v) => !v)} className="text-xs font-medium text-brand-600 hover:underline">
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>

          {preview ? (
            <div className="min-h-[180px] rounded-xl border border-slate-200 p-4">
              {form.body ? <Markdown className="text-sm text-slate-700">{form.body}</Markdown> : <p className="text-sm text-slate-400">Nothing to preview yet.</p>}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-1.5 py-1">
                <ToolBtn onClick={() => surround('**')} title="Bold"><Bold size={15} /></ToolBtn>
                <ToolBtn onClick={() => surround('*')} title="Italic"><Italic size={15} /></ToolBtn>
                <span className="mx-1 h-5 w-px bg-slate-200" />
                <ToolBtn onClick={() => linePrefix('## ')} title="Heading"><Heading2 size={15} /></ToolBtn>
                <ToolBtn onClick={() => linePrefix('### ')} title="Subheading"><Heading3 size={15} /></ToolBtn>
                <ToolBtn onClick={() => linePrefix('- ')} title="Bullet list"><List size={15} /></ToolBtn>
                <ToolBtn onClick={() => linePrefix('> ')} title="Quote"><Quote size={15} /></ToolBtn>
                <ToolBtn onClick={() => surround('[', '](https://)')} title="Link"><Link2 size={15} /></ToolBtn>
              </div>
              <textarea
                ref={bodyRef}
                className="input min-h-[200px] rounded-t-none font-mono text-sm leading-relaxed"
                value={form.body}
                onChange={set('body')}
                placeholder={'Write the article…\n\n## A heading\n\nSome **bold** text and a [link](https://example.com).\n\n- point one\n- point two'}
              />
            </>
          )}
          <p className="mt-1 text-[11px] text-slate-400">Formatting uses Markdown — use the toolbar or type <code>**bold**</code>, <code>## Heading</code>, <code>- list</code>.</p>
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
