// Minimal, safe Markdown → React renderer (no dangerouslySetInnerHTML, so no
// XSS surface). Supports: # ## ### headings, - / * / 1. lists, > blockquotes,
// --- horizontal rule, **bold**, *italic*/_italic_, `code`, and [text](url) links.

const INLINE = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)/

function renderInline(text, keyBase) {
  const nodes = []
  let rest = String(text)
  let k = 0
  while (rest.length) {
    const m = rest.match(INLINE)
    if (!m) { nodes.push(rest); break }
    if (m.index > 0) nodes.push(rest.slice(0, m.index))
    const key = `${keyBase}-${k++}`
    if (m[1]) nodes.push(<a key={key} href={m[3]} target="_blank" rel="noreferrer noopener" className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">{m[2]}</a>)
    else if (m[4]) nodes.push(<strong key={key} className="font-bold text-slate-900">{m[5]}</strong>)
    else if (m[6]) nodes.push(<strong key={key} className="font-bold text-slate-900">{m[7]}</strong>)
    else if (m[8]) nodes.push(<em key={key}>{m[9]}</em>)
    else if (m[10]) nodes.push(<em key={key}>{m[11]}</em>)
    else if (m[12]) nodes.push(<code key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-brand-700">{m[13]}</code>)
    rest = rest.slice(m.index + m[0].length)
  }
  return nodes
}

function parse(src) {
  const lines = String(src || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let para = []
  const flush = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = [] } }
  let i = 0
  while (i < lines.length) {
    const t = lines[i].trim()
    let m
    if (!t) { flush(); i++ }
    else if ((m = t.match(/^(#{1,3})\s+(.*)$/))) { flush(); blocks.push({ type: `h${m[1].length}`, text: m[2] }); i++ }
    else if (/^(---|\*\*\*|___)$/.test(t)) { flush(); blocks.push({ type: 'hr' }); i++ }
    else if (/^>\s?/.test(t)) { flush(); const items = []; while (i < lines.length && /^>\s?/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^>\s?/, '')); i++ } blocks.push({ type: 'quote', text: items.join(' ') }) }
    else if (/^[-*]\s+/.test(t)) { flush(); const items = []; while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, '')); i++ } blocks.push({ type: 'ul', items }) }
    else if (/^\d+\.\s+/.test(t)) { flush(); const items = []; while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++ } blocks.push({ type: 'ol', items }) }
    else { para.push(t); i++ }
  }
  flush()
  return blocks
}

export default function Markdown({ children, className = '' }) {
  const blocks = parse(children)
  return (
    <div className={className}>
      {blocks.map((b, idx) => {
        switch (b.type) {
          case 'h1': return <h2 key={idx} className="mt-8 text-2xl font-extrabold text-slate-900 md:text-3xl">{renderInline(b.text, idx)}</h2>
          case 'h2': return <h2 key={idx} className="mt-8 text-xl font-bold text-slate-900 md:text-2xl">{renderInline(b.text, idx)}</h2>
          case 'h3': return <h3 key={idx} className="mt-6 text-lg font-bold text-slate-900">{renderInline(b.text, idx)}</h3>
          case 'hr': return <hr key={idx} className="my-8 border-slate-200" />
          case 'quote': return <blockquote key={idx} className="my-5 rounded-r-xl border-l-4 border-brand-400 bg-brand-50/70 py-2 pl-4 pr-3 italic text-slate-700">{renderInline(b.text, idx)}</blockquote>
          case 'ul': return <ul key={idx} className="my-4 list-disc space-y-1.5 pl-6 marker:text-brand-400">{b.items.map((it, j) => <li key={j}>{renderInline(it, `${idx}-${j}`)}</li>)}</ul>
          case 'ol': return <ol key={idx} className="my-4 list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-brand-500">{b.items.map((it, j) => <li key={j}>{renderInline(it, `${idx}-${j}`)}</li>)}</ol>
          default: return <p key={idx} className="mt-4 leading-relaxed">{renderInline(b.text, idx)}</p>
        }
      })}
    </div>
  )
}
