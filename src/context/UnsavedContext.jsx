import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Tracks whether the current screen has unsaved input. Admin nav links call
// guard(proceed): if there are unsaved changes it shows a "Leave / Stay" prompt,
// otherwise it navigates immediately. It also warns on:
//   • browser refresh / closing the tab (beforeunload)
//   • the browser / device Back button (popstate) — important on mobile.
const Ctx = createContext({ setDirty: () => {}, guard: (p) => p() })

export function useUnsaved() { return useContext(Ctx) }

export function UnsavedProvider({ children }) {
  const dirtyRef = useRef(false)
  const armedRef = useRef(false) // is a history sentinel in place for Back-button capture?
  const [prompt, setPrompt] = useState(null) // { proceed, pop }

  // Push a sentinel history entry so the first Back press lands on us (popstate)
  // instead of leaving the form. Only one sentinel per dirty session.
  const arm = () => {
    if (armedRef.current) return
    armedRef.current = true
    try { window.history.pushState(null, '', window.location.href) } catch (_) {}
  }

  const setDirty = useCallback((v) => {
    dirtyRef.current = !!v
    if (v) arm()
    else armedRef.current = false
  }, [])

  const guard = useCallback((proceed) => {
    if (!dirtyRef.current) { proceed(); return }
    setPrompt({ proceed, pop: false })
  }, [])

  useEffect(() => {
    const onBeforeUnload = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    const onPop = () => {
      if (!dirtyRef.current) return
      // The sentinel was just consumed; we're back on the form's URL. Ask before
      // actually leaving — going back again pops to the real previous page.
      setPrompt({ proceed: () => { dirtyRef.current = false; armedRef.current = false; window.history.back() }, pop: true })
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  const leave = () => { dirtyRef.current = false; const p = prompt; setPrompt(null); p?.proceed() }
  const stay = () => {
    const wasPop = prompt?.pop
    setPrompt(null)
    // After a Back-button prompt the sentinel is gone — re-arm so the next Back is caught too.
    if (wasPop && dirtyRef.current) { armedRef.current = false; arm() }
  }

  return (
    <Ctx.Provider value={{ setDirty, guard }}>
      {children}
      {prompt && (
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
