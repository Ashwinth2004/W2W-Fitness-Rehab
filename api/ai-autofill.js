// Vercel serverless function — AI auto-fill for the Treatment module.
// Sends the dictated/typed consult to Groq (Llama 3.3) and returns a validated
// `patch` object matching the treatment form's field shapes. The API key lives
// ONLY in the GROQ_API_KEY environment variable (never in the app / repo).
import {
  JOINTS, GIRTH_SITES, GIRTH_FINDINGS, LIMB_LENGTH_TYPES, SPINE_ROM_GRADES, PAIN_RESPONSE,
  BUILT_OPTIONS, PAIN_TYPE_OPTIONS, ADL_IMPACT_OPTIONS, MOVEMENT_QUALITY,
  FUNCTIONAL_UPPER, FUNCTIONAL_LOWER, PAIN_DURATION_UNITS,
} from '../src/lib/constants.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'
const TEXT_KEYS = ['complaint', 'pastHistory', 'mechanism', 'radiology', 'painAggravating', 'painRelieving', 'deformities', 'gait', 'endFeel', 'tenderness', 'objectiveNotes', 'opinion', 'treatmentOptions', 'expectedRecovery']
const LIST_KEYS = ['specialTests', 'treatmentPlan', 'followUp']

function buildPrompt() {
  const jointsRef = JOINTS.map((j) => `  ${j.id} (${j.type}): ${j.movements.map((m) => `${m.key}=${m.name}`).join(', ')}`).join('\n')
  return `You are a physiotherapy clinical scribe. From the clinician's consultation note, extract a SINGLE JSON object for the treatment form.
Rules:
- Only include a field if the note clearly provides that information. Omit everything else. Never invent values.
- Use ONLY the allowed values below (exact strings).
- Output JSON only, no commentary.

Text fields (short strings): ${TEXT_KEYS.join(', ')}
List fields (a numbered string like "1. item\\n2. item"): ${LIST_KEYS.join(', ')}
painDuration: "<number> <unit>" where unit is one of ${PAIN_DURATION_UNITS.join('/')}   e.g. "3 Weeks"
vas: a string number "0".."10"
painType: array; allowed: ${JSON.stringify(PAIN_TYPE_OPTIONS)}
painADL: one of ${JSON.stringify(ADL_IMPACT_OPTIONS)}
built: one of ${JSON.stringify(BUILT_OPTIONS)}
swelling/spasm/crepitus: "+ve" or "-ve" (for spasm/crepitus, if a detail is given use "+ve — detail")
movementQuality: one of ${JSON.stringify(MOVEMENT_QUALITY)}
functionalUpper: array, subset of ${JSON.stringify(FUNCTIONAL_UPPER)}
functionalLower: array, subset of ${JSON.stringify(FUNCTIONAL_LOWER)}
limbLength: { "type": one of ${JSON.stringify(LIMB_LENGTH_TYPES)}, "right": "<cm>", "left": "<cm>" }
girth: array of { "site": one of ${JSON.stringify(GIRTH_SITES)}, "right": "<cm>", "left": "<cm>", "finding": one of ${JSON.stringify(GIRTH_FINDINGS)} or "", "comments": "" }
rom: { "joints": [jointId...], "exam": { jointId: { "note": "", "mv": { movementKey: value } } } }
  For 'rom'-type joints, movement value = { "arom": "<deg>", "prom": "<deg>", "pain": one of ${JSON.stringify(PAIN_RESPONSE)} or "" } (include only what is stated).
  For 'spine'-type joints, movement value = { "grade": one of ${JSON.stringify(SPINE_ROM_GRADES)}, "pain": one of ${JSON.stringify(PAIN_RESPONSE)} or "" }.
Joints (id (type): movementKey=name):
${jointsRef}`
}

// ---- server-side validation (keep only clean, in-schema values) -----------
const inSet = (v, set) => (typeof v === 'string' && set.includes(v) ? v : null)
const posneg = (v) => (typeof v === 'string' && (v === '-ve' || v.startsWith('+ve')) ? v : null)
const cm = (v) => { const s = String(v ?? '').replace(/[^\d.]/g, ''); return s || '' }

function sanitize(raw) {
  const p = {}
  if (!raw || typeof raw !== 'object') return p
  for (const k of TEXT_KEYS) if (typeof raw[k] === 'string' && raw[k].trim()) p[k] = raw[k].trim()
  for (const k of LIST_KEYS) if (typeof raw[k] === 'string' && raw[k].trim()) p[k] = raw[k].trim()
  if (raw.vas != null) { const n = parseInt(String(raw.vas).replace(/\D/g, ''), 10); if (Number.isFinite(n)) p.vas = String(Math.min(10, Math.max(0, n))) }
  if (typeof raw.painDuration === 'string') { const m = raw.painDuration.match(/(\d+)\s*(days|weeks|months)/i); if (m) p.painDuration = `${m[1]} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}` }
  if (Array.isArray(raw.painType)) { const a = raw.painType.filter((x) => PAIN_TYPE_OPTIONS.includes(x)); if (a.length) p.painType = a }
  const adl = inSet(raw.painADL, ADL_IMPACT_OPTIONS); if (adl) p.painADL = adl
  const built = inSet(raw.built, BUILT_OPTIONS); if (built) p.built = built
  for (const k of ['swelling', 'spasm', 'crepitus']) { const v = posneg(raw[k]); if (v) p[k] = v }
  const mq = inSet(raw.movementQuality, MOVEMENT_QUALITY); if (mq) p.movementQuality = mq
  if (Array.isArray(raw.functionalUpper)) { const a = raw.functionalUpper.filter((x) => FUNCTIONAL_UPPER.includes(x)); if (a.length) p.functionalUpper = a }
  if (Array.isArray(raw.functionalLower)) { const a = raw.functionalLower.filter((x) => FUNCTIONAL_LOWER.includes(x)); if (a.length) p.functionalLower = a }
  if (raw.limbLength && typeof raw.limbLength === 'object') {
    const type = inSet(raw.limbLength.type, LIMB_LENGTH_TYPES) || ''
    const right = cm(raw.limbLength.right), left = cm(raw.limbLength.left)
    if (type || right || left) p.limbLength = { type, right, left }
  }
  if (Array.isArray(raw.girth)) {
    const rows = raw.girth.filter((g) => g && GIRTH_SITES.includes(g.site)).map((g) => ({
      site: g.site, right: cm(g.right), left: cm(g.left), finding: GIRTH_FINDINGS.includes(g.finding) ? g.finding : '', comments: typeof g.comments === 'string' ? g.comments : '',
    })).filter((g) => g.right || g.left || g.finding)
    if (rows.length) p.girth = rows
  }
  if (raw.rom && typeof raw.rom === 'object' && raw.rom.exam) {
    const exam = {}
    const joints = []
    for (const j of JOINTS) {
      const data = raw.rom.exam[j.id]
      if (!data || typeof data !== 'object' || !data.mv) continue
      const mv = {}
      for (const m of j.movements) {
        const v = data.mv[m.key]
        if (!v || typeof v !== 'object') continue
        const cell = {}
        if (j.type === 'spine') { const g = inSet(v.grade, SPINE_ROM_GRADES); if (g) cell.grade = g } else { if (v.arom) cell.arom = String(v.arom).replace(/[^\d]/g, ''); if (v.prom) cell.prom = String(v.prom).replace(/[^\d]/g, '') }
        const pain = inSet(v.pain, PAIN_RESPONSE); if (pain) cell.pain = pain
        if (Object.keys(cell).length) mv[m.key] = cell
      }
      if (Object.keys(mv).length) { joints.push(j.id); exam[j.id] = { note: typeof data.note === 'string' ? data.note : '', mv } }
    }
    if (joints.length) p.rom = { joints, exam }
  }
  return p
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })
  const key = process.env.GROQ_API_KEY
  if (!key) return res.status(200).json({ error: 'not-configured' })

  const text = String((req.body && req.body.text) || '').slice(0, 8000).trim()
  if (!text) return res.status(200).json({ error: 'empty' })

  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildPrompt() },
          { role: 'user', content: text },
        ],
      }),
    })
    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      return res.status(200).json({ error: 'ai-failed', detail: detail.slice(0, 300) })
    }
    const data = await r.json()
    let raw = {}
    try { raw = JSON.parse(data?.choices?.[0]?.message?.content || '{}') } catch (_) { raw = {} }
    const patch = sanitize(raw)
    return res.status(200).json({ patch, keys: Object.keys(patch) })
  } catch (err) {
    return res.status(200).json({ error: 'exception', detail: String(err?.message || err).slice(0, 300) })
  }
}
