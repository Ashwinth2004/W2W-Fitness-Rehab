import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Check, ArrowRight, Pencil, X } from 'lucide-react'
import {
  JOINTS, PAIN_RESPONSE, SPINE_ROM_GRADES, GIRTH_SITES, GIRTH_FINDINGS, LIMB_LENGTH_TYPES,
} from '../lib/constants'
import MicButton from './MicButton'

// Shared bits ---------------------------------------------------------------
export function Pills({ options, value, onChange, multi = false }) {
  const on = (o) => (multi ? (value || []).includes(o) : value === o)
  const toggle = (o) => {
    if (multi) {
      const arr = value || []
      onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])
    } else onChange(value === o ? '' : o)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button" key={o} onClick={() => toggle(o)} aria-pressed={on(o)}
          className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
            on(o) ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >{o}</button>
      ))}
    </div>
  )
}

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }
const onlyDec = (s) => String(s).replace(/[^\d.]/g, '')
export function girthDiff(g) {
  const r = num(g.right), l = num(g.left)
  return r == null || l == null ? '—' : Math.abs(r - l).toFixed(1)
}
export function limbResult(ll = {}) {
  const r = num(ll.right), l = num(ll.left)
  if (r == null || l == null) return { diff: '', label: '' }
  const diff = Math.abs(r - l).toFixed(1)
  if (r === l) return { diff, label: 'Equal' }
  return { diff, label: `Limb Length Discrepancy — ${r > l ? 'Right' : 'Left'} longer by ${diff} cm` }
}

// On Examination — joint-wise ROM ------------------------------------------
// value = { joints: [jointId], exam: { [jointId]: { note, mv: { [movKey]: {arom,prom,pain|grade} } } } }
// Workflow: one joint is assessed at a time. Pick a joint, fill its movements,
// then "Save" (collapse) or "Save & go next" (open the next joint).
const jointHasData = (data) => {
  if (!data) return false
  if (data.note) return true
  return Object.values(data.mv || {}).some((mv) => mv && (mv.arom || mv.prom || mv.pain || mv.grade))
}
function summarizeJoint(joint, data) {
  if (!data) return '—'
  const parts = []
  for (const m of joint.movements) {
    const mv = data.mv?.[m.key] || {}
    const seg = joint.type === 'spine'
      ? [mv.grade, mv.pain && `Pain: ${mv.pain}`].filter(Boolean)
      : [mv.arom && `A:${mv.arom}`, mv.prom && `P:${mv.prom}`, mv.pain && `Pain:${mv.pain}`].filter(Boolean)
    if (seg.length) parts.push(`${m.name} (${seg.join(', ')})`)
  }
  return parts.join('; ') || (data.note ? '' : '—')
}

// Grid ROM → readable text (used when switching to Type/Speak mode so nothing is lost).
function romToText(v) {
  if (!v || typeof v !== 'object' || !Array.isArray(v.joints)) return ''
  const lines = []
  for (const jid of v.joints) {
    const j = JOINTS.find((x) => x.id === jid)
    const d = v.exam?.[jid]
    if (!j || !d) continue
    const s = summarizeJoint(j, d)
    if ((s && s !== '—') || d.note) lines.push(`${j.name}: ${s && s !== '—' ? s : ''}${d.note ? ` | Note: ${d.note}` : ''}`.trim())
  }
  return lines.join('\n')
}
const modeBtn = (on) => `rounded-full px-3.5 py-1.5 text-sm font-medium transition ${on ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`

export function RomField({ value, onChange }) {
  const v = value && typeof value === 'object' ? value : { joints: [], exam: {} }
  const joints = v.joints || []
  const exam = v.exam || {}
  const [active, setActive] = useState(null)
  const [mode, setMode] = useState(() => (typeof value === 'string' && value.trim()) ? 'text' : 'grid')
  const switchMode = (next) => {
    if (next === mode) return
    if (next === 'text') {
      onChange(typeof value === 'string' ? value : romToText(value))
    } else {
      if (typeof value === 'string' && value.trim() && !window.confirm('Switch to the grid? Your typed ROM text will be cleared.')) return
      onChange({ joints: [], exam: {} })
    }
    setMode(next)
  }

  const openJoint = (jid) => {
    if (!joints.includes(jid)) onChange({ ...v, joints: [...joints, jid], exam })
    setActive(jid)
  }
  const setMv = (jid, mkey, field, val) => {
    const j = { note: '', mv: {}, ...(exam[jid] || {}) }
    j.mv = { ...j.mv, [mkey]: { ...(j.mv[mkey] || {}), [field]: val } }
    onChange({ ...v, joints: joints.includes(jid) ? joints : [...joints, jid], exam: { ...exam, [jid]: j } })
  }
  const setNote = (jid, val) => {
    const j = { note: '', mv: {}, ...(exam[jid] || {}) }
    onChange({ ...v, exam: { ...exam, [jid]: { ...j, note: val } } })
  }
  const removeJoint = (jid) => {
    const ex = { ...exam }; delete ex[jid]
    onChange({ ...v, joints: joints.filter((x) => x !== jid), exam: ex })
    if (active === jid) setActive(null)
  }
  // Collapse the active joint; drop it if nothing was entered.
  const closeActive = (goNext) => {
    const cur = active
    if (cur && !jointHasData(exam[cur])) removeJoint(cur)
    if (goNext) {
      const idx = JOINTS.findIndex((j) => j.id === cur)
      const next = JOINTS[idx + 1]
      if (next) { openJoint(next.id); return }
    }
    setActive(null)
  }

  const activeJoint = JOINTS.find((j) => j.id === active)
  const savedJoints = joints.filter((jid) => jid !== active && jointHasData(exam[jid]))

  return (
    <div className="space-y-3">
      {/* Choose how to record ROM: the tap-to-enter grid, or free type/speak. */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => switchMode('grid')} className={modeBtn(mode === 'grid')}>Grid (tap to enter)</button>
        <button type="button" onClick={() => switchMode('text')} className={modeBtn(mode === 'text')}>Type / Speak</button>
      </div>

      {mode === 'text' ? (
        <div className="space-y-2">
          <textarea
            className="input min-h-[130px]"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type or dictate the ROM findings — e.g. 'Knee: flexion 100°, extension 0°, pain end-range. Shoulder: abduction 150°, flexion 160°.'"
          />
          <MicButton onText={(txt) => onChange(`${typeof value === 'string' && value ? `${value} ` : ''}${txt}`)} label="Speak ROM" size="sm" />
        </div>
      ) : (
      <>
      {/* Joint picker — one assessed at a time. Green = saved with data. */}
      <div className="flex flex-wrap gap-2">
        {JOINTS.map((j) => {
          const isActive = active === j.id
          const done = jointHasData(exam[j.id]) && !isActive
          return (
            <button
              type="button" key={j.id} onClick={() => openJoint(j.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-600 text-white shadow' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {done && <Check size={14} />}{j.name}
            </button>
          )
        })}
      </div>

      {/* Active joint editor */}
      {activeJoint && (
        <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
          <p className="font-semibold text-slate-800">{activeJoint.name}</p>
          <div className="mt-2 space-y-2">
            {activeJoint.movements.map((m) => {
              const mv = exam[active]?.mv?.[m.key] || {}
              const spine = activeJoint.type === 'spine'
              return (
                <div key={m.key} className="rounded-lg bg-white p-2.5 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{m.name}</span>
                    {m.normal && <span className="text-xs text-slate-400">Normal {m.normal}</span>}
                  </div>
                  {spine ? (
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="text-xs text-slate-500">ROM
                        <select className="input mt-1 py-2" value={mv.grade || ''} onChange={(e) => setMv(active, m.key, 'grade', e.target.value)}>
                          <option value="">—</option>{SPINE_ROM_GRADES.map((g) => <option key={g}>{g}</option>)}
                        </select>
                      </label>
                      <label className="text-xs text-slate-500">Pain
                        <select className="input mt-1 py-2" value={mv.pain || ''} onChange={(e) => setMv(active, m.key, 'pain', e.target.value)}>
                          <option value="">—</option>{PAIN_RESPONSE.map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="text-xs text-slate-500">AROM
                        <input className="input mt-1 py-2" placeholder="°" value={mv.arom || ''} onChange={(e) => setMv(active, m.key, 'arom', e.target.value)} />
                      </label>
                      <label className="text-xs text-slate-500">PROM
                        <input className="input mt-1 py-2" placeholder="°" value={mv.prom || ''} onChange={(e) => setMv(active, m.key, 'prom', e.target.value)} />
                      </label>
                      <label className="text-xs text-slate-500">Pain
                        <select className="input mt-1 py-2" value={mv.pain || ''} onChange={(e) => setMv(active, m.key, 'pain', e.target.value)}>
                          <option value="">—</option>{PAIN_RESPONSE.map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <textarea className="input mt-2 min-h-[44px]" placeholder={`Note for ${activeJoint.name}…`} value={exam[active]?.note || ''} onChange={(e) => setNote(active, e.target.value)} />
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => removeJoint(active)} className="mr-auto text-sm font-medium text-red-500 hover:underline">Remove</button>
            <button type="button" onClick={() => closeActive(false)} className="btn-outline"><Check size={16} /> Save</button>
            <button type="button" onClick={() => closeActive(true)} className="btn-primary">Save &amp; go next <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Saved joints (collapsed) */}
      {savedJoints.length > 0 && (
        <div className="space-y-1.5">
          {savedJoints.map((jid) => {
            const j = JOINTS.find((x) => x.id === jid)
            if (!j) return null
            const sum = summarizeJoint(j, exam[jid])
            return (
              <div key={jid} className="flex items-start justify-between gap-2 rounded-lg bg-white p-2.5 text-sm ring-1 ring-slate-100">
                <div className="min-w-0">
                  <span className="font-medium text-slate-700">{j.name}</span>
                  {sum && <span className="ml-2 text-slate-500">{sum}</span>}
                  {exam[jid]?.note && <span className="ml-2 text-xs text-slate-400">| Note: {exam[jid].note}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setActive(jid)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Pencil size={13} /></button>
                  <button type="button" onClick={() => removeJoint(jid)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}
    </div>
  )
}

// Girth measurement ---------------------------------------------------------
// value = [ { site, right, left, finding, comments } ]
export function GirthField({ value, onChange }) {
  const rows = Array.isArray(value) && value.length ? value : [{ site: '', right: '', left: '', finding: '', comments: '' }]
  const setRow = (i, key, val) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)))
  const add = () => onChange([...rows, { site: '', right: '', left: '', finding: '', comments: '' }])
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      {rows.map((g, i) => (
        <div key={i} className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site {i + 1}</span>
            {rows.length > 1 && <button type="button" onClick={() => remove(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>}
          </div>
          <select className="input mt-2" value={g.site} onChange={(e) => setRow(i, 'site', e.target.value)}>
            <option value="">Select measurement site…</option>{GIRTH_SITES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label className="text-xs text-slate-500">Right (cm)
              <input className="input mt-1 py-2" inputMode="decimal" value={g.right} onChange={(e) => setRow(i, 'right', onlyDec(e.target.value))} />
            </label>
            <label className="text-xs text-slate-500">Left (cm)
              <input className="input mt-1 py-2" inputMode="decimal" value={g.left} onChange={(e) => setRow(i, 'left', onlyDec(e.target.value))} />
            </label>
            <label className="text-xs text-slate-500">Difference
              <input className="input mt-1 bg-slate-100 py-2 text-slate-600" value={`${girthDiff(g)} cm`} readOnly />
            </label>
          </div>
          <select className="input mt-2" value={g.finding} onChange={(e) => setRow(i, 'finding', e.target.value)}>
            <option value="">Clinical finding…</option>{GIRTH_FINDINGS.map((f) => <option key={f}>{f}</option>)}
          </select>
          <input className="input mt-2" placeholder="Comments (optional)" value={g.comments} onChange={(e) => setRow(i, 'comments', e.target.value)} />
        </div>
      ))}
      <button type="button" onClick={add} className="btn-outline w-full text-sm"><Plus size={15} /> Add another site</button>
    </div>
  )
}

// Limb length ---------------------------------------------------------------
// value = { type, right, left }
export function LimbLengthField({ value, onChange }) {
  const v = value && typeof value === 'object' ? value : { type: '', right: '', left: '' }
  const set = (key, val) => onChange({ ...v, [key]: val })
  const res = limbResult(v)
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs text-slate-500">Type of measurement</p>
        <Pills options={LIMB_LENGTH_TYPES} value={v.type} onChange={(t) => set('type', t)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-slate-500">Right (cm)
          <input className="input mt-1 py-2" inputMode="decimal" value={v.right || ''} onChange={(e) => set('right', onlyDec(e.target.value))} />
        </label>
        <label className="text-xs text-slate-500">Left (cm)
          <input className="input mt-1 py-2" inputMode="decimal" value={v.left || ''} onChange={(e) => set('left', onlyDec(e.target.value))} />
        </label>
        <label className="text-xs text-slate-500">Difference
          <input className="input mt-1 bg-slate-100 py-2 text-slate-600" value={res.diff ? `${res.diff} cm` : '—'} readOnly />
        </label>
      </div>
      {res.label && (
        <p className={`rounded-lg px-3 py-2 text-sm ${res.label === 'Equal' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{res.label}</p>
      )}
    </div>
  )
}

// Numbered list — stored as "1. a\n2. b" so it shows as numbered lines
// everywhere (detail view + PDF) with no special formatting. Add / edit /
// delete rows; auto-numbered as you type.
export function ListField({ value, onChange, max = 12 }) {
  const parse = (v) => String(v || '').split('\n').map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
  const [rows, setRows] = useState(() => { const p = parse(value); return p.length ? p : [''] })
  const lastEmit = useRef(value)

  // Re-sync when the parent loads a different value (e.g. editing a saved session).
  useEffect(() => {
    if (value !== lastEmit.current) { const p = parse(value); setRows(p.length ? p : ['']); lastEmit.current = value }
  }, [value])

  const emit = (next) => {
    setRows(next)
    const joined = next.map((s) => s.trim()).filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n')
    lastEmit.current = joined
    onChange(joined)
  }
  const setRow = (i, val) => emit(rows.map((r, idx) => (idx === i ? val : r)))
  const add = () => { if (rows.length < max) emit([...rows, '']) }
  const remove = (i) => { const n = rows.filter((_, idx) => idx !== i); emit(n.length ? n : ['']) }

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-sm font-medium text-slate-400">{i + 1}.</span>
          <input className="input" value={r} onChange={(e) => setRow(i, e.target.value)} placeholder={`Item ${i + 1}`} />
          {rows.length > 1 && (
            <button type="button" onClick={() => remove(i)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"><X size={15} /></button>
          )}
        </div>
      ))}
      {rows.length < max && <button type="button" onClick={add} className="btn-outline text-sm"><Plus size={15} /> Add</button>}
    </div>
  )
}
