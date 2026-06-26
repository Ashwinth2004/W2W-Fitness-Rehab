import { useEffect, useRef, useState } from 'react'
import { Undo2, Eraser, Check, X, Loader2 } from 'lucide-react'

// A draw-only signature canvas: sign with finger / stylus / mouse, Undo the last
// stroke, Erase to clear, then Save. Exports a tight, transparent-background PNG
// (just the ink) so it sits cleanly on the report's signature line.
const INK = '#1a237e'      // dark blue, like a pen
const LINE_WIDTH = 2.5

// A visible black pen-nib cursor (so you can see where you're signing inside the
// box). Hotspot is at the pen tip (bottom-left).
const PEN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>'
const PEN_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(PEN_SVG)}") 2 22, crosshair`

export default function SignaturePad({ initial = '', onSave, onCancel, busy = false }) {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const strokes = useRef([])      // [[{x,y}, …], …]
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(rect.width * ratio))
    canvas.height = Math.max(1, Math.round(rect.height * ratio))
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = LINE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = INK
    ctxRef.current = ctx
  }, [])

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function redraw() {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    for (const stroke of strokes.current) {
      ctx.beginPath()
      stroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
    }
    setHasInk(strokes.current.length > 0)
  }

  function start(e) {
    e.preventDefault()
    try { canvasRef.current.setPointerCapture?.(e.pointerId) } catch { /* non-capturable pointer */ }
    drawing.current = true
    strokes.current.push([pos(e)])
    setHasInk(true)
  }
  function move(e) {
    if (!drawing.current) return
    e.preventDefault()
    const p = pos(e)
    const stroke = strokes.current[strokes.current.length - 1]
    const last = stroke[stroke.length - 1]
    stroke.push(p)
    const ctx = ctxRef.current
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke()
  }
  const end = () => { drawing.current = false }

  const undo = () => { strokes.current.pop(); redraw() }
  const clearAll = () => { strokes.current = []; redraw() }

  // Crop to the ink's bounding box → a tight transparent PNG.
  function exportPng() {
    const all = strokes.current.flat()
    if (!all.length) return ''
    const pad = 10
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of all) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y) }
    minX -= pad; minY -= pad; maxX += pad; maxY += pad
    const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY)
    const ratio = window.devicePixelRatio || 1
    const out = document.createElement('canvas')
    out.width = Math.round(w * ratio); out.height = Math.round(h * ratio)
    const o = out.getContext('2d')
    o.scale(ratio, ratio)
    o.lineWidth = LINE_WIDTH; o.lineCap = 'round'; o.lineJoin = 'round'; o.strokeStyle = INK
    o.translate(-minX, -minY)
    for (const stroke of strokes.current) {
      o.beginPath()
      stroke.forEach((p, i) => (i === 0 ? o.moveTo(p.x, p.y) : o.lineTo(p.x, p.y)))
      o.stroke()
    }
    return out.toDataURL('image/png')
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white">
        {initial && !hasInk && (
          <img src={initial} alt="" className="pointer-events-none absolute inset-0 m-auto max-h-[80%] max-w-[80%] object-contain opacity-20" />
        )}
        <canvas
          ref={canvasRef}
          className="block h-56 w-full touch-none"
          style={{ touchAction: 'none', cursor: PEN_CURSOR }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        {!hasInk && !initial && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-400">Sign here</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button type="button" onClick={undo} disabled={!hasInk} className="btn-outline disabled:opacity-40"><Undo2 size={16} /> Undo</button>
          <button type="button" onClick={clearAll} disabled={!hasInk} className="btn-outline disabled:opacity-40"><Eraser size={16} /> Erase</button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost"><X size={16} /> Cancel</button>
          <button type="button" onClick={() => onSave(exportPng())} disabled={!hasInk || busy} className="btn-primary disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save signature
          </button>
        </div>
      </div>
    </div>
  )
}
