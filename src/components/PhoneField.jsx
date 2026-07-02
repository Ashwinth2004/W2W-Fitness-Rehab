import { normalizeMobile } from '../lib/validate'

/**
 * Mobile input for Indian numbers. Shows a fixed "+91" prefix and stores the
 * plain 10-digit local number. Pasting a number that already carries the +91
 * country code (12 digits) or a leading 0 is normalised automatically, so a
 * copy-pasted "917200043621" becomes "7200043621" instead of being truncated.
 * value/onChange are plain strings of digits (no country code).
 */
export default function PhoneField({ value, onChange, id, placeholder = '10-digit mobile', required, invalid, big }) {
  const err = invalid ? '!border-red-400 ring-2 ring-red-200' : ''
  return (
    <div className="flex items-stretch">
      <span className="inline-flex select-none items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-500">
        +91
      </span>
      <input
        id={id}
        className={`input rounded-l-none ${big ? 'text-[1.05rem]' : ''} ${err}`}
        value={value}
        onChange={(e) => onChange(normalizeMobile(e.target.value))}
        inputMode="numeric"
        autoComplete="tel"
        maxLength={13}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}
