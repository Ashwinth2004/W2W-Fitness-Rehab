import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useDictation, SR } from '../lib/useDictation'

// Free, browser-native voice-to-text for the whole admin dashboard.
// A floating mic dictates into whichever text box you last tapped (Chrome/Edge
// on Windows/Mac/Android). Apple blocks the API on iPhone/iPad, so there the
// button is hidden — use the iPhone keyboard's own mic in any text box.
const isEditable = (el) => !!el && (
  el.tagName === 'TEXTAREA'
  || (el.tagName === 'INPUT' && /^(text|search|email|tel|url|number|)$/i.test(el.type || 'text'))
  || el.isContentEditable
)

function insertText(el, text) {
  if (!el) return
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const before = el.value.slice(0, start)
  const gap = before && !/\s$/.test(before) ? ' ' : ''
  const next = before + gap + text + el.value.slice(end)
  if (setter) setter.call(el, next); else el.value = next
  el.dispatchEvent(new Event('input', { bubbles: true }))
  const pos = (before + gap + text).length
  try { el.setSelectionRange(pos, pos) } catch (_) {}
}

export default function GlobalDictation() {
  const targetRef = useRef(null)
  const [hint, setHint] = useState('')
  const { listening, error, toggle, stop } = useDictation((text) => {
    if (targetRef.current) insertText(targetRef.current, text)
  })

  useEffect(() => {
    const onFocus = (e) => { if (isEditable(e.target)) targetRef.current = e.target }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  if (!SR) return null // iPhone/iPad → use the keyboard mic

  const onClick = () => {
    if (!listening && !targetRef.current) {
      setHint('Tap the text box you want to fill, then press the mic.')
      setTimeout(() => setHint(''), 2500)
      return
    }
    toggle()
  }

  return (
    <div className="fixed bottom-5 right-5 z-[85] flex flex-col items-end gap-2">
      {(hint || error) && (
        <span className="max-w-[250px] rounded-lg bg-slate-900/90 px-3 py-2 text-xs font-medium text-white shadow">
          {error === 'denied'
            ? 'Mic blocked. Tap the 🔒/ⓘ next to the web address → Site settings → Microphone → Allow, then reload. (Once only.)'
            : error === 'service' ? 'Speech service unavailable — check your internet connection and try again.'
            : error === 'error' ? 'Mic error — try again.' : hint}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        title={listening ? 'Stop dictation' : 'Dictate into the selected text box'}
        aria-label={listening ? 'Stop dictation' : 'Start voice dictation'}
        className={`grid h-14 w-14 place-items-center rounded-full shadow-lg ring-4 ring-white/60 transition ${
          listening ? 'animate-pulse bg-red-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {listening ? <Square size={22} /> : <Mic size={24} />}
      </button>
    </div>
  )
}
