import PhoneField from './PhoneField'

// One assessment field. For returning patients, `ghost` shows the previous
// value faintly (Tab in an empty field accepts it).
export default function AssessmentField({ f, value, ghost, onChange }) {
  const onKey = (e) => { if (e.key === 'Tab' && !value && ghost) { e.preventDefault(); onChange(ghost) } }
  const wrap = f.full || f.area ? 'sm:col-span-2' : ''

  if (f.type === 'select') {
    return (
      <div className={wrap}>
        <label className="label text-xs">{f.label}</label>
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  if (f.type === 'phone') {
    return (
      <div className={wrap}>
        <label className="label text-xs">{f.label}</label>
        <PhoneField value={value} onChange={onChange} />
      </div>
    )
  }
  const T = f.area ? 'textarea' : 'input'
  return (
    <div className={wrap}>
      <label className="label text-xs">{f.label}</label>
      <T
        className={`input ${f.area ? 'min-h-[68px]' : ''}`}
        type={f.type === 'email' ? 'email' : 'text'}
        inputMode={f.num ? 'numeric' : undefined}
        value={value}
        placeholder={ghost || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
      />
    </div>
  )
}
