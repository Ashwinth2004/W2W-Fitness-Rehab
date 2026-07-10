import { Mic, Square } from 'lucide-react'
import { useDictation } from '../lib/useDictation'

// Inline voice-to-text button that appends recognised speech via onText().
// On iPhone/iPad (where the browser speech API is blocked) it shows a hint to
// use the phone keyboard's mic instead — so it's never a dead button.
export default function MicButton({ onText, label = 'Speak', size = 'md' }) {
  const { listening, error, supported, toggle } = useDictation(onText)

  if (!supported) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400" title="On iPhone/iPad, tap the box and use your keyboard's microphone">🎤 use keyboard mic</span>
  }

  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  return (
    <span className="inline-flex items-center gap-2">
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
      {error === 'denied' && <span className="text-xs text-red-500">Allow mic access in the browser</span>}
      {error === 'error' && <span className="text-xs text-red-500">Mic error — try again</span>}
    </span>
  )
}
