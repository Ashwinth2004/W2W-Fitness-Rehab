// Shared field schema for the W2W assessment form, split into:
//   BASIC_SECTIONS    — captured by the front desk on "New Client"
//   CLINICAL_SECTIONS — captured by the physiotherapist in the Treatment module
// Sections marked `ghost:true` show a returning patient's previous value faintly.
import { SERVICE_OPTIONS } from './constants'

export const BASIC_SECTIONS = [
  { title: 'Registration', fields: [
    { k: 'name', label: 'Name *' },
    { k: 'phone', label: 'Contact number *', type: 'phone' },
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
    { k: 'walking', label: 'Walking / steps per day' },
    { k: 'exercise', label: 'Exercise routines (if any)' },
    { k: 'deskWork', label: 'Desktop work or others' },
    { k: 'sleep', label: 'Sleeping hours per day & cycle' },
    { k: 'hydration', label: 'Hydration (water intake / day)', full: true },
  ] },
  { title: 'History', ghost: true, cols1: true, fields: [
    { k: 'pastHistory', label: 'Past Medical History (major illness, injury or surgery)', area: true },
    { k: 'presentHistory', label: 'Present Medical History (Diabetes, BP, Thyroid)', area: true },
    { k: 'complaint', label: 'Current chief complaints', area: true },
    { k: 'mechanism', label: 'Mechanism of injury', area: true },
  ] },
]

export const CLINICAL_SECTIONS = [
  { title: 'Pain Assessment', ghost: true, fields: [
    { k: 'painArea', label: 'Area (side & site) of pain' },
    { k: 'painDuration', label: 'Duration' },
    { k: 'painType', label: 'Nature / type of pain' },
    { k: 'painADL', label: 'Impact of pain on ADL' },
    { k: 'painAggravating', label: 'Pain aggravating factor' },
    { k: 'painRelieving', label: 'Pain relieving factor' },
    { k: 'vas', label: 'VAS — pain score (0–10)', num: true, maxLen: 2 },
  ] },
  { title: 'Objective Assessment', ghost: true, fields: [
    { k: 'built', label: 'Built' },
    { k: 'deformities', label: 'Deformities / Edema / Wasting' },
    { k: 'gait', label: 'Gait' },
    { k: 'objectiveNotes', label: 'Notes', area: true, full: true },
  ] },
  { title: 'On Palpation', ghost: true, fields: [
    { k: 'tenderness', label: 'Tenderness' },
    { k: 'swelling', label: 'Swelling / Spasm' },
    { k: 'crepitus', label: 'Crepitus / Abnormal sounds' },
  ] },
  { title: 'On Examination', ghost: true, fields: [
    { k: 'rom', label: 'ROM', area: true, full: true },
    { k: 'endFeel', label: 'End Feel' },
    { k: 'grip', label: 'Grip' },
    { k: 'muscleTone', label: 'Muscle Tone' },
    { k: 'girth', label: 'Girth measurements' },
    { k: 'limbLength', label: 'Limb length discrepancies' },
    { k: 'reflexes', label: 'Reflexes' },
    { k: 'specialTests', label: 'Special tests & functional testing', area: true, full: true },
  ] },
  { title: 'Assessment & Plan', ghost: true, cols1: true, fields: [
    { k: 'opinion', label: 'Opinion about the patient & condition', area: true },
    { k: 'treatmentOptions', label: 'Treatment options (with evidence)', area: true },
    { k: 'expectedRecovery', label: 'Expected duration of recovery & outcomes', area: true },
    { k: 'treatmentPlan', label: 'Treatment plan', area: true },
    { k: 'followUp', label: 'Follow up', area: true },
  ] },
]

export const BASIC_KEYS = BASIC_SECTIONS.flatMap((s) => s.fields.map((f) => f.k))
export const CLINICAL_KEYS = CLINICAL_SECTIONS.flatMap((s) => s.fields.map((f) => f.k))
