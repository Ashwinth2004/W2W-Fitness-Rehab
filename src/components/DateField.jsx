import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { isoToDisplay, displayToIso, isRealISO, isSundayISO } from '../lib/validate'

/**
 * Date input with DD-MM-YYYY typing + a custom calendar popover.
 * The calendar disables past dates (< min), dates beyond max, and — when
 * blockSunday is set — every Sunday, so they can't be clicked at all.
 * Emits an ISO (yyyy-mm-dd) string via onChange, or '' while invalid/incomplete.
 *
 * The popover renders in a portal with fixed positioning so it is never clipped
 * by a scrollable container (e.g. a modal) and flips above the input if there
 * isn't enough room below.
 */
const pad = (n) => String(n).padStart(2, '0')
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}` // m is 0-based
const todayISO = () => new Date().toISOString().slice(0, 10)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const POP_W = 288 // w-72

export default function DateField({ value, onChange, min, max, blockSunday = false, id, placeholder = 'DD-MM-YYYY' }) {
  const [text, setText] = useState(isoToDisplay(value))
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const wrapRef = useRef(null)
  const popRef = useRef(null)

  const startMonth = () => {
    const base = isRealISO(displayToIso(text)) ? displayToIso(text) : (min || todayISO())
    const [y, m] = base.split('-').map(Number)
    return { y, m: m - 1 }
  }
  const [view, setView] = useState(startMonth)

  useEffect(() => {
    setText((t) => (displayToIso(t) === value ? t : isoToDisplay(value)))
  }, [value])

  // Position the portal popover next to the input (flip up if no room below).
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const el = wrapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const popH = popRef.current?.offsetHeight || 360
      const gap = 8
      let top = r.bottom + gap
      if (top + popH > window.innerHeight - 8 && r.top - gap - popH > 8) top = r.top - gap - popH
      let left = r.left
      if (left + POP_W > window.innerWidth - 8) left = window.innerWidth - POP_W - 8
      if (left < 8) left = 8
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, view])

  // Close on outside click / Escape (account for the portalled popover).
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

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

  function toggleCal() {
    if (!open) setView(startMonth())
    setOpen((v) => !v)
  }

  const dayDisabled = (iso, dow) => {
    if (min && iso < min) return true
    if (max && iso > max) return true
    if (blockSunday && dow === 0) return true
    return false
  }

  function pick(iso) {
    setOpen(false)
    validateAndEmit(iso, isoToDisplay(iso))
  }

  const shiftMonth = (delta) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const minRank = min ? (() => { const [y, m] = min.split('-').map(Number); return y * 12 + (m - 1) })() : -Infinity
  const maxRank = max ? (() => { const [y, m] = max.split('-').map(Number); return y * 12 + (m - 1) })() : Infinity
  const viewRank = view.y * 12 + view.m
  const canPrev = viewRank > minRank
  const canNext = viewRank < maxRank

  const startDow = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const selIso = isRealISO(displayToIso(text)) ? displayToIso(text) : ''
  const today = todayISO()

  // Year range for the quick-jump dropdown (defaults to ±10 years when
  // unbounded, so previous years are always one click away).
  const curY = new Date().getFullYear()
  let yMin = min ? Number(min.slice(0, 4)) : curY - 10
  let yMax = max ? Number(max.slice(0, 4)) : curY + 2
  yMin = Math.min(yMin, view.y)
  yMax = Math.max(yMax, view.y)
  const years = []
  for (let y = yMax; y >= yMin; y--) years.push(y)

  const popover = (
    <div
      ref={popRef}
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: POP_W }}
      className="z-[200] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} disabled={!canPrev}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"><ChevronLeft size={18} /></button>
        <div className="flex items-center gap-1.5">
          <select value={view.m} onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-1 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none">
            {MONTHS.map((mn, i) => <option key={mn} value={i}>{mn}</option>)}
          </select>
          <select value={view.y} onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-1 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => shiftMonth(1)} disabled={!canNext}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next month"><ChevronRight size={18} /></button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">
        {WEEK.map((d, i) => <span key={d} className={i === 0 ? 'text-slate-300' : ''}>{d}</span>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {Array.from({ length: startDow }).map((_, i) => <span key={'pad' + i} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1
          const iso = toISO(view.y, view.m, d)
          const dow = new Date(view.y, view.m, d).getDay()
          const disabled = dayDisabled(iso, dow)
          const selected = iso === selIso
          const isToday = iso === today
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => pick(iso)}
              className={`grid h-9 place-items-center rounded-lg text-sm transition ${
                selected
                  ? 'bg-brand-600 font-semibold text-white'
                  : disabled
                  ? 'cursor-not-allowed text-slate-300 line-through decoration-slate-200'
                  : 'text-slate-700 hover:bg-brand-50 hover:text-brand-700'
              } ${isToday && !selected ? 'ring-1 ring-brand-300' : ''}`}
            >
              {d}
            </button>
          )
        })}
      </div>

      <p className="mt-2 px-1 text-[11px] text-slate-400">
        {blockSunday ? 'Sundays & past dates are unavailable.' : 'Past dates are unavailable.'}
      </p>
    </div>
  )

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <button
          type="button"
          onClick={toggleCal}
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
          onFocus={() => setOpen(false)}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
        />
      </div>
      {err && <p className="mt-1 text-sm text-red-500">{err}</p>}

      {open && typeof document !== 'undefined' && createPortal(popover, document.body)}
    </div>
  )
}
