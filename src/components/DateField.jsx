import { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { isoToDisplay, displayToIso, isRealISO, isSundayISO } from '../lib/validate'

/**
 * Date input that shows/accepts DD-MM-YYYY AND has a clickable calendar.
 * - Type the date manually, OR tap the calendar icon to pick from a popup.
 * - The calendar disables dates outside [min, max] (e.g. past dates).
 * Emits an ISO (yyyy-mm-dd) string via onChange, or '' while invalid/incomplete.
 * Props: value(iso), onChange(iso), min(iso), max(iso), blockSunday, id
 */
export default function DateField({ value, onChange, min, max, blockSunday = false, id, placeholder = 'DD-MM-YYYY' }) {
  const [text, setText] = useState(isoToDisplay(value))
  const [err, setErr] = useState('')
  const nativeRef = useRef(null)

  useEffect(() => {
    // Keep in sync if the parent resets the value programmatically.
    setText((t) => (displayToIso(t) === value ? t : isoToDisplay(value)))
  }, [value])

  function validateAndEmit(iso, displayText) {
    setText(displayText)
    setErr('')
    if (!iso || !isRealISO(iso)) { setErr('Enter a valid date.'); onChange(''); return }
    if (min && iso < min) { setErr('Date cannot be in the past.'); onChange(''); return }
    if (max && iso > max) { setErr('Date cannot be in the future.'); onChange(''); return }
    if (blockSunday && isSundayISO(iso)) { setErr('We are closed on Sundays — please pick another day.'); onChange(''); return }
    onChange(iso)
  }

  function handleText(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let out = digits
    if (digits.length > 4) out = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
    else if (digits.length > 2) out = `${digits.slice(0, 2)}-${digits.slice(2)}`
    setText(out)
    setErr('')
    if (out.length < 10) { onChange(''); return }
    validateAndEmit(displayToIso(out), out)
  }

  function handleNative(e) {
    const iso = e.target.value
    if (!iso) return
    validateAndEmit(iso, isoToDisplay(iso))
  }

  function openPicker() {
    const el = nativeRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); return } catch { /* fall through */ }
    }
    el.focus()
    el.click()
  }

  const currentIso = isRealISO(displayToIso(text)) ? displayToIso(text) : ''

  return (
    <div>
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          title="Open calendar"
          aria-label="Open calendar"
          className="absolute left-1.5 top-1.5 z-10 grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
        >
          <Calendar size={18} />
        </button>
        <input
          id={id}
          className="input pl-12"
          value={text}
          onChange={handleText}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
        />
        {/* Hidden native date input drives the calendar popup; min/max disable
            out-of-range (e.g. past) dates in the calendar itself. */}
        <input
          ref={nativeRef}
          type="date"
          value={currentIso}
          min={min || undefined}
          max={max || undefined}
          onChange={handleNative}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-0 h-full w-px opacity-0"
        />
      </div>
      {err && <p className="mt-1 text-sm text-red-500">{err}</p>}
    </div>
  )
}
