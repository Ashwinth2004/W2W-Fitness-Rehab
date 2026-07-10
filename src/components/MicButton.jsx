import { Mic, Square } from 'lucide-react'
import { useDictation } from '../lib/useDictation'

// Inline voice-to-text button that appends recognised speech via onText().
// On iPhone/iPad (browser speech API blocked) it shows a clear hint to use the
// phone keyboard's mic — so it's never a dead button.
export default function MicButton({ onText, label = 'Speak', size = 'md' }) {
  const { listening, error, supported, toggle } = useDictation(onText)

  if (!supported) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">
        🎤 Tap the box &amp; use your keyboard mic
      </span>
    )
  }

  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium transition ${pad} ${
          listening ? 'animate-pulse bg-red-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {listening ? <Square size={14} /> : <Mic size={15} />}
        {listening ? 'Listening… tap to stop' : label}
      </button>
      {error === 'denied' && (
        <span className="max-w-xs text-xs text-red-500">
          Mic blocked. Tap the <strong>🔒 / ⓘ</strong> left of the web address → <strong>Site settings → Microphone → Allow</strong>, then reload.
        </span>
      )}
      {error === 'service' && (
        <span className="max-w-xs text-xs text-red-500">Speech service unavailable — check your internet connection and try again.</span>
      )}
      {error === 'error' && <span className="text-xs text-red-500">Mic error — try again.</span>}
    </span>
  )
}
