import { useState } from 'react'
import { REGIONS, VIEW_W, VIEW_H, DEFAULT_R } from '../lib/bodyRegions'

// Interactive body pain chart (front + back). Each of the 50 numbered regions is
// a clickable hotspot over the reference image; selecting one tints it light
// orange and stores its id in the `painAreas` array. Multi-select, toggle,
// readonly display mode. Region geometry lives in lib/bodyRegions.js.
//
//   <BodyPainSelector value={painAreas} onChange={setPainAreas} />
//   <BodyPainSelector value={painAreas} readonly />
const SELECTED = '#FFA94D'

export default function BodyPainSelector({ value = [], onChange, readonly = false }) {
  const [hover, setHover] = useState(null)
  const selected = new Set(value)

  const toggle = (id) => {
    if (readonly) return
    const next = selected.has(id) ? value.filter((x) => x !== id) : [...value, id]
    onChange(next.slice().sort((a, b) => a - b))
  }

  return (
    <div className="mx-auto w-full max-w-3xl select-none">
      <div className="relative">
        <img src="/body-pain-chart.jpg" alt="Body pain chart — front and back" className="w-full" draggable={false} />
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
          {REGIONS.map((reg) => {
            const on = selected.has(reg.id)
            const hot = hover === reg.id && !readonly
            return (
              <circle
                key={reg.id}
                cx={reg.cx}
                cy={reg.cy}
                r={reg.r || DEFAULT_R}
                fill={SELECTED}
                fillOpacity={on ? 0.55 : hot ? 0.25 : 0}
                stroke={on ? '#e8590c' : 'transparent'}
                strokeWidth={on ? 3 : 0}
                onClick={() => toggle(reg.id)}
                onMouseEnter={() => !readonly && setHover(reg.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: readonly ? 'default' : 'pointer', pointerEvents: readonly ? 'none' : 'auto' }}
              />
            )
          })}
        </svg>
      </div>
      {!readonly && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Tap the painful areas — front &amp; back. Tap again to deselect.
          {value.length > 0 && <span className="ml-1 font-medium text-brand-600">{value.length} selected</span>}
        </p>
      )}
      {readonly && value.length === 0 && (
        <p className="mt-2 text-center text-xs text-slate-400">No pain areas marked.</p>
      )}
    </div>
  )
}
