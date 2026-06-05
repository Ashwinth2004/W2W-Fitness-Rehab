import { useEffect, useState } from 'react'
import { watchBookedTimes } from '../lib/firestore'
import { SLOT_TIMES } from '../lib/constants'

// Formats "14:00" -> "2:00 PM"
export function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m).padStart(2, '0')} ${period}`
}

export default function SlotPicker({ date, value, onChange }) {
  const [booked, setBooked] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!date) return
    setLoading(true)
    const unsub = watchBookedTimes(date, (times) => {
      setBooked(times)
      setLoading(false)
    })
    return unsub
  }, [date])

  if (!date) {
    return <p className="text-sm text-slate-400">Pick a date to see available times.</p>
  }

  // Disable past times if the selected date is today.
  const now = new Date()
  const isToday = date === now.toISOString().slice(0, 10)

  return (
    <div>
      {loading ? (
        <p className="text-sm text-slate-400">Loading slots…</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {SLOT_TIMES.map((t) => {
            const isBooked = booked.includes(t)
            const past = isToday && Number(t.split(':')[0]) <= now.getHours()
            const disabled = isBooked || past
            const selected = value === t
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => onChange(t)}
                className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                  selected
                    ? 'border-brand-600 bg-brand-600 text-white shadow'
                    : disabled
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through'
                    : 'border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50'
                }`}
              >
                {formatTime(t)}
              </button>
            )
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">
        Crossed-out times are already booked or have passed. Sundays are closed.
      </p>
    </div>
  )
}
