import PhoneField from './PhoneField'
import { RomField, GirthField, LimbLengthField } from './ClinicalFields'
import { PAIN_DURATION_UNITS } from '../lib/constants'

const STRUCTURED = ['chips', 'multi', 'posneg', 'duration', 'rom', 'girth', 'limb']
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

// Multi-select chips, with optional "Other (mention)" free-text.
function Multi({ f, value, onChange }) {
  const arr = Array.isArray(value) ? value : []
  const otherOpt = f.other ? f.options.find((o) => OTHER.test(o)) : null
  const otherIdx = otherOpt ? arr.findIndex((x) => typeof x === 'string' && x.startsWith(otherOpt)) : -1
  const otherActive = otherIdx >= 0
  const otherText = otherActive && arr[otherIdx].length > otherOpt.length ? arr[otherIdx].slice(otherOpt.length).replace(/^[:\s—-]+/, '') : ''
  const has = (o) => (o === otherOpt ? otherActive : arr.includes(o))
  const toggle = (o) => {
    if (o === otherOpt) onChange(otherActive ? arr.filter((_, i) => i !== otherIdx) : [...arr, otherOpt])
    else onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])
  }
  const setOther = (t) => {
    const entry = t ? `${otherOpt}: ${t}` : otherOpt
    onChange(otherActive ? arr.map((x, i) => (i === otherIdx ? entry : x)) : [...arr, entry])
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {f.options.map((o) => <button type="button" key={o} className={chipCls(has(o))} onClick={() => toggle(o)}>{o}</button>)}
      </div>
      {otherActive && <input className="input mt-2" placeholder="Please mention…" value={otherText} onChange={(e) => setOther(e.target.value)} />}
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

// One assessment field. `ghost` shows a returning patient's previous value
// faintly (Tab to accept). `big` enlarges the text; `invalid` shows a red
// border to flag a required/invalid field.
export default function AssessmentField({ f, value, ghost, onChange, big, invalid }) {
  const onKey = (e) => { if (e.key === 'Tab' && !value && ghost) { e.preventDefault(); onChange(ghost) } }
  const wrap = f.full || f.area ? 'sm:col-span-2' : ''
  const lbl = `label ${big ? 'text-sm' : 'text-xs'}`
  const bigText = big ? 'text-[1.05rem]' : ''
  const err = invalid ? '!border-red-400 ring-2 ring-red-200' : ''
  const id = `f-${f.k}`

  // Structured pickers (chips / multi / +ve-ve / duration / ROM / girth / limb).
  if (STRUCTURED.includes(f.type)) {
    const fullWrap = (f.full || ['rom', 'girth', 'limb'].includes(f.type)) ? 'sm:col-span-2' : ''
    return (
      <div className={fullWrap} id={id}>
        <label className={lbl}>{f.label}</label>
        <div className={`mt-1 ${err ? 'rounded-xl p-1 ring-2 ring-red-200' : ''}`}>
          {f.type === 'chips' && <Chips f={f} value={value} onChange={onChange} />}
          {f.type === 'multi' && <Multi f={f} value={value} onChange={onChange} />}
          {f.type === 'posneg' && <PosNeg f={f} value={value} onChange={onChange} />}
          {f.type === 'duration' && <Duration value={value} onChange={onChange} />}
          {f.type === 'rom' && <RomField value={value} onChange={onChange} />}
          {f.type === 'girth' && <GirthField value={value} onChange={onChange} />}
          {f.type === 'limb' && <LimbLengthField value={value} onChange={onChange} />}
        </div>
      </div>
    )
  }

  if (f.type === 'select') {
    return (
      <div className={wrap}>
        <label className={lbl}>{f.label}</label>
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
        <label className={lbl}>{f.label}</label>
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
      <label className={lbl}>{f.label}</label>
      <T
        id={id}
        className={`input ${f.area ? (big ? 'min-h-[80px]' : 'min-h-[68px]') : ''} ${bigText} ${err}`}
        type={f.type === 'email' ? 'email' : 'text'}
        inputMode={f.num ? 'numeric' : undefined}
        maxLength={f.num ? f.maxLen : undefined}
        value={value}
        placeholder={ghost || ''}
        onChange={handleChange}
        onKeyDown={onKey}
      />
    </div>
  )
}
