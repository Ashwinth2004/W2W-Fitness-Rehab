import PhoneField from './PhoneField'

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
