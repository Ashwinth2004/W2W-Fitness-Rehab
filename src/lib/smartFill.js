// ============================================================================
//  Smart Fill — a FREE, keyword-based parser that turns a dictated/pasted
//  consultation note into best-guess values for the treatment form. No AI, no
//  cost: it recognises option keywords, numbers and simple "Label: value"
//  lines. Everything it fills is a SUGGESTION for the clinician to review.
// ============================================================================
import {
  BUILT_OPTIONS, PAIN_TYPE_OPTIONS, ADL_IMPACT_OPTIONS,
  FUNCTIONAL_UPPER, FUNCTIONAL_LOWER, JOINTS,
} from './constants'

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const includesAny = (t, words) => words.some((w) => t.includes(w))
// "-ve" when the term is explicitly negated nearby, else "+ve".
function posNeg(t, term) {
  if (!t.includes(term)) return null
  const negated = new RegExp(`(no|nil|without|absent)\\s+${term}|${term}\\s+(is\\s+)?(absent|negative|nil|-ve)`).test(t)
  return negated ? '-ve' : '+ve'
}

// Turn a captured chunk into a numbered-list string (for list-type fields).
function toList(value) {
  const items = String(value).split(/[;,\n]|\band\b/).map((s) => s.trim()).filter(Boolean)
  return items.map((s, i) => `${i + 1}. ${s}`).join('\n')
}

// Labelled "key: value" extraction (fires when dictation includes labels).
const LABELS = [
  [['chief complaint', 'complaint', 'c/o'], 'complaint', 'text'],
  [['past medical history', 'past history', 'pmh'], 'pastHistory', 'text'],
  [['mechanism of injury', 'mechanism', 'mode of injury'], 'mechanism', 'text'],
  [['radiological report', 'radiology', 'x-ray', 'xray', 'mri', 'ct scan', 'scan report'], 'radiology', 'text'],
  [['aggravating factor', 'aggravating', 'aggravated by'], 'painAggravating', 'text'],
  [['relieving factor', 'relieving', 'relieved by'], 'painRelieving', 'text'],
  [['deformities', 'deformity', 'edema', 'wasting'], 'deformities', 'text'],
  [['gait'], 'gait', 'text'],
  [['end feel', 'end-feel'], 'endFeel', 'text'],
  [['tenderness'], 'tenderness', 'text'],
  [['special tests', 'special test'], 'specialTests', 'list'],
  [['opinion', 'impression', 'diagnosis'], 'opinion', 'text'],
  [['treatment options'], 'treatmentOptions', 'text'],
  [['expected recovery', 'prognosis'], 'expectedRecovery', 'text'],
  [['treatment plan', 'plan'], 'treatmentPlan', 'list'],
  [['follow up', 'follow-up', 'review in', 'review after'], 'followUp', 'list'],
  [['objective notes'], 'objectiveNotes', 'text'],
]

export function parseAssessment(raw) {
  const patch = {}
  const filled = []
  const orig = String(raw || '')
  const t = ` ${orig.toLowerCase().replace(/\s+/g, ' ')} `
  const mark = (label) => { if (!filled.includes(label)) filled.push(label) }

  // --- Built (Ectomorph / Mesomorph / Endomorph) ---
  for (const b of BUILT_OPTIONS) if (t.includes(b.toLowerCase())) { patch.built = b; mark('Built'); break }

  // --- Pain type (multi) ---
  const painMap = [
    ['Sharp / Shooting', ['sharp', 'shooting']],
    ['Dull / Aching', ['dull', 'aching', 'ache']],
    ['Burning / Tingling', ['burning', 'tingling', 'tingle']],
    ['Throbbing / Pulsing', ['throbbing', 'pulsing', 'pulsating']],
    ['Deep / Heavy', ['deep', 'heavy']],
  ]
  const painTypes = painMap.filter(([, ws]) => includesAny(t, ws)).map(([o]) => o).filter((o) => PAIN_TYPE_OPTIONS.includes(o))
  if (painTypes.length) { patch.painType = painTypes; mark('Pain type') }

  // --- ADL impact ---
  if (includesAny(t, ["doesn't affect", 'does not affect', 'not affecting', 'not affect', 'no effect on adl'])) { patch.painADL = ADL_IMPACT_OPTIONS[0]; mark('ADL impact') }
  else if (includesAny(t, ['affecting adl', 'affects adl', 'affecting his', 'affecting her', 'affecting daily', 'impact on adl', 'affecting activities'])) { patch.painADL = ADL_IMPACT_OPTIONS[1]; mark('ADL impact') }

  // --- Duration ---
  const dm = t.match(/(\d+)\s*(day|week|month)/)
  if (dm) { const u = { day: 'Days', week: 'Weeks', month: 'Months' }[dm[2]]; patch.painDuration = `${dm[1]} ${u}`; mark('Duration') }

  // --- VAS (x/10 or "vas x") ---
  const vm = t.match(/vas[^\d]{0,6}(\d{1,2})/) || t.match(/(\d{1,2})\s*\/\s*10/)
  if (vm) { patch.vas = String(Math.min(10, Number(vm[1]))); mark('VAS') }

  // --- Palpation ---
  const sw = posNeg(t, 'swelling'); if (sw) { patch.swelling = sw; mark('Swelling') }
  const sp = posNeg(t, 'spasm'); if (sp) { patch.spasm = sp; mark('Spasm') }
  if (t.includes('crepitus') || t.includes('crackling') || t.includes('clicking')) {
    patch.crepitus = /(no|absent|negative)[^.]{0,12}crepitus|crepitus[^.]{0,12}(absent|negative)/.test(t) ? '-ve' : '+ve'
    mark('Crepitus')
  }

  // --- Movement quality (avoid matching the very common word "normal" loosely) ---
  if (t.includes('compensated')) { patch.movementQuality = 'Compensated'; mark('Movement quality') }
  else if (t.includes('guarded')) { patch.movementQuality = 'Guarded'; mark('Movement quality') }
  else if (includesAny(t, ['poor control', 'poor motor control'])) { patch.movementQuality = 'Poor Control'; mark('Movement quality') }
  else if (includesAny(t, ['movement normal', 'quality normal', 'good control', 'normal movement'])) { patch.movementQuality = 'Normal'; mark('Movement quality') }

  // --- Functional activities (loose match on the option's leading word) ---
  const matchFunctional = (opts) => opts.filter((o) => {
    const key = o.toLowerCase().split('(')[0].split('/')[0].trim()
    return key.length > 3 && t.includes(key)
  })
  const fu = matchFunctional(FUNCTIONAL_UPPER); if (fu.length) { patch.functionalUpper = fu; mark('Functional (upper)') }
  const fl = matchFunctional(FUNCTIONAL_LOWER); if (fl.length) { patch.functionalLower = fl; mark('Functional (lower)') }

  // --- ROM by joint (numbers + pain response, scoped to each joint's mention) ---
  const positions = JOINTS
    .map((j) => ({ j, idx: t.indexOf(` ${j.name.toLowerCase()}`) }))
    .filter((x) => x.idx >= 0)
    .sort((a, b) => a.idx - b.idx)
  const joints = []
  const exam = {}
  for (let i = 0; i < positions.length; i++) {
    const { j, idx } = positions[i]
    const seg = t.slice(idx, i + 1 < positions.length ? positions[i + 1].idx : Math.min(t.length, idx + 220))
    const mv = {}
    if (j.type !== 'spine') {
      for (const m of j.movements) {
        const kw = m.name.toLowerCase().split('(')[0].trim()
        const found = seg.match(new RegExp(`${escapeRe(kw)}[^\\d]{0,15}(\\d{1,3})`))
        if (found) mv[m.key] = { arom: found[1] }
      }
    }
    let pain = ''
    if (/throughout/.test(seg)) pain = 'Throughout ROM'
    else if (/end.?range/.test(seg)) pain = 'End-range Pain'
    else if (/unable to assess/.test(seg)) pain = 'Unable to Assess'
    else if (/(no pain|painless|pain free)/.test(seg)) pain = 'No'
    if (pain) Object.keys(mv).forEach((k) => { mv[k].pain = pain })
    if (Object.keys(mv).length) { joints.push(j.id); exam[j.id] = { note: '', mv } }
  }
  if (joints.length) { patch.rom = { joints, exam }; mark('ROM') }

  // --- Labelled "key: value" lines (History, Plan, Follow-up, etc.) ---
  for (const [names, key, kind] of LABELS) {
    if (key in patch) continue
    for (const name of names) {
      const m = orig.match(new RegExp(`${escapeRe(name)}\\s*[:\\-]\\s*([^\\n]+)`, 'i'))
      if (m && m[1].trim()) {
        const val = m[1].trim().replace(/\s+$/, '')
        patch[key] = kind === 'list' ? toList(val) : val
        mark(name.charAt(0).toUpperCase() + name.slice(1))
        break
      }
    }
  }

  return { patch, filled }
}
