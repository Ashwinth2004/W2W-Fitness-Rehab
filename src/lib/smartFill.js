// ============================================================================
//  Smart Fill — a FREE, keyword-based parser that turns a dictated/pasted
//  consultation note into best-guess values for the treatment form. No AI, no
//  cost. It recognises option keywords, numbers, "Label: value" sections,
//  girth/limb measurements and joint ROM. Everything it fills is a SUGGESTION
//  for the clinician to review.
// ============================================================================
import {
  BUILT_OPTIONS, PAIN_TYPE_OPTIONS, ADL_IMPACT_OPTIONS,
  FUNCTIONAL_UPPER, FUNCTIONAL_LOWER, JOINTS, GIRTH_SITES, LIMB_LENGTH_TYPES,
} from './constants'

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const includesAny = (t, words) => words.some((w) => t.includes(w))
function posNeg(t, term) {
  if (!t.includes(term)) return null
  const negated = new RegExp(`(no|nil|without|absent)\\s+${term}|${term}\\s+(is\\s+)?(absent|negative|nil|-ve)`).test(t)
  return negated ? '-ve' : '+ve'
}
function toList(value) {
  const items = String(value).split(/[;,\n]|\band\b/).map((s) => s.trim()).filter(Boolean)
  return items.map((s, i) => `${i + 1}. ${s}`).join('\n')
}
const numNear = (seg, word) => {
  const m = seg.match(new RegExp(`${word}[^\\d]{0,6}(\\d{1,3}(?:\\.\\d)?)`))
  return m ? m[1] : ''
}

// Girth site → spoken keywords
const GIRTH_KW = {
  'Mid Arm': ['mid arm', 'mid-arm', 'midarm'],
  'Maximum Forearm Girth': ['forearm'],
  '10 cm Above Patella': ['above patella', '10 cm above', 'ten cm above'],
  'Knee Joint Line (Mid-Patella)': ['knee joint', 'mid-patella', 'mid patella'],
  'Maximum Calf Girth': ['calf'],
  'Figure-of-Eight (Ankle)': ['figure of eight', 'figure-of-eight', 'figure of 8', 'ankle girth'],
}
const GIRTH_FINDING_KW = [
  ['Muscle Atrophy', ['atrophy', 'wasting']],
  ['Muscle Hypertrophy', ['hypertrophy']],
  ['Swelling', ['swelling', 'swollen']],
  ['Post-operative', ['post-op', 'post operative', 'postoperative']],
]

// Labelled "key: value" sections (value stops at the next label or a full stop).
const LABEL_DEFS = [
  { key: 'complaint', kind: 'text', label: 'Complaint', names: ['chief complaint', 'complaint', 'c/o'] },
  { key: 'pastHistory', kind: 'text', label: 'Past history', names: ['past medical history', 'past history', 'pmh'] },
  { key: 'mechanism', kind: 'text', label: 'Mechanism', names: ['mechanism of injury', 'mechanism', 'mode of injury'] },
  { key: 'radiology', kind: 'text', label: 'Radiology', names: ['radiological report', 'radiology', 'x-ray', 'x ray', 'mri', 'ct scan'] },
  { key: 'painAggravating', kind: 'text', label: 'Aggravating', names: ['aggravating factor', 'aggravating', 'aggravated by'] },
  { key: 'painRelieving', kind: 'text', label: 'Relieving', names: ['relieving factor', 'relieving', 'relieved by'] },
  { key: 'deformities', kind: 'text', label: 'Deformities', names: ['deformities', 'deformity'] },
  { key: 'gait', kind: 'text', label: 'Gait', names: ['gait'] },
  { key: 'endFeel', kind: 'text', label: 'End feel', names: ['end feel', 'end-feel'] },
  { key: 'tenderness', kind: 'text', label: 'Tenderness', names: ['tenderness'] },
  { key: 'specialTests', kind: 'list', label: 'Special tests', names: ['special tests', 'special test'] },
  { key: 'opinion', kind: 'text', label: 'Opinion', names: ['opinion', 'impression', 'diagnosis'] },
  { key: 'treatmentOptions', kind: 'text', label: 'Treatment options', names: ['treatment options'] },
  { key: 'expectedRecovery', kind: 'text', label: 'Expected recovery', names: ['expected recovery', 'prognosis'] },
  { key: 'treatmentPlan', kind: 'list', label: 'Treatment plan', names: ['treatment plan', 'plan'] },
  { key: 'objectiveNotes', kind: 'text', label: 'Notes', names: ['objective notes'] },
]

function extractLabels(orig, patch, mark) {
  const nameToDef = {}
  const names = []
  for (const d of LABEL_DEFS) for (const n of d.names) { nameToDef[n] = d; names.push(n) }
  names.sort((a, b) => b.length - a.length)
  const re = new RegExp(`\\b(${names.map(escapeRe).join('|')})\\b\\s*[:\\-]?\\s*`, 'gi')
  const found = []
  let m
  while ((m = re.exec(orig)) !== null) found.push({ name: m[1].toLowerCase(), start: m.index, valStart: m.index + m[0].length })
  for (let i = 0; i < found.length; i++) {
    const cur = found[i]
    const def = nameToDef[cur.name]
    if (!def || def.key in patch) continue
    const nextStart = found[i + 1]?.start ?? orig.length
    const dot = orig.indexOf('.', cur.valStart)
    const boundary = dot >= 0 && dot < nextStart ? dot : nextStart
    const val = orig.slice(cur.valStart, boundary).trim().replace(/[,;]+$/, '')
    if (!val) continue
    patch[def.key] = def.kind === 'list' ? toList(val) : val
    mark(def.label)
  }
}

export function parseAssessment(raw) {
  const patch = {}
  const filled = []
  const orig = String(raw || '')
  const t = ` ${orig.toLowerCase().replace(/\s+/g, ' ')} `
  const mark = (label) => { if (!filled.includes(label)) filled.push(label) }

  // Built
  for (const b of BUILT_OPTIONS) if (t.includes(b.toLowerCase())) { patch.built = b; mark('Built'); break }

  // Pain type (multi)
  const painMap = [
    ['Sharp / Shooting', ['sharp', 'shooting']],
    ['Dull / Aching', ['dull', 'aching', 'ache']],
    ['Burning / Tingling', ['burning', 'tingling', 'tingle']],
    ['Throbbing / Pulsing', ['throbbing', 'pulsing', 'pulsating']],
    ['Deep / Heavy', ['deep', 'heavy']],
  ]
  const painTypes = painMap.filter(([, ws]) => includesAny(t, ws)).map(([o]) => o).filter((o) => PAIN_TYPE_OPTIONS.includes(o))
  if (painTypes.length) { patch.painType = painTypes; mark('Pain type') }

  // ADL impact
  if (includesAny(t, ["doesn't affect", 'does not affect', 'not affecting', 'not affect', 'no effect on adl'])) { patch.painADL = ADL_IMPACT_OPTIONS[0]; mark('ADL impact') }
  else if (includesAny(t, ['affecting adl', 'affects adl', 'affecting his', 'affecting her', 'affecting daily', 'impact on adl', 'affecting activities', 'affecting activity'])) { patch.painADL = ADL_IMPACT_OPTIONS[1]; mark('ADL impact') }

  // Duration + VAS
  const dm = t.match(/(\d+)\s*(day|week|month)/)
  if (dm) { patch.painDuration = `${dm[1]} ${{ day: 'Days', week: 'Weeks', month: 'Months' }[dm[2]]}`; mark('Duration') }
  const vm = t.match(/vas[^\d]{0,6}(\d{1,2})/) || t.match(/(\d{1,2})\s*\/\s*10/)
  if (vm) { patch.vas = String(Math.min(10, Number(vm[1]))); mark('VAS') }

  // Palpation
  const sw = posNeg(t, 'swelling'); if (sw) { patch.swelling = sw; mark('Swelling') }
  const sp = posNeg(t, 'spasm'); if (sp) { patch.spasm = sp; mark('Spasm') }
  if (t.includes('crepitus') || t.includes('crackling') || t.includes('clicking')) {
    patch.crepitus = /(no|absent|negative)[^.]{0,12}crepitus|crepitus[^.]{0,12}(absent|negative)/.test(t) ? '-ve' : '+ve'
    mark('Crepitus')
  }

  // Movement quality
  if (t.includes('compensated')) { patch.movementQuality = 'Compensated'; mark('Movement quality') }
  else if (t.includes('guarded')) { patch.movementQuality = 'Guarded'; mark('Movement quality') }
  else if (includesAny(t, ['poor control', 'poor motor control'])) { patch.movementQuality = 'Poor Control'; mark('Movement quality') }
  else if (includesAny(t, ['movement normal', 'quality normal', 'good control', 'normal movement'])) { patch.movementQuality = 'Normal'; mark('Movement quality') }

  // Functional activities (loose match on the option's leading word)
  const matchFunctional = (opts) => opts.filter((o) => {
    const key = o.toLowerCase().split('(')[0].split('/')[0].trim()
    return key.length > 3 && t.includes(key)
  })
  const fu = matchFunctional(FUNCTIONAL_UPPER); if (fu.length) { patch.functionalUpper = fu; mark('Functional (upper)') }
  const fl = matchFunctional(FUNCTIONAL_LOWER); if (fl.length) { patch.functionalLower = fl; mark('Functional (lower)') }

  // ROM by joint (numbers + pain response, scoped to each joint's mention)
  const positions = JOINTS.map((j) => ({ j, idx: t.indexOf(` ${j.name.toLowerCase()}`) })).filter((x) => x.idx >= 0).sort((a, b) => a.idx - b.idx)
  const joints = []
  const exam = {}
  for (let i = 0; i < positions.length; i++) {
    const { j, idx } = positions[i]
    const seg = t.slice(idx, i + 1 < positions.length ? positions[i + 1].idx : Math.min(t.length, idx + 220))
    const mv = {}
    if (j.type !== 'spine') {
      for (const mMove of j.movements) {
        const kw = mMove.name.toLowerCase().split('(')[0].trim()
        const found = seg.match(new RegExp(`${escapeRe(kw)}[^\\d]{0,15}(\\d{1,3})`))
        if (found) mv[mMove.key] = { arom: found[1] }
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

  // Girth (one or more sites)
  const girth = []
  for (const site of GIRTH_SITES) {
    const kws = GIRTH_KW[site] || [site.toLowerCase()]
    const kw = kws.find((k) => t.includes(k))
    if (!kw) continue
    const idx = t.indexOf(kw)
    const seg = t.slice(idx, idx + 90)
    const right = numNear(seg, 'right') || numNear(seg, ' r ')
    const left = numNear(seg, 'left') || numNear(seg, ' l ')
    if (!right && !left) continue
    const finding = (GIRTH_FINDING_KW.find(([, ws]) => includesAny(seg, ws)) || [''])[0]
    girth.push({ site, right, left, finding, comments: '' })
  }
  if (girth.length) { patch.girth = girth; mark('Girth') }

  // Limb length ("true"/"apparent" may sit just before; numbers come after)
  if (t.includes('limb length')) {
    const idx = t.indexOf('limb length')
    const typeSeg = t.slice(Math.max(0, idx - 25), idx + 40)
    const numSeg = t.slice(idx, idx + 90)
    let type = ''
    if (typeSeg.includes('apparent') && typeSeg.includes('true')) type = 'Both'
    else if (typeSeg.includes('apparent')) type = 'Apparent'
    else if (typeSeg.includes('true')) type = 'True'
    const right = numNear(numSeg, 'right')
    const left = numNear(numSeg, 'left')
    if ((type && LIMB_LENGTH_TYPES.includes(type)) || right || left) { patch.limbLength = { type, right, left }; mark('Limb length') }
  }

  // Follow up (e.g. "review in 5 days", "follow up after 1 week")
  const fum = t.match(/(?:follow.?up|review)\b[^.\d]{0,20}(\d+)\s*(day|week|month)/)
  if (fum) { patch.followUp = `1. Review after ${fum[1]} ${{ day: 'days', week: 'weeks', month: 'months' }[fum[2]]}`; mark('Follow up') }

  // Labelled sections
  extractLabels(orig, patch, mark)

  return { patch, filled }
}
