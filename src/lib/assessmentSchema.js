// Shared field schema for the W2W assessment form, split into:
//   BASIC_SECTIONS    — captured by the front desk on "New Client"
//   CLINICAL_SECTIONS — captured by the physiotherapist in the Treatment module
// Sections marked `ghost:true` show a returning patient's previous value faintly.
//
// Field `type`s handled by AssessmentField.jsx:
//   (text) | area | select | phone | email | num
//   chips     — single-select pills (use `other:true` for an "Other (mention)" box)
//   multi     — multi-select pills  (use `other:true` for an "Other (mention)" box)
//   posneg    — +ve / -ve           (use `note:true` for an "if present" box)
//   duration  — number + Days/Weeks/Months
//   rom       — joint-wise ROM grid (AROM/PROM/Pain; spine = grade + Pain)
//   girth     — girth measurement rows (site, R/L, auto-diff, finding, comments)
//   limb      — limb-length (type, R/L, auto-calculated discrepancy)
import {
  SERVICE_OPTIONS, WALKING_ROUTINE_OPTIONS, EXERCISE_ROUTINE_OPTIONS, MEDICAL_HISTORY_OPTIONS,
  HYDRATION_OPTIONS, SLEEP_OPTIONS, DESKWORK_OPTIONS,
  PAIN_TYPE_OPTIONS, ADL_IMPACT_OPTIONS, BUILT_OPTIONS, FUNCTIONAL_UPPER, FUNCTIONAL_LOWER, MOVEMENT_QUALITY,
  JOINTS,
} from './constants'

export const BASIC_SECTIONS = [
  { title: 'Registration', fields: [
    { k: 'name', label: 'Name *' },
    { k: 'phone', label: 'Contact number *', type: 'phone' },
    { k: 'programs', label: 'Registered for', type: 'programs', full: true },
    { k: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
    { k: 'age', label: 'Age', num: true, maxLen: 2 },
    { k: 'occupation', label: 'Occupation / Sports' },
    { k: 'height', label: 'Height (cm)', num: true, maxLen: 3 },
    { k: 'weight', label: 'Weight (kg)', num: true, maxLen: 3 },
    { k: 'email', label: 'Email', type: 'email' },
    { k: 'referredBy', label: 'Referred by' },
    { k: 'handDominance', label: 'Hand dominance', type: 'select', options: ['Right', 'Left', 'Ambidextrous'] },
    { k: 'service', label: 'Primary service', type: 'select', options: SERVICE_OPTIONS },
    { k: 'address', label: 'Address', full: true },
  ] },
  { title: 'Activity levels', ghost: true, fields: [
    { k: 'walking', label: 'Walking routine (steps per day)', type: 'chips', options: WALKING_ROUTINE_OPTIONS, full: true },
    { k: 'exercise', label: 'Exercise routine', type: 'multi', options: EXERCISE_ROUTINE_OPTIONS, other: true, full: true },
    { k: 'deskWork', label: 'Desktop work or others (hours / day)', type: 'chips', options: DESKWORK_OPTIONS, full: true },
    { k: 'sleep', label: 'Sleeping hours per day', type: 'chips', options: SLEEP_OPTIONS, full: true },
    { k: 'hydration', label: 'Hydration (water intake / day)', type: 'chips', options: HYDRATION_OPTIONS, full: true },
    { k: 'activityNotes', label: 'Notes (optional)', area: true, full: true },
  ] },
  { title: 'History', ghost: true, cols1: true, fields: [
    { k: 'presentHistory', label: 'Present Medical History', type: 'multi', options: MEDICAL_HISTORY_OPTIONS, other: true, full: true },
    { k: 'otherNotes', label: 'Any other notes (optional)', area: true },
  ] },
]

export const CLINICAL_SECTIONS = [
  { title: 'History', ghost: true, cols1: true, fields: [
    { k: 'pastHistory', label: 'Past Medical History (major illness, injury or surgery)', area: true },
    { k: 'complaint', label: 'Current chief complaints', area: true },
    { k: 'mechanism', label: 'Mechanism of injury', area: true },
    { k: 'radiology', label: 'Radiological report (if any)', area: true },
  ] },
  { title: 'Pain Assessment', ghost: true, fields: [
    { k: 'painDuration', label: 'Duration', type: 'duration' },
    { k: 'painType', label: 'Nature / type of pain', type: 'multi', options: PAIN_TYPE_OPTIONS, other: true, full: true },
    { k: 'painADL', label: 'Impact of pain on ADL', type: 'chips', options: ADL_IMPACT_OPTIONS, full: true },
    { k: 'painAggravating', label: 'Pain aggravating factor' },
    { k: 'painRelieving', label: 'Pain relieving factor' },
    { k: 'vas', label: 'VAS — pain score (0–10)', num: true, maxLen: 2 },
  ] },
  { title: 'Objective Assessment', ghost: true, fields: [
    { k: 'built', label: 'Built', type: 'chips', options: BUILT_OPTIONS, full: true },
    { k: 'deformities', label: 'Deformities / Edema / Wasting' },
    { k: 'gait', label: 'Gait' },
    { k: 'objectiveNotes', label: 'Notes', area: true, full: true },
  ] },
  { title: 'On Palpation', ghost: true, fields: [
    { k: 'tenderness', label: 'Tenderness' },
    { k: 'swelling', label: 'Swelling', type: 'posneg' },
    { k: 'spasm', label: 'Spasm', type: 'posneg', note: true },
    { k: 'crepitus', label: 'Crepitus / Abnormal sounds', type: 'posneg', note: true, full: true },
  ] },
  { title: 'On Examination', ghost: true, fields: [
    { k: 'rom', label: 'ROM — by joint', type: 'rom', full: true },
    { k: 'endFeel', label: 'End Feel' },
    { k: 'girth', label: 'Girth measurements', type: 'girth', full: true },
    { k: 'limbLength', label: 'Limb length', type: 'limb', full: true },
    { k: 'specialTests', label: 'Special tests & functional testing', type: 'list', full: true },
  ] },
  { title: 'Functional Activities', ghost: true, fields: [
    { k: 'functionalUpper', label: 'Upper body', type: 'multi', options: FUNCTIONAL_UPPER, addable: true, full: true },
    { k: 'functionalLower', label: 'Lower body', type: 'multi', options: FUNCTIONAL_LOWER, addable: true, full: true },
    { k: 'movementQuality', label: 'Movement quality', type: 'chips', options: MOVEMENT_QUALITY, full: true },
  ] },
  { title: 'Assessment & Plan', ghost: true, cols1: true, fields: [
    { k: 'opinion', label: 'Opinion about the patient & condition', area: true },
    { k: 'treatmentOptions', label: 'Treatment options (with evidence)', area: true },
    { k: 'expectedRecovery', label: 'Expected duration of recovery & outcomes', area: true },
    { k: 'treatmentPlan', label: 'Treatment plan', type: 'list', full: true },
    { k: 'followUp', label: 'Follow up', type: 'list', full: true },
  ] },
]

export const BASIC_KEYS = BASIC_SECTIONS.flatMap((s) => s.fields.map((f) => f.k))
export const CLINICAL_KEYS = CLINICAL_SECTIONS.flatMap((s) => s.fields.map((f) => f.k))

// Format any assessment value (string / array / structured object) into a
// human-readable string (possibly multi-line) for read-only views, the PDF
// report and summaries — so nothing ever renders as "[object Object]".
const _n = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : null }

function formatGirthRow(g) {
  if (!g || (!g.site && !g.right && !g.left && !g.finding && !g.comments)) return ''
  const r = _n(g.right), l = _n(g.left)
  const diff = r != null && l != null ? ` (diff ${Math.abs(r - l).toFixed(1)} cm)` : ''
  const extra = [g.finding, g.comments].filter(Boolean).join(' · ')
  return `${g.site || 'Site'}: R ${g.right || '—'} / L ${g.left || '—'} cm${diff}${extra ? ` — ${extra}` : ''}`
}

function formatLimb(ll) {
  const r = _n(ll.right), l = _n(ll.left)
  const parts = [ll.type, (ll.right || ll.left) ? `R ${ll.right || '—'} / L ${ll.left || '—'} cm` : '']
  if (r != null && l != null) parts.push(r === l ? 'Equal' : `${r > l ? 'Right' : 'Left'} longer by ${Math.abs(r - l).toFixed(1)} cm`)
  return parts.filter(Boolean).join(' · ')
}

function formatRom(v) {
  const lines = []
  for (const jid of v.joints || []) {
    const j = JOINTS.find((x) => x.id === jid)
    const data = v.exam?.[jid]
    if (!j || !data) continue
    const parts = []
    for (const m of j.movements) {
      const mv = data.mv?.[m.key] || {}
      const seg = j.type === 'spine'
        ? [mv.grade, mv.pain && `Pain: ${mv.pain}`].filter(Boolean)
        : [mv.arom && `A:${mv.arom}`, mv.prom && `P:${mv.prom}`, mv.pain && `Pain:${mv.pain}`].filter(Boolean)
      if (seg.length) parts.push(`${m.name} (${seg.join(', ')})`)
    }
    if (parts.length || data.note) {
      let line = `${j.name}: ${parts.join('; ') || '—'}`
      if (data.note) line += `  | Note: ${data.note}`
      lines.push(line)
    }
  }
  return lines.join('\n')
}

export function formatAssessmentValue(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.length && typeof value[0] === 'object') return value.map(formatGirthRow).filter(Boolean).join('\n')
    return value.filter(Boolean).join(', ')
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.joints)) return formatRom(value)
    if ('type' in value || 'right' in value || 'left' in value) return formatLimb(value)
    return ''
  }
  return String(value)
}
