import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Tracks whether the current screen has unsaved input. Admin nav links call
// guard(proceed): if there are unsaved changes it shows a "Leave / Stay" prompt,
// otherwise it navigates immediately. Also warns on browser refresh/close.
const Ctx = createContext({ setDirty: () => {}, guard: (p) => p() })

export function useUnsaved() { return useContext(Ctx) }

export function UnsavedProvider({ children }) {
  const dirtyRef = useRef(false)
  const [pending, setPending] = useState(null) // a stored "proceed" fn while prompting

  const setDirty = useCallback((v) => { dirtyRef.current = !!v }, [])

  const guard = useCallback((proceed) => {
    if (!dirtyRef.current) { proceed(); return }
    setPending(() => proceed)
  }, [])

  useEffect(() => {
    const onBeforeUnload = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const leave = () => { dirtyRef.current = false; const p = pending; setPending(null); if (p) p() }
  const stay = () => setPending(null)

  return (
    <Ctx.Provider value={{ setDirty, guard }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-pop-in rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Leave without saving?</h2>
            <p className="mt-2 text-sm text-slate-600">
              You’ve entered details that haven’t been saved yet. If you leave now, they’ll be lost.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={stay} className="btn-primary">Stay</button>
              <button onClick={leave} className="btn-ghost text-red-500 hover:bg-red-50">Don’t save &amp; leave</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
