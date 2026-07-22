import { useState } from 'react'
import { X, ArrowRightToLine } from 'lucide-react'
import PhoneField from './PhoneField'
import { RomField, GirthField, LimbLengthField, ListField } from './ClinicalFields'
import { PAIN_DURATION_UNITS } from '../lib/constants'
import { formatAssessmentValue } from '../lib/assessmentSchema'

const STRUCTURED = ['chips', 'multi', 'posneg', 'duration', 'rom', 'girth', 'limb', 'list', 'programs']
const chipCls = (on) =>
  `rounded-full px-3.5 py-2 text-sm font-medium transition ${on ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
const OTHER = /^other/i

// Single-select chips, with optional "Other (mention)" free-text.
function Chips({ f, value, onChange }) {
  const otherOpt = f.other ? f.options.find((o) => OTHER.test(o)) : null
  const isOther = otherOpt && typeof value === 'string' && value.startsWith(otherOpt)
  const otherText = isOther && value.length > otherOpt.length ? value.slice(otherOpt.length).replace(/^[:\s—-]+/, '') : ''
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {f.options.map((o) => {
          const on = o === otherOpt ? isOther : value === o
          return <button type="button" key={o} className={chipCls(on)} onClick={() => onChange(o === otherOpt ? (isOther ? '' : otherOpt) : (value === o ? '' : o))}>{o}</button>
        })}
      </div>
      {isOther && <input className="input mt-2" placeholder="Please mention…" value={otherText} onChange={(e) => onChange(e.target.value ? `${otherOpt}: ${e.target.value}` : otherOpt)} />}
    </div>
  )
}

// Multi-select chips, with optional "Other (mention)" free-text and, when
// `addable`, the ability to type & save your own entries (removable chips).
function Multi({ f, value, onChange }) {
  const arr = Array.isArray(value) ? value : []
  const otherOpt = f.other ? f.options.find((o) => OTHER.test(o)) : null
  const otherIdx = otherOpt ? arr.findIndex((x) => typeof x === 'string' && x.startsWith(otherOpt)) : -1
  const otherActive = otherIdx >= 0
  const otherText = otherActive && arr[otherIdx].length > otherOpt.length ? arr[otherIdx].slice(otherOpt.length).replace(/^[:\s—-]+/, '') : ''
  const customs = arr.filter((v) => typeof v === 'string' && !f.options.includes(v) && !(otherOpt && v.startsWith(otherOpt)))
  const [draft, setDraft] = useState('')
  const has = (o) => (o === otherOpt ? otherActive : arr.includes(o))
  const toggle = (o) => {
    if (o === otherOpt) onChange(otherActive ? arr.filter((_, i) => i !== otherIdx) : [...arr, otherOpt])
    else onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])
  }
  const setOther = (t) => {
    const entry = t ? `${otherOpt}: ${t}` : otherOpt
    onChange(otherActive ? arr.map((x, i) => (i === otherIdx ? entry : x)) : [...arr, entry])
  }
  const addCustom = () => { const t = draft.trim(); if (t && !arr.includes(t)) onChange([...arr, t]); setDraft('') }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {f.options.map((o) => <button type="button" key={o} className={chipCls(has(o))} onClick={() => toggle(o)}>{o}</button>)}
        {customs.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-brand-600 py-2 pl-3.5 pr-1.5 text-sm font-medium text-white shadow">
            {v}
            <button type="button" onClick={() => onChange(arr.filter((x) => x !== v))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/20"><X size={13} /></button>
          </span>
        ))}
      </div>
      {otherActive && <input className="input mt-2" placeholder="Please mention…" value={otherText} onChange={(e) => setOther(e.target.value)} />}
      {f.addable && (
        <div className="mt-2 flex gap-2">
          <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }} placeholder="Add another…" />
          <button type="button" onClick={addCustom} className="btn-outline shrink-0 text-sm">Add</button>
        </div>
      )}
    </div>
  )
}

// +ve / -ve, with an optional "if present" note when +ve.
function PosNeg({ f, value, onChange }) {
  const isPos = typeof value === 'string' && value.startsWith('+ve')
  const isNeg = value === '-ve'
  const note = isPos && value.length > 3 ? value.slice(3).replace(/^[\s—:-]+/, '') : ''
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chipCls(isPos)} onClick={() => onChange(isPos ? '' : '+ve')}>+ve</button>
        <button type="button" className={chipCls(isNeg)} onClick={() => onChange(isNeg ? '' : '-ve')}>-ve</button>
      </div>
      {f.note && isPos && <input className="input mt-2" placeholder="If present, specify…" value={note} onChange={(e) => onChange(e.target.value ? `+ve — ${e.target.value}` : '+ve')} />}
    </div>
  )
}

// Fill-in-the-blank duration: number + Days/Weeks/Months.
function Duration({ value, onChange }) {
  const m = typeof value === 'string' ? value.match(/^(\d+)\s*(.*)$/) : null
  const n = m ? m[1] : ''
  const unit = m && m[2] ? m[2] : 'Days'
  const emit = (nn, uu) => onChange(nn ? `${nn} ${uu}` : '')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className="input w-24" inputMode="numeric" placeholder="e.g. 3" value={n} onChange={(e) => emit(e.target.value.replace(/\D/g, ''), unit)} />
      <div className="flex flex-wrap gap-2">
        {PAIN_DURATION_UNITS.map((u) => <button type="button" key={u} className={chipCls(unit === u)} onClick={() => emit(n, u)}>{u}</button>)}
      </div>
    </div>
  )
}

// Which program(s) the client is registered for — any combination of
// W2W Treatment / W2W Fitness & Rehab / W2W Fitness, stored as an array so
// the rest of the app (badges, module filters) can just check `.includes(...)`.
// Displayed as "W2W Physio" / "W2W Rehab" / "W2W Fitness" — the stored value
// stays the original identifier so existing client data and filters elsewhere
// never need to change, only the label shown here.
const PROGRAM_OPTIONS = [
  { value: 'W2W Treatment', label: 'W2W Physio' },
  { value: 'W2W Fitness & Rehab', label: 'W2W Rehab' },
  { value: 'W2W Fitness', label: 'W2W Fitness' },
]
function Programs({ value, onChange }) {
  const arr = Array.isArray(value) ? value : []
  function toggle(opt) {
    onChange(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {PROGRAM_OPTIONS.map((o) => <button type="button" key={o.value} className={chipCls(arr.includes(o.value))} onClick={() => toggle(o.value)}>{o.label}</button>)}
    </div>
  )
}

// True when a field value counts as "nothing entered yet" — used to decide
// whether to offer the previous-visit ghost value, regardless of that
// field's shape (plain string, array, or a structured rom/girth/limb object).
function isEmptyVal(v) {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') {
    if (Array.isArray(v.joints)) return v.joints.length === 0 // rom
    if ('type' in v || 'right' in v || 'left' in v) return !v.type && !v.right && !v.left // limb
    return Object.keys(v).length === 0
  }
  return false
}

// Label row shared by every field type — adds a "Last visit: …" chip when a
// returning patient has a previous value for this field and nothing has been
// entered yet this session. Click (or Tab, for plain text fields) to pull the
// previous value in as-is; it then behaves like normal, editable data.
function LabelRow({ label, big, showGhost, ghostPreview, onFill }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
      <label className={`block ${big ? 'text-sm' : 'text-xs'} font-medium text-slate-700`}>{label}</label>
      {showGhost && (
        <button
          type="button" onClick={onFill}
          title="Same as last visit — click (or press Tab) to fill"
          className="flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
        >
          <ArrowRightToLine size={11} className="shrink-0" /> Last visit:
          <span className="max-w-[160px] truncate italic">{ghostPreview}</span>
        </button>
      )}
    </div>
  )
}

// One assessment field. `ghost` is the returning patient's previous value for
// this field (raw — same shape `onChange` expects) — shown as a "Last visit"
// hint when the field is still empty; Tab (plain text fields) or the hint
// itself (any field type) fills it in as ordinary, editable current data.
// `big` enlarges the text; `invalid` shows a red border to flag a required field.
export default function AssessmentField({ f, value, ghost, onChange, big, invalid }) {
  const showGhost = isEmptyVal(value) && !isEmptyVal(ghost)
  const ghostText = showGhost ? formatAssessmentValue(ghost).replace(/\n+/g, ' · ') : ''
  const fillGhost = () => onChange(ghost)
  const onKey = (e) => { if (e.key === 'Tab' && showGhost) { e.preventDefault(); fillGhost() } }
  const wrap = f.full || f.area ? 'sm:col-span-2' : ''
  const bigText = big ? 'text-[1.05rem]' : ''
  const err = invalid ? '!border-red-400 ring-2 ring-red-200' : ''
  const id = `f-${f.k}`

  // Structured pickers (chips / multi / +ve-ve / duration / ROM / girth / limb).
  if (STRUCTURED.includes(f.type)) {
    const fullWrap = (f.full || ['rom', 'girth', 'limb', 'list'].includes(f.type)) ? 'sm:col-span-2' : ''
    return (
      <div className={fullWrap} id={id}>
        <LabelRow label={f.label} big={big} showGhost={showGhost} ghostPreview={ghostText} onFill={fillGhost} />
        <div className={`mt-1 ${err ? 'rounded-xl p-1 ring-2 ring-red-200' : ''}`}>
          {f.type === 'chips' && <Chips f={f} value={value} onChange={onChange} />}
          {f.type === 'multi' && <Multi f={f} value={value} onChange={onChange} />}
          {f.type === 'posneg' && <PosNeg f={f} value={value} onChange={onChange} />}
          {f.type === 'duration' && <Duration value={value} onChange={onChange} />}
          {f.type === 'rom' && <RomField value={value} onChange={onChange} />}
          {f.type === 'girth' && <GirthField value={value} onChange={onChange} />}
          {f.type === 'limb' && <LimbLengthField value={value} onChange={onChange} />}
          {f.type === 'list' && <ListField value={value} onChange={onChange} />}
          {f.type === 'programs' && <Programs value={value} onChange={onChange} />}
        </div>
      </div>
    )
  }

  if (f.type === 'select') {
    return (
      <div className={wrap}>
        <LabelRow label={f.label} big={big} showGhost={showGhost} ghostPreview={ghostText} onFill={fillGhost} />
        <select id={id} className={`input ${bigText} ${err}`} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  if (f.type === 'phone') {
    return (
      <div className={wrap}>
        <LabelRow label={f.label} big={big} showGhost={showGhost} ghostPreview={ghostText} onFill={fillGhost} />
        <PhoneField id={id} value={value} onChange={onChange} invalid={invalid} big={big} />
      </div>
    )
  }
  const T = f.area ? 'textarea' : 'input'
  // Numeric fields (age/height/weight/VAS): digits only, capped to maxLen.
  const handleChange = (e) => {
    let v = e.target.value
    if (f.num) v = v.replace(/\D/g, '').slice(0, f.maxLen || 10)
    onChange(v)
  }
  return (
    <div className={wrap}>
      <LabelRow label={f.label} big={big} showGhost={showGhost} ghostPreview={ghostText} onFill={fillGhost} />
      <T
        id={id}
        className={`input ${f.area ? (big ? 'min-h-[80px]' : 'min-h-[68px]') : ''} ${bigText} ${err}`}
        type={f.type === 'email' ? 'email' : 'text'}
        inputMode={f.num ? 'numeric' : undefined}
        maxLength={f.num ? f.maxLen : undefined}
        value={value}
        placeholder={showGhost ? ghostText : ''}
        onChange={handleChange}
        onKeyDown={onKey}
      />
    </div>
  )
}
