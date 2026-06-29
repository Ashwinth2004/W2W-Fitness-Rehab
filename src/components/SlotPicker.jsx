import { useEffect, useState } from 'react'
import { watchDayAvailability } from '../lib/firestore'
import { SLOT_TIMES, SLOT_MINUTES } from '../lib/constants'

// Formats "14:00" -> "2:00 PM"
export function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m).padStart(2, '0')} ${period}`
}

// Adds minutes to a "HH:MM" string -> "HH:MM"
function addMinutes(t, mins) {
  const [h, m] = t.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Formats a slot as its 30-min window, e.g. "09:00" -> "9:00 – 9:30 AM"
export function formatSlot(t) {
  const end = addMinutes(t, SLOT_MINUTES)
  const startP = Number(t.split(':')[0]) >= 12 ? 'PM' : 'AM'
  const endP = Number(end.split(':')[0]) >= 12 ? 'PM' : 'AM'
  // Drop the period on the start time when both halves share it (cleaner label).
  const start = startP === endP ? formatTime(t).replace(/ [AP]M$/, '') : formatTime(t)
  return `${start} – ${formatTime(end)}`
}

export default function SlotPicker({ date, value, onChange }) {
  const [booked, setBooked] = useState([])
  const [blocked, setBlocked] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!date) return
    setLoading(true)
    let settled = false
    const unsub = watchDayAvailability(date, ({ booked, blocked }) => {
      settled = true
      setBooked(booked)
      setBlocked(blocked)
      setLoading(false)
    })
    // Safety net: never show "Loading…" forever.
    const t = setTimeout(() => { if (!settled) setLoading(false) }, 6000)
    return () => { clearTimeout(t); unsub() }
  }, [date])

  if (!date) {
    return <p className="text-sm text-slate-400">Pick a date to see available times.</p>
  }

  // Disable past times if the selected date is today.
  const now = new Date()
  const isToday = date === now.toISOString().slice(0, 10)
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div>
      {loading ? (
        <p className="text-sm text-slate-400">Loading slots…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SLOT_TIMES.map((t) => {
            const isBooked = booked.includes(t)
            const isBlocked = blocked.includes(t)
            const past = isToday && t <= nowHM
            const disabled = isBooked || isBlocked || past
            const selected = value === t
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                title={isBlocked ? 'Unavailable — marked off by the clinic' : undefined}
                onClick={() => onChange(t)}
                className={`flex min-h-[3.25rem] items-center justify-center rounded-xl border px-2 py-1.5 text-center text-sm font-medium leading-tight transition ${
                  selected
                    ? 'border-brand-600 bg-brand-600 text-white shadow'
                    : disabled
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through'
                    : 'border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50'
                }`}
              >
                {formatSlot(t)}
              </button>
            )
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">
        Crossed-out times are already booked, marked unavailable, or have passed. Sundays are closed.
      </p>
    </div>
  )
}
