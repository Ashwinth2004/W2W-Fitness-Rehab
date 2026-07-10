// ============================================================================
//  Smart Fill — a FREE, keyword-based parser that turns a dictated/pasted
//  consultation note into best-guess values for the treatment form. No AI, no
//  cost. Covers every field & option in the treatment module, with synonyms.
//  Everything it fills is a SUGGESTION for the clinician to review.
// ============================================================================
import {
  PAIN_TYPE_OPTIONS, ADL_IMPACT_OPTIONS, FUNCTIONAL_UPPER, FUNCTIONAL_LOWER,
  JOINTS, GIRTH_SITES, LIMB_LENGTH_TYPES, SPINE_ROM_GRADES,
} from './constants'

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const includesAny = (t, words) => words.some((w) => t.includes(w))
function posNegAny(t, terms) {
  for (const term of terms) {
    if (!t.includes(term)) continue
    const neg = new RegExp(`(no|nil|without|absent)\\s+${term}|${term}\\s+(is\\s+)?(absent|negative|nil|-ve|not present)`).test(t)
    return neg ? '-ve' : '+ve'
  }
  return null
}
function toList(value) {
  const items = String(value).split(/[;,\n]|\band\b/).map((s) => s.trim()).filter(Boolean)
  return items.map((s, i) => `${i + 1}. ${s}`).join('\n')
}
const numNear = (seg, word) => { const m = seg.match(new RegExp(`${word}[^\\d]{0,6}(\\d{1,3}(?:\\.\\d)?)`)); return m ? m[1] : '' }

// ---- Option synonym tables ------------------------------------------------
const BUILT_KW = [
  ['Ectomorph', ['ectomorph', 'ecto ', 'lean build', 'thin build', 'slender build', 'slim build']],
  ['Mesomorph', ['mesomorph', 'meso ', 'athletic build', 'muscular build', 'well built', 'well-built']],
  ['Endomorph', ['endomorph', 'endo ', 'heavy build', 'stocky build', 'obese build', 'heavy set']],
]
const PAIN_TYPE_KW = [
  ['Sharp / Shooting', ['sharp', 'shooting', 'stabbing', 'lancinating', 'pricking']],
  ['Dull / Aching', ['dull', 'aching', 'ache', 'sore', 'soreness']],
  ['Burning / Tingling', ['burning', 'tingling', 'pins and needles', 'paresthesia', 'paraesthesia', 'numbness', 'numb']],
  ['Throbbing / Pulsing', ['throbbing', 'pulsing', 'pulsating', 'pounding']],
  ['Deep / Heavy', ['deep', 'heavy', 'dragging', 'pressure like', 'pressure-like']],
]
const MOVEMENT_SYN = {
  flexion: ['flexion', 'flex'],
  extension: ['extension', 'ext'],
  'lateral flexion': ['lateral flexion', 'side flexion', 'side bend', 'side-bend', 'lateral bend'],
  rotation: ['rotation', 'rot'],
  abduction: ['abduction', 'abduct', 'abd'],
  adduction: ['adduction', 'adduct'],
  'internal rotation': ['internal rotation', 'medial rotation', 'internal rot', 'ir'],
  'external rotation': ['external rotation', 'lateral rotation', 'external rot', 'er'],
  pronation: ['pronation', 'pronate'],
  supination: ['supination', 'supinate'],
  'radial deviation': ['radial deviation', 'radial dev', 'rd'],
  'ulnar deviation': ['ulnar deviation', 'ulnar dev', 'ud'],
  'mcp flexion': ['mcp flexion', 'mcp flex', 'mcp'],
  'ip flexion': ['ip flexion', 'ip flex'],
  'pip flexion': ['pip flexion', 'pip flex', 'pip'],
  'dip flexion': ['dip flexion', 'dip flex', 'dip'],
  dorsiflexion: ['dorsiflexion', 'dorsi flexion', 'dorsi flex', 'df'],
  plantarflexion: ['plantarflexion', 'plantar flexion', 'plantar flex', 'pf'],
  inversion: ['inversion', 'invert', 'inv'],
  eversion: ['eversion', 'evert'],
}
function movementSyns(name) {
  const base = MOVEMENT_SYN[name.toLowerCase().replace(/\s*\(.*\)\s*/, '').trim()] || [name.toLowerCase()]
  const side = name.match(/\((right|left)\)/i)
  if (side) { const s = side[1].toLowerCase(); return base.flatMap((b) => [`${b} ${s}`, `${s} ${b}`]) }
  return base
}
const GIRTH_KW = {
  'Mid Arm': ['mid arm', 'mid-arm', 'midarm', 'arm girth', 'biceps girth', 'upper arm'],
  'Maximum Forearm Girth': ['forearm girth', 'forearm'],
  '10 cm Above Patella': ['above patella', '10 cm above', 'ten cm above', 'thigh girth', 'quadriceps girth', 'quad girth'],
  'Knee Joint Line (Mid-Patella)': ['knee joint', 'mid-patella', 'mid patella', 'knee girth', 'joint line'],
  'Maximum Calf Girth': ['calf girth', 'calf'],
  'Figure-of-Eight (Ankle)': ['figure of eight', 'figure-of-eight', 'figure of 8', 'figure eight', 'ankle girth'],
}
const GIRTH_FINDING_KW = [
  ['Muscle Atrophy', ['atrophy', 'wasting', 'wasted']],
  ['Muscle Hypertrophy', ['hypertrophy', 'hypertrophied']],
  ['Swelling', ['swelling', 'swollen', 'edema', 'oedema']],
  ['Post-operative', ['post-op', 'post operative', 'postoperative', 'post-surgical']],
]
// Spoken names for each joint (so "lumbar", "neck" etc. are recognised).
const JOINT_KW = {
  cervical: ['cervical', 'neck'],
  shoulder: ['shoulder'],
  elbow: ['elbow'],
  forearm: ['forearm'],
  wrist: ['wrist'],
  thumb: ['thumb'],
  fingers: ['fingers', 'finger'],
  hip: ['hip'],
  knee: ['knee'],
  ankle: ['ankle'],
  thoracic: ['thoracic spine', 'thoracic', 'dorsal spine', 'mid back'],
  lumbar: ['lumbar spine', 'lumbar', 'low back', 'lower back'],
}
// Words that start a new finding — used to stop short "Label: value" captures
// (e.g. Aggravating/Relieving) from swallowing the rest of a run-on sentence.
const HARD_STOPS = [
  'shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'cervical', 'neck', 'lumbar', 'thoracic', 'forearm', 'thumb', 'fingers',
  'flexion', 'extension', 'abduction', 'adduction', 'rotation', 'deviation', 'pronation', 'supination', 'dorsiflexion', 'plantarflexion', 'inversion', 'eversion',
  'swelling', 'swollen', 'edema', 'oedema', 'effusion', 'spasm', 'tightness', 'crepitus', 'crackling', 'clicking', 'grinding', 'tenderness', 'girth', 'limb length',
  'built', 'vas', 'pain score', 'compensated', 'guarded', 'impression', 'diagnosis', 'prognosis', 'follow up', 'review', 'plan',
]
const HARD_STOPS_RE = new RegExp(`\\b(${HARD_STOPS.map(escapeRe).join('|')})\\b`, 'i')

// Labelled "key: value" sections (value stops at the next label or a full stop).
const LABEL_DEFS = [
  { key: 'complaint', kind: 'text', label: 'Complaint', names: ['chief complaint', 'complaint', 'presenting complaint', 'c/o'] },
  { key: 'pastHistory', kind: 'text', label: 'Past history', names: ['past medical history', 'past history', 'previous history', 'pmh', 'h/o'] },
  { key: 'mechanism', kind: 'text', label: 'Mechanism', names: ['mechanism of injury', 'mechanism', 'mode of injury', 'moi'] },
  { key: 'radiology', kind: 'text', label: 'Radiology', names: ['radiological report', 'radiology', 'radiological findings', 'x-ray', 'x ray', 'xray', 'mri', 'ct scan', 'usg', 'ultrasound'] },
  { key: 'painAggravating', kind: 'text', label: 'Aggravating', stopEarly: true, names: ['aggravating factor', 'aggravating factors', 'aggravating', 'aggravated by', 'worse with', 'worse on'] },
  { key: 'painRelieving', kind: 'text', label: 'Relieving', stopEarly: true, names: ['relieving factor', 'relieving factors', 'relieving', 'relieved by', 'better with', 'eased by'] },
  { key: 'deformities', kind: 'text', label: 'Deformities', stopEarly: true, names: ['deformities', 'deformity', 'edema', 'wasting'] },
  { key: 'gait', kind: 'text', label: 'Gait', stopEarly: true, names: ['gait pattern', 'gait'] },
  { key: 'endFeel', kind: 'text', label: 'End feel', stopEarly: true, names: ['end feel', 'end-feel'] },
  { key: 'tenderness', kind: 'text', label: 'Tenderness', stopEarly: true, names: ['tenderness', 'tender over', 'tender at'] },
  { key: 'specialTests', kind: 'list', label: 'Special tests', names: ['special tests', 'special test', 'provocative tests'] },
  { key: 'opinion', kind: 'text', label: 'Opinion', names: ['opinion', 'impression', 'diagnosis', 'provisional diagnosis'] },
  { key: 'treatmentOptions', kind: 'text', label: 'Treatment options', names: ['treatment options', 'management options'] },
  { key: 'expectedRecovery', kind: 'text', label: 'Expected recovery', names: ['expected recovery', 'prognosis', 'expected outcome'] },
  { key: 'treatmentPlan', kind: 'list', label: 'Treatment plan', names: ['treatment plan', 'management plan', 'plan of care', 'plan'] },
  { key: 'objectiveNotes', kind: 'text', label: 'Notes', names: ['objective notes', 'observation'] },
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
    let boundary = dot >= 0 && dot < nextStart ? dot : nextStart
    // Short fields (Aggravating/Relieving/…) stop at the next clinical keyword.
    if (def.stopEarly) {
      const rel = orig.slice(cur.valStart + 2).search(HARD_STOPS_RE)
      if (rel >= 0) boundary = Math.min(boundary, cur.valStart + 2 + rel)
    }
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
  for (const [opt, kws] of BUILT_KW) if (includesAny(t, kws)) { patch.built = opt; mark('Built'); break }

  // Pain type (multi)
  const painTypes = PAIN_TYPE_KW.filter(([, ws]) => includesAny(t, ws)).map(([o]) => o).filter((o) => PAIN_TYPE_OPTIONS.includes(o))
  if (painTypes.length) { patch.painType = painTypes; mark('Pain type') }

  // ADL impact
  if (includesAny(t, ["doesn't affect", 'does not affect', 'not affecting', 'not affect', 'no effect on adl', 'no impact on adl', 'adl not affected', 'independent in adl'])) { patch.painADL = ADL_IMPACT_OPTIONS[0]; mark('ADL impact') }
  else if (includesAny(t, ['affecting adl', 'affects adl', 'affecting his', 'affecting her', 'affecting daily', 'impact on adl', 'affecting activities', 'affecting activity', 'difficulty in adl', 'difficulty with adl', 'adl affected', 'affecting function'])) { patch.painADL = ADL_IMPACT_OPTIONS[1]; mark('ADL impact') }

  // Duration + VAS
  const dm = t.match(/(\d+)\s*(day|week|month)/)
  if (dm) { patch.painDuration = `${dm[1]} ${{ day: 'Days', week: 'Weeks', month: 'Months' }[dm[2]]}`; mark('Duration') }
  const vm = t.match(/(?:vas|nprs|pain score|pain scale)[^\d]{0,8}(\d{1,2})/) || t.match(/(\d{1,2})\s*(?:\/|out of)\s*10/)
  if (vm) { patch.vas = String(Math.min(10, Number(vm[1]))); mark('VAS') }

  // Palpation
  const sw = posNegAny(t, ['swelling', 'swollen', 'edema', 'oedema', 'effusion']); if (sw) { patch.swelling = sw; mark('Swelling') }
  const sp = posNegAny(t, ['spasm', 'muscle spasm', 'muscle tightness']); if (sp) { patch.spasm = sp; mark('Spasm') }
  if (includesAny(t, ['crepitus', 'crackling', 'clicking', 'grinding', 'crepitation'])) {
    patch.crepitus = /(no|absent|negative)[^.]{0,14}(crepitus|crackling|clicking|grinding)|(crepitus|crackling|clicking|grinding)[^.]{0,14}(absent|negative)/.test(t) ? '-ve' : '+ve'
    mark('Crepitus')
  }

  // Movement quality
  if (includesAny(t, ['compensated', 'compensation', 'trick movement', 'substitution'])) { patch.movementQuality = 'Compensated'; mark('Movement quality') }
  else if (includesAny(t, ['guarded', 'guarding', 'apprehensive'])) { patch.movementQuality = 'Guarded'; mark('Movement quality') }
  else if (includesAny(t, ['poor control', 'poor motor control', 'incoordination', 'dyscoordination'])) { patch.movementQuality = 'Poor Control'; mark('Movement quality') }
  else if (includesAny(t, ['movement normal', 'quality normal', 'good control', 'well controlled', 'normal movement'])) { patch.movementQuality = 'Normal'; mark('Movement quality') }

  // Functional activities (loose match on the option's leading word)
  const matchFunctional = (opts) => opts.filter((o) => { const key = o.toLowerCase().split('(')[0].split('/')[0].trim(); return key.length > 3 && t.includes(key) })
  const fUp = matchFunctional(FUNCTIONAL_UPPER); if (fUp.length) { patch.functionalUpper = fUp; mark('Functional (upper)') }
  const fLo = matchFunctional(FUNCTIONAL_LOWER); if (fLo.length) { patch.functionalLower = fLo; mark('Functional (lower)') }

  // ROM by joint (scoped to each joint's mention; joints have spoken synonyms)
  const positions = JOINTS.map((j) => {
    const kws = JOINT_KW[j.id] || [j.name.toLowerCase()]
    let idx = -1
    for (const k of kws) { const p = t.indexOf(` ${k}`); if (p >= 0 && (idx < 0 || p < idx)) idx = p }
    return { j, idx }
  }).filter((x) => x.idx >= 0).sort((a, b) => a.idx - b.idx)
  const joints = []
  const exam = {}
  for (let i = 0; i < positions.length; i++) {
    const { j, idx } = positions[i]
    const seg = t.slice(idx, i + 1 < positions.length ? positions[i + 1].idx : Math.min(t.length, idx + 240))
    const mv = {}
    for (const mMove of j.movements) {
      const syns = movementSyns(mMove.name).map(escapeRe).join('|')
      if (j.type === 'spine') {
        const gm = seg.match(new RegExp(`\\b(${syns})\\b[^.]{0,22}?(full|mild|moderate|severe|unable)`))
        if (gm) { const grade = SPINE_ROM_GRADES.find((g) => g.toLowerCase().startsWith(gm[2])); if (grade) mv[mMove.key] = { grade } }
      } else {
        const nm = seg.match(new RegExp(`\\b(${syns})\\b[^\\d]{0,15}(\\d{1,3})`))
        if (nm) mv[mMove.key] = { arom: nm[2] }
      }
    }
    let pain = ''
    if (/throughout|entire range|whole range|full range/.test(seg)) pain = 'Throughout ROM'
    else if (/end.?range|end of range|terminal/.test(seg)) pain = 'End-range Pain'
    else if (/unable to assess|cannot assess|not assessed/.test(seg)) pain = 'Unable to Assess'
    else if (/no pain|painless|pain[\s-]?free/.test(seg)) pain = 'No'
    if (pain) Object.keys(mv).forEach((k) => { mv[k].pain = pain })
    if (Object.keys(mv).length) { joints.push(j.id); exam[j.id] = { note: '', mv } }
  }
  if (joints.length) { patch.rom = { joints, exam }; mark('ROM') }

  // Girth (one or more sites)
  const girth = []
  for (const site of GIRTH_SITES) {
    const kw = (GIRTH_KW[site] || [site.toLowerCase()]).find((k) => t.includes(k))
    if (!kw) continue
    const seg = t.slice(t.indexOf(kw), t.indexOf(kw) + 90)
    const right = numNear(seg, 'right') || numNear(seg, ' r ')
    const left = numNear(seg, 'left') || numNear(seg, ' l ')
    if (!right && !left) continue
    const finding = (GIRTH_FINDING_KW.find(([, ws]) => includesAny(seg, ws)) || [''])[0]
    girth.push({ site, right, left, finding, comments: '' })
  }
  if (girth.length) { patch.girth = girth; mark('Girth') }

  // Limb length
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

  // Follow up
  const fum = t.match(/(?:follow.?up|review|revisit|next visit|come back|next review)\b[^.\d]{0,20}(\d+)\s*(day|week|month)/)
  if (fum) { const n = fum[1]; patch.followUp = `1. Review after ${n} ${fum[2]}${n === '1' ? '' : 's'}`; mark('Follow up') }

  // Labelled sections
  extractLabels(orig, patch, mark)

  return { patch, filled }
}
