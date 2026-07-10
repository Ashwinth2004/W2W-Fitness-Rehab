import { useEffect, useRef, useState } from 'react'

// Browser-native speech-to-text (free). Chrome/Edge on Windows/Mac/Android
// support it; Apple blocks it in all iPhone/iPad browsers.
export const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

// Only ONE recognition may run in the whole page (Chrome errors otherwise).
let ACTIVE = null

// onText(finalTranscript) fires for each recognised phrase.
// error: '' | 'denied' (permission) | 'service' (mic busy / offline / backend) | 'error'
export function useDictation(onText) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState('') // raw error code, shown for diagnosis
  const recRef = useRef(null)
  const wantRef = useRef(false)
  const permRef = useRef(false)
  const timerRef = useRef(null)
  const cbRef = useRef(onText)
  cbRef.current = onText

  const clearRec = () => {
    clearTimeout(timerRef.current)
    const rec = recRef.current
    recRef.current = null
    if (rec) {
      try { rec.onstart = null; rec.onend = null; rec.onerror = null; rec.onresult = null; rec.abort() } catch (_) {}
      if (ACTIVE === rec) ACTIVE = null
    }
  }

  const beginSR = () => {
    if (ACTIVE) { try { ACTIVE.abort() } catch (_) {} ACTIVE = null }
    let rec
    try { rec = new SR() } catch (_) { setError('error'); return }
    rec.lang = 'en-IN'
    rec.continuous = true
    rec.interimResults = true
    rec.onstart = () => { setListening(true); setError('') }
    rec.onresult = (e) => {
      let s = ''
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) s += e.results[i][0].transcript
      if (s.trim()) cbRef.current?.(s.trim())
    }
    rec.onerror = (e) => {
      const er = e.error
      if (er === 'no-speech' || er === 'aborted') return // normal — the onend restart handles it
      setDetail(`sr:${er}`)
      if (er === 'not-allowed') { setError(permRef.current ? 'service' : 'denied'); wantRef.current = false; setListening(false) }
      else if (er === 'service-not-allowed' || er === 'network') { setError('service'); wantRef.current = false; setListening(false) }
      else setError('error')
    }
    rec.onend = () => {
      if (ACTIVE === rec) ACTIVE = null
      recRef.current = null
      if (wantRef.current) timerRef.current = setTimeout(() => { if (wantRef.current) beginSR() }, 120)
      else setListening(false)
    }
    recRef.current = rec
    ACTIVE = rec
    try { rec.start() } catch (_) { /* onend will retry */ }
  }

  const start = async () => {
    if (!SR) { setError('error'); return }
    setError(''); setDetail('')
    wantRef.current = true
    clearRec()
    // Reliable permission gate + mic warm-up (better signal than the speech API's
    // own flaky "not-allowed"). If this grants, the recognition below is trusted.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
        permRef.current = true
      } catch (e) {
        setDetail(`gum:${e?.name || 'err'}`)
        setError(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'service')
        wantRef.current = false
        return
      }
    }
    if (wantRef.current) beginSR()
  }

  const stop = () => { wantRef.current = false; setListening(false); clearRec() }
  const toggle = () => { if (listening) stop(); else start() }

  useEffect(() => () => { wantRef.current = false; clearRec() }, [])

  return { listening, error, detail, supported: !!SR, toggle, start, stop }
}
