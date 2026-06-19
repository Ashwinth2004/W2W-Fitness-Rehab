import { AlertTriangle } from 'lucide-react'
import { firebaseReady } from '../firebase'

// Shows a friendly banner if Firebase env vars are missing (common during the
// first setup). Renders nothing once configured.
export default function ConfigGuard() {
  if (firebaseReady) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950 no-print">
      <AlertTriangle size={16} className="shrink-0" />
      <span>Firebase isn’t configured yet. Copy <code className="rounded bg-amber-600/20 px-1">.env.example</code> to{' '}
      <code className="rounded bg-amber-600/20 px-1">.env</code> and add your Firebase keys (see README).</span>
    </div>
  )
}
