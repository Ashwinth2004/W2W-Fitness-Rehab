import { Plus, Trash2 } from 'lucide-react'
import {
  JOINTS, PAIN_RESPONSE, SPINE_ROM_GRADES, GIRTH_SITES, GIRTH_FINDINGS, LIMB_LENGTH_TYPES,
} from '../lib/constants'

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
export function RomField({ value, onChange }) {
  const v = value && typeof value === 'object' ? value : { joints: [], exam: {} }
  const joints = v.joints || []
  const exam = v.exam || {}

  const setJoints = (names) => {
    const ids = JOINTS.filter((j) => names.includes(j.name)).map((j) => j.id)
    onChange({ ...v, joints: ids })
  }
  const setMv = (jid, mkey, field, val) => {
    const j = { note: '', mv: {}, ...(exam[jid] || {}) }
    j.mv = { ...j.mv, [mkey]: { ...(j.mv[mkey] || {}), [field]: val } }
    onChange({ ...v, joints, exam: { ...exam, [jid]: j } })
  }
  const setNote = (jid, val) => {
    const j = { note: '', mv: {}, ...(exam[jid] || {}) }
    onChange({ ...v, joints, exam: { ...exam, [jid]: { ...j, note: val } } })
  }

  return (
    <div className="space-y-3">
      <Pills multi options={JOINTS.map((j) => j.name)} value={joints.map((id) => JOINTS.find((j) => j.id === id)?.name).filter(Boolean)} onChange={setJoints} />
      {joints.map((jid) => {
        const joint = JOINTS.find((j) => j.id === jid)
        if (!joint) return null
        const data = exam[jid] || { note: '', mv: {} }
        const spine = joint.type === 'spine'
        return (
          <div key={jid} className="rounded-xl bg-slate-50 p-3 sm:p-4">
            <p className="font-semibold text-slate-800">{joint.name}</p>
            <div className="mt-2 space-y-2">
              {joint.movements.map((m) => {
                const mv = data.mv?.[m.key] || {}
                return (
                  <div key={m.key} className="rounded-lg bg-white p-2.5 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{m.name}</span>
                      {m.normal && <span className="text-xs text-slate-400">Normal {m.normal}</span>}
                    </div>
                    {spine ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="text-xs text-slate-500">ROM
                          <select className="input mt-1 py-2" value={mv.grade || ''} onChange={(e) => setMv(jid, m.key, 'grade', e.target.value)}>
                            <option value="">—</option>{SPINE_ROM_GRADES.map((g) => <option key={g}>{g}</option>)}
                          </select>
                        </label>
                        <label className="text-xs text-slate-500">Pain
                          <select className="input mt-1 py-2" value={mv.pain || ''} onChange={(e) => setMv(jid, m.key, 'pain', e.target.value)}>
                            <option value="">—</option>{PAIN_RESPONSE.map((p) => <option key={p}>{p}</option>)}
                          </select>
                        </label>
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <label className="text-xs text-slate-500">AROM
                          <input className="input mt-1 py-2" placeholder="°" value={mv.arom || ''} onChange={(e) => setMv(jid, m.key, 'arom', e.target.value)} />
                        </label>
                        <label className="text-xs text-slate-500">PROM
                          <input className="input mt-1 py-2" placeholder="°" value={mv.prom || ''} onChange={(e) => setMv(jid, m.key, 'prom', e.target.value)} />
                        </label>
                        <label className="text-xs text-slate-500">Pain
                          <select className="input mt-1 py-2" value={mv.pain || ''} onChange={(e) => setMv(jid, m.key, 'pain', e.target.value)}>
                            <option value="">—</option>{PAIN_RESPONSE.map((p) => <option key={p}>{p}</option>)}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <textarea className="input mt-2 min-h-[44px]" placeholder={`Note for ${joint.name}…`} value={data.note || ''} onChange={(e) => setNote(jid, e.target.value)} />
          </div>
        )
      })}
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
