import { useEffect, useRef, useState } from 'react'

// Browser-native speech-to-text (free). Chrome/Edge on Windows/Mac/Android
// support it; Apple blocks it in all iPhone/iPad browsers, so `supported` is
// false there and the UI should tell the user to use the keyboard mic instead.
export const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

// onText(finalTranscript) is called with each recognised phrase.
export function useDictation(onText) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('') // '' | 'denied' | 'error'
  const recRef = useRef(null)
  const wantRef = useRef(false)
  const cbRef = useRef(onText)
  cbRef.current = onText

  const stop = () => {
    wantRef.current = false
    try { recRef.current?.stop() } catch (_) {}
    setListening(false)
  }

  const start = () => {
    if (!SR) { setError('error'); return }
    setError('')
    wantRef.current = true
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
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setError('denied'); wantRef.current = false; setListening(false) }
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setError('error')
    }
    // Mobile browsers stop after each pause — restart while the user keeps it on.
    rec.onend = () => { if (wantRef.current) { try { rec.start() } catch (_) { setListening(false) } } else setListening(false) }
    recRef.current = rec
    try { rec.start(); setListening(true) } catch (_) { setListening(false) }
  }

  const toggle = () => (listening ? stop() : start())
  useEffect(() => () => { wantRef.current = false; try { recRef.current?.stop() } catch (_) {} }, [])

  return { listening, error, supported: !!SR, toggle, start, stop }
}
