import { useEffect, useRef, useState } from 'react'

// Browser-native speech-to-text (free). Chrome/Edge on Windows/Mac/Android
// support it; Apple blocks it in all iPhone/iPad browsers, so `supported` is
// false there and the UI should tell the user to use the keyboard mic instead.
export const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

// onText(finalTranscript) is called with each recognised phrase.
// error: '' | 'denied' (permission) | 'service' (speech backend / offline) | 'error'
export function useDictation(onText) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const wantRef = useRef(false)
  const timerRef = useRef(null)
  const cbRef = useRef(onText)
  cbRef.current = onText

  // Detach handlers and abort any live recognition (so manual stop / restart is clean).
  const cleanup = () => {
    clearTimeout(timerRef.current)
    const rec = recRef.current
    recRef.current = null
    if (rec) { try { rec.onend = null; rec.onerror = null; rec.onresult = null; rec.abort() } catch (_) {} }
  }

  const begin = () => {
    if (!SR) { setError('error'); return }
    let rec
    try { rec = new SR() } catch (_) { setError('error'); return }
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.continuous = true
    rec.onresult = (ev) => {
      let s = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) s += ev.results[i][0].transcript
      if (s.trim()) cbRef.current?.(s.trim())
    }
    rec.onerror = (e) => {
      const err = e.error
      if (err === 'not-allowed') { setError('denied'); wantRef.current = false; setListening(false) }
      else if (err === 'service-not-allowed' || err === 'network') { setError('service'); wantRef.current = false; setListening(false) }
      else if (err === 'no-speech' || err === 'aborted') { /* normal — ignore */ }
      else setError('error')
    }
    // Mobile/desktop recognition ends on each pause — restart (fresh instance) while wanted.
    rec.onend = () => {
      recRef.current = null
      if (wantRef.current) timerRef.current = setTimeout(begin, 350)
      else setListening(false)
    }
    recRef.current = rec
    try { rec.start(); setListening(true); setError('') } catch (_) { /* start throws if already starting; onend will retry */ }
  }

  const start = () => { setError(''); wantRef.current = true; cleanup(); begin() }
  const stop = () => { wantRef.current = false; setListening(false); cleanup() }
  const toggle = () => (listening ? stop() : start())

  useEffect(() => () => { wantRef.current = false; cleanup() }, [])

  return { listening, error, supported: !!SR, toggle, start, stop }
}
