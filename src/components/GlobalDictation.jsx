import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

// Free, browser-native voice-to-text for the whole admin dashboard.
// A floating mic button dictates into whichever text box you last tapped, using
// the browser's built-in SpeechRecognition (Chrome on Windows/Mac/Android, Edge).
// Apple blocks this API on iPhone/iPad, so there the button is hidden and the
// user simply uses the iPhone keyboard's own mic (works in every text box).
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

const isEditable = (el) => !!el && (
  el.tagName === 'TEXTAREA'
  || (el.tagName === 'INPUT' && /^(text|search|email|tel|url|number|)$/i.test(el.type || 'text'))
  || el.isContentEditable
)

// Insert text at the caret of a React-controlled field, firing a native input
// event so React state updates.
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
  try { el.setSelectionRange(pos, pos); el.focus() } catch (_) {}
}

export default function GlobalDictation() {
  const [listening, setListening] = useState(false)
  const targetRef = useRef(null)
  const recRef = useRef(null)

  useEffect(() => {
    const onFocus = (e) => { if (isEditable(e.target)) targetRef.current = e.target }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  useEffect(() => () => { try { recRef.current?.stop() } catch (_) {} }, [])

  if (!SR) return null // iPhone/iPad & unsupported browsers → use the keyboard mic

  const stop = () => { try { recRef.current?.stop() } catch (_) {} setListening(false) }
  const start = () => {
    const el = targetRef.current
    if (!el) { window.alert('Tap the text box you want to fill first, then press the mic.'); return }
    const rec = new SR()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.continuous = true
    rec.onresult = (ev) => {
      let text = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) text += ev.results[i][0].transcript
      if (text) insertText(targetRef.current || el, text.trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    try { rec.start(); setListening(true) } catch (_) { setListening(false) }
  }

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start())}
      title={listening ? 'Stop dictation' : 'Dictate into the selected text box'}
      aria-label={listening ? 'Stop dictation' : 'Start voice dictation'}
      className={`fixed bottom-5 right-5 z-[85] grid h-14 w-14 place-items-center rounded-full shadow-lg ring-4 ring-white/60 transition ${
        listening ? 'animate-pulse bg-red-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
      }`}
    >
      {listening ? <Square size={22} /> : <Mic size={24} />}
    </button>
  )
}
