import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { isoToDisplay, displayToIso, isRealISO, isSundayISO } from '../lib/validate'

/**
 * Date input that always shows and accepts DD-MM-YYYY.
 * Emits an ISO (yyyy-mm-dd) string via onChange, or '' while invalid/incomplete.
 * Props: value(iso), onChange(iso), min(iso), max(iso), blockSunday, id
 */
export default function DateField({ value, onChange, min, max, blockSunday = false, id, placeholder = 'DD-MM-YYYY' }) {
  const [text, setText] = useState(isoToDisplay(value))
  const [err, setErr] = useState('')

  useEffect(() => {
    // Keep in sync if the parent resets the value programmatically.
    setText((t) => (displayToIso(t) === value ? t : isoToDisplay(value)))
  }, [value])

  function handle(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let out = digits
    if (digits.length > 4) out = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
    else if (digits.length > 2) out = `${digits.slice(0, 2)}-${digits.slice(2)}`
    setText(out)
    setErr('')

    if (out.length < 10) {
      onChange('')
      return
    }
    const iso = displayToIso(out)
    if (!iso || !isRealISO(iso)) { setErr('Enter a valid date.'); onChange(''); return }
    if (min && iso < min) { setErr('Date cannot be in the past.'); onChange(''); return }
    if (max && iso > max) { setErr('Date cannot be in the future.'); onChange(''); return }
    if (blockSunday && isSundayISO(iso)) { setErr('We are closed on Sundays.'); onChange(''); return }
    onChange(iso)
  }

  return (
    <div>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
        <input
          id={id}
          className="input pl-10"
          value={text}
          onChange={handle}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
        />
      </div>
      {err && <p className="mt-1 text-sm text-red-500">{err}</p>}
    </div>
  )
}
