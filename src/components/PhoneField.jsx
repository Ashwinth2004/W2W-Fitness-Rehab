import { Phone } from 'lucide-react'
import { onlyDigits } from '../lib/validate'

/**
 * Mobile input that accepts digits only, max 10 (Indian mobile).
 * value/onChange are plain strings of digits.
 */
export default function PhoneField({ value, onChange, id, placeholder = '10-digit mobile', required }) {
  return (
    <div className="relative">
      <Phone className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
      <input
        id={id}
        className="input pl-10"
        value={value}
        onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 10))}
        inputMode="numeric"
        autoComplete="tel"
        maxLength={10}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}
