// ============================================================================
//  Branded PDF reports (jsPDF + autotable) — W2W letterhead on every page.
//    - generateClientReport(client, { notes, progress, therapist, bill, action })
//    - generateMonthlyReport({ rangeLabel, appointments, clients, action })
//    - generateExpensesReport({ rangeLabel, expenses, action })
//    - generateIncomeReport({ rangeLabel, entries, action })
//  `action` is 'download' (save) or 'share' (Web Share → WhatsApp/Email).
// ============================================================================
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BUSINESS, qualificationFor, signatureFor } from './constants'
import { REGIONS as PAIN_REGIONS, VIEW_W as PAIN_W, VIEW_H as PAIN_H, DEFAULT_R as PAIN_R } from './bodyRegions'
import { formatAssessmentValue } from './assessmentSchema'
import { fmtDate, fmt12h } from './format'

const BRAND = [14, 139, 161] // #0e8ba1
const DARK = [17, 76, 91]
const M = 14
const PW = 210
const PH = 297
const CW = PW - M * 2

// jsPDF's built-in fonts can't render the ₹ glyph, so use "Rs.".
const inr = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN')

let _logoCache = null
async function loadLogo() {
  if (_logoCache) return _logoCache
  try {
    const res = await fetch('/w2w-fitness-rehab-logo.jpg')
    const blob = await res.blob()
    _logoCache = await new Promise((resolve) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  } catch {
    _logoCache = null
  }
  return _logoCache
}

// Load any image (asset URL or data URL) → { dataUrl, ratio (w/h), fmt }. Cached.
const _imgCache = {}
async function loadImageData(src) {
  if (!src) return null
  if (src in _imgCache) return _imgCache[src]
  try {
    let dataUrl = src
    if (!src.startsWith('data:')) {
      const res = await fetch(src)
      const blob = await res.blob()
      dataUrl = await new Promise((resolve) => { const r = new FileReader(); r.onloadend = () => resolve(r.result); r.readAsDataURL(blob) })
    }
    const ratio = await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 3)
      img.onerror = () => resolve(3)
      img.src = dataUrl
    })
    _imgCache[src] = { dataUrl, ratio, fmt: dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG' }
  } catch {
    _imgCache[src] = null
  }
  return _imgCache[src]
}

// Draw a signature image sitting just above a signature line at (x, lineY),
// scaled to ~maxH tall and the line's width.
function drawSignature(doc, sig, x, lineY, maxW, maxH) {
  if (!sig) return
  let w = maxH * sig.ratio
  let h = maxH
  if (w > maxW) { w = maxW; h = maxW / sig.ratio }
  try { doc.addImage(sig.dataUrl, sig.fmt, x, lineY - h - 1, w, h) } catch { /* ignore bad image */ }
}

// Load an <img> element (cached) — used to draw the pain chart onto a canvas.
const _htmlImgCache = {}
function loadHtmlImage(src) {
  if (src in _htmlImgCache) return _htmlImgCache[src]
  _htmlImgCache[src] = new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
  return _htmlImgCache[src]
}

// Draw the body chart with the patient's marked regions tinted orange → JPEG data URL.
async function renderPainChart(painAreas) {
  const img = await loadHtmlImage('/body-pain-chart.jpg')
  if (!img) return null
  const canvas = document.createElement('canvas')
  canvas.width = PAIN_W; canvas.height = PAIN_H
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, PAIN_W, PAIN_H)
  ctx.fillStyle = 'rgba(255,169,77,0.55)'
  ctx.strokeStyle = '#e8590c'
  ctx.lineWidth = 4
  const sel = new Set(painAreas)
  for (const reg of PAIN_REGIONS) {
    if (!sel.has(reg.id)) continue
    ctx.beginPath(); ctx.arc(reg.cx, reg.cy, reg.r || PAIN_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
  try { return canvas.toDataURL('image/jpeg', 0.82) } catch { return null }
}

function header(doc, logo, title, subtitle) {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, 4, 'F')
  if (logo) {
    try { doc.addImage(logo, 'JPEG', 14, 10, 22, 22) } catch {}
  }
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(BUSINESS.name, 40, 19)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`${BUSINESS.tagline} · ${BUSINESS.phoneDisplay}`, 40, 25)
  doc.text(BUSINESS.email + '  ·  ' + BUSINESS.website.replace('https://', ''), 40, 30)

  doc.setDrawColor(...BRAND)
  doc.setLineWidth(0.4)
  doc.line(14, 36, W - 14, 36)

  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(title, 14, 46)
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(110)
    doc.text(subtitle, 14, 52)
  }
  return subtitle ? 58 : 52
}

function footerAll(doc) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(220)
    doc.setLineWidth(0.3)
    doc.line(14, H - 18, W - 14, H - 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(BUSINESS.address, 14, H - 12)
    doc.text(`${BUSINESS.phoneDisplay}  ·  ${BUSINESS.email}  ·  ${BUSINESS.website.replace('https://', '')}`, 14, H - 8)
    doc.text(`Page ${i} of ${pages}`, W - 14, H - 8, { align: 'right' })
    doc.setTextColor(...BRAND)
    doc.text('W2W — Way To Wellness', W - 14, H - 12, { align: 'right' })
  }
}

// Save (download) or share the finished doc. Returns a promise.
async function finalize(doc, filename, action = 'download', shareText) {
  if (action === 'share') {
    try {
      const blob = doc.output('blob')
      const file = new File([blob], filename, { type: 'application/pdf' })
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename, text: shareText || filename })
        return 'shared'
      }
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled' // user dismissed the share sheet
      // otherwise fall through to a normal download
    }
  }
  doc.save(filename)
  return 'downloaded'
}

// --- assessment layout helpers ---------------------------------------------
function ensure(doc, y, needed = 8) {
  if (y + needed > PH - 22) { doc.addPage(); return 20 }
  return y
}

// Draw text shrunk just enough to fit maxW, so long values (e.g. emails) never
// overflow the page. Restores the base size afterwards.
function fitText(doc, text, x, y, maxW, baseSize, minSize = 6) {
  let size = baseSize
  doc.setFontSize(size)
  while (size > minSize && doc.getTextWidth(String(text)) > maxW) { size -= 0.5; doc.setFontSize(size) }
  doc.text(String(text), x, y)
  doc.setFontSize(baseSize)
}

function sectionHeader(doc, y, text) {
  y = ensure(doc, y, 12)
  doc.setFillColor(238, 249, 251)
  doc.rect(M, y - 4, CW, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...DARK)
  doc.text(text, M + 2, y + 1)
  return y + 9
}

function field(doc, y, label, value, block = false) {
  if (value == null || value === '') return y
  const val = String(value)
  doc.setFontSize(9.5)
  if (block) {
    y = ensure(doc, y, 6)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(90)
    doc.text(`${label}:`, M + 2, y); y += 4.6
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60)
    const lines = doc.splitTextToSize(val, CW - 6)
    for (const ln of lines) { y = ensure(doc, y, 4.6); doc.text(ln, M + 5, y); y += 4.6 }
    return y + 2
  }
  doc.setFont('helvetica', 'bold'); doc.setTextColor(90)
  const lw = doc.getTextWidth(`${label}:  `)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(60)
  const lines = doc.splitTextToSize(val, CW - 4 - lw)
  const h = Math.max(lines.length * 4.6, 5)
  y = ensure(doc, y, h)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(90)
  doc.text(`${label}:`, M + 2, y)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(60)
  doc.text(lines, M + 2 + lw, y)
  return y + h + 1
}

function group(doc, y, title, pairs, blockKeys = []) {
  // Format every value (handles arrays / ROM / girth / limb objects) and drop blanks.
  const present = pairs
    .map(([label, v]) => [label, formatAssessmentValue(v)])
    .filter(([, v]) => v !== '')
  if (!present.length) return y
  y = sectionHeader(doc, y, title)
  for (const [label, value] of present) y = field(doc, y, label, value, blockKeys.includes(label))
  return y + 2
}

// ---------------------------------------------------------------------------
//  Individual patient assessment report (matches the W2W intake form).
// ---------------------------------------------------------------------------
export async function generateClientReport(client, opts = {}) {
  const { notes = [], progress = [], therapist = '', bill = null, action = 'download', sessions = null, signature = null } = opts
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Physiotherapy Assessment Report',
    `Date: ${fmtDate(client.assessmentDate || new Date())}`)

  // Patient details box
  y += 4
  doc.setFillColor(238, 249, 251)
  doc.roundedRect(M, y, CW, 32, 2, 2, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text(client.name || '—', M + 6, y + 8)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80)
  const col1 = [`Reg. No: ${client.clientId || '—'}`, `Age / Gender: ${client.age || '—'} / ${client.gender || '—'}`, `Phone: ${client.phone || '—'}`]
  const col2 = [`Occupation: ${client.occupation || '—'}`, `Hand dominance: ${client.handDominance || '—'}`, `Referred by: ${client.referredBy || '—'}`]
  const col3 = [`Height: ${client.height || '—'} cm`, `Weight: ${client.weight || '—'} kg`, `Email: ${client.email || '—'}`]
  col1.forEach((t, i) => fitText(doc, t, M + 6, y + 15 + i * 5, 60, 8.5))
  col2.forEach((t, i) => fitText(doc, t, M + 70, y + 15 + i * 5, 61, 8.5))
  col3.forEach((t, i) => fitText(doc, t, M + 135, y + 15 + i * 5, PW - 2 * M - 135, 8.5))
  y += 38
  if (client.address) { doc.setFontSize(9); doc.setTextColor(90); y = field(doc, y, 'Address', client.address) }

  // Sections (skip groups with no data)
  y = group(doc, y, 'Activity Levels', [
    ['Walking / steps per day', client.walking], ['Exercise routines', client.exercise],
    ['Desktop work or others', client.deskWork], ['Sleep (hours/day)', client.sleep],
    ['Hydration (water/day)', client.hydration], ['Notes', client.activityNotes],
  ], ['Notes'])
  y = group(doc, y, 'History', [
    ['Present Medical History', client.presentHistory], ['Other notes', client.otherNotes],
  ], ['Other notes'])
  // Clinical assessment — rendered once, or repeated per selected session.
  const renderClinical = (src) => {
    y = group(doc, y, 'History', [
      ['Past Medical History', src.pastHistory], ['Current chief complaints', src.complaint],
      ['Mechanism of injury', src.mechanism], ['Radiological report', src.radiology],
    ], ['Past Medical History', 'Current chief complaints', 'Mechanism of injury', 'Radiological report'])
    y = group(doc, y, 'Pain Assessment', [
      ['Duration', src.painDuration],
      ['Nature / type', src.painType], ['Impact on ADL', src.painADL],
      ['Aggravating factor', src.painAggravating], ['Relieving factor', src.painRelieving],
      ['VAS — pain score (0-10)', src.vas],
    ])
    y = group(doc, y, 'Objective Assessment', [
      ['Built', src.built], ['Deformities / Edema / Wasting', src.deformities],
      ['Gait', src.gait], ['Notes', src.objectiveNotes],
    ], ['Notes'])
    y = group(doc, y, 'On Palpation', [
      ['Tenderness', src.tenderness], ['Swelling', src.swelling], ['Spasm', src.spasm],
      ['Crepitus / Abnormal sounds', src.crepitus],
    ])
    y = group(doc, y, 'On Examination', [
      ['ROM', src.rom], ['End feel', src.endFeel],
      ['Girth measurements', src.girth], ['Limb length', src.limbLength],
      ['Special tests & functional testing', src.specialTests],
    ], ['ROM', 'Girth measurements', 'Limb length', 'Special tests & functional testing'])
    y = group(doc, y, 'Functional Activities', [
      ['Upper body', src.functionalUpper], ['Lower body', src.functionalLower],
      ['Movement quality', src.movementQuality],
    ], ['Upper body', 'Lower body'])
    y = group(doc, y, 'Assessment & Plan', [
      ['Opinion about the condition', src.opinion], ['Treatment options (with evidence)', src.treatmentOptions],
      ['Expected duration of recovery & outcomes', src.expectedRecovery],
      ['Treatment plan', src.treatmentPlan], ['Follow up', src.followUp],
    ], ['Opinion about the condition', 'Treatment options (with evidence)', 'Expected duration of recovery & outcomes', 'Treatment plan', 'Follow up'])
    if (src.note) y = group(doc, y, 'Session Note', [['Note', src.note]], ['Note'])
  }

  // Body pain chart — the areas the patient marked at registration.
  if (Array.isArray(client.painAreas) && client.painAreas.length) {
    const chart = await renderPainChart(client.painAreas)
    if (chart) {
      const w = 110, h = w * (PAIN_H / PAIN_W)
      y = ensure(doc, y, h + 18) // keep the header + chart together on one page
      y = sectionHeader(doc, y, 'Pain Areas (marked by patient)')
      doc.addImage(chart, 'JPEG', (PW - w) / 2, y, w, h)
      y += h + 4
    }
  }

  if (sessions && sessions.length) {
    sessions.forEach((s) => {
      y = ensure(doc, y, 16)
      doc.setFillColor(...DARK)
      doc.rect(M, y - 4, CW, 8, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255)
      doc.text(`Session — ${fmtDate(s.date)}${s.therapist ? `   ·   ${s.therapist}` : ''}`, M + 2, y + 1.5)
      y += 11
      renderClinical(s)
    })
  } else {
    renderClinical(client)
  }

  // Progress measurements
  if (progress.length) {
    y = ensure(doc, y, 24)
    y = sectionHeader(doc, y, 'Progress Tracking')
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Pain (0-10)', 'ROM / Notes', 'Weight (kg)']],
      body: progress.map((p) => [fmtDate(p.date), p.pain ?? '—', p.rom || p.note || '—', p.weight ?? '—']),
      theme: 'striped', headStyles: { fillColor: BRAND, fontSize: 9 }, bodyStyles: { fontSize: 9 }, margin: { left: M, right: M },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Visit notes
  if (notes.length) {
    y = ensure(doc, y, 20)
    y = sectionHeader(doc, y, 'Visit Notes & Report Entries')
    doc.setFontSize(9.5)
    notes.forEach((n) => {
      y = ensure(doc, y, 8)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND)
      doc.text(fmtDate(n.date), M + 2, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(70)
      const lines = doc.splitTextToSize(n.text || '', CW - 32)
      doc.text(lines, M + 28, y)
      y += Math.max(lines.length * 4.6, 5) + 3
    })
  }

  // Billing
  if (bill && (Number(bill.amount) || Number(bill.paid))) {
    y = ensure(doc, y, 36)
    y = sectionHeader(doc, y, 'Billing')
    autoTable(doc, {
      startY: y,
      body: [
        ['Amount charged', inr(bill.amount)],
        ['Amount paid', inr(bill.paid)],
        ['Balance due', inr(bill.balance)],
        ['Mode of payment', bill.mode || '—'],
      ],
      theme: 'grid', styles: { fontSize: 9.5, textColor: DARK },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right' } },
      margin: { left: M, right: M },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Declaration + signatures
  y = ensure(doc, y, 46)
  y = sectionHeader(doc, y, 'Declaration')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(70)
  const decl = 'Physiotherapy involves many distinct types of physical evaluation and treatment by qualified physical therapists at Way to Wellness. During your treatment it may be necessary to expose and touch the area in need of treatment. If you do not feel comfortable with any part of the treatment, you can tell immediately. Every effort is made to preserve modesty and keep you comfortable. Hereby, the procedure of treatment was explained and the patient is given the freedom to decline treatment at any time.'
  const dl = doc.splitTextToSize(decl, CW - 4)
  y = ensure(doc, y, dl.length * 4.2 + 22)
  doc.text(dl, M + 2, y); y += dl.length * 4.2 + 16
  doc.setDrawColor(150); doc.setLineWidth(0.3)
  doc.line(M + 2, y, M + 70, y)
  doc.line(PW - M - 70, y, PW - M, y)
  // Signatures sit just above each line (consultant defaults to Sakthi Saravanan).
  const [patientSig, consultSig] = await Promise.all([
    loadImageData(signature),
    loadImageData(signatureFor(therapist)),
  ])
  drawSignature(doc, patientSig, M + 2, y, 66, 15)
  drawSignature(doc, consultSig, PW - M - 70, y, 64, 13)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK)
  doc.text("Patient's signature", M + 2, y + 5)
  doc.text('Consultant Physiotherapist', PW - M - 70, y + 5)
  if (therapist) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(80); doc.text(therapist, PW - M - 70, y + 10)
    const quals = qualificationFor(therapist)
    if (quals) { doc.setFontSize(7.5); doc.setTextColor(110); doc.text(quals, PW - M - 70, y + 14) }
  }

  footerAll(doc)
  const filename = `W2W_Report_${client.clientId || 'client'}_${client.name?.replace(/\s+/g, '_') || 'report'}.pdf`
  return finalize(doc, filename, action, `${client.name || 'Patient'} — physiotherapy assessment report from W2W Fitness & Rehab.`)
}

// ---------------------------------------------------------------------------
//  Rehab & Exercise report — every plan, day-by-day, with exercise details
//  and completion status. Separate from the physio assessment report since
//  the content (exercise prescriptions vs clinical findings) is unrelated.
// ---------------------------------------------------------------------------
export async function generateRehabReport(client, opts = {}) {
  const { plans = [], action = 'download' } = opts
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Rehab & Exercise Report', `Date: ${fmtDate(new Date())}`)

  // Patient details box (same layout as the physio report, tightened up so
  // the header and this box sit closer together)
  y += 2
  doc.setFillColor(238, 249, 251)
  doc.roundedRect(M, y, CW, 28, 2, 2, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text(client.name || '—', M + 6, y + 7)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80)
  const col1 = [`Reg. No: ${client.clientId || '—'}`, `Age / Gender: ${client.age || '—'} / ${client.gender || '—'}`, `Phone: ${client.phone || '—'}`]
  const col2 = [`Occupation: ${client.occupation || '—'}`, `Referred by: ${client.referredBy || '—'}`]
  const col3 = [`Height: ${client.height || '—'} cm`, `Weight: ${client.weight || '—'} kg`, `Email: ${client.email || '—'}`]
  col1.forEach((t, i) => fitText(doc, t, M + 6, y + 13 + i * 4.6, 60, 8.5))
  col2.forEach((t, i) => fitText(doc, t, M + 70, y + 13 + i * 4.6, 61, 8.5))
  col3.forEach((t, i) => fitText(doc, t, M + 135, y + 13 + i * 4.6, PW - 2 * M - 135, 8.5))
  y += 33

  if (!plans.length) {
    y = ensure(doc, y, 14)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120)
    doc.text('No rehab plans recorded yet.', M + 2, y)
  }

  const GREEN = [16, 150, 90]
  const AMBER = [200, 130, 20]

  const sorted = [...plans].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  sorted.forEach((p, pi) => {
    const totalDays = p.totalDays || (p.days || []).length
    y = ensure(doc, y, 16)
    doc.setFillColor(...DARK)
    doc.rect(M, y - 4, CW, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255)
    doc.text(`Plan ${pi + 1} — Started ${fmtDate(p.startDate)} · ${totalDays} day${totalDays > 1 ? 's' : ''}${p.bill?.service ? ` · ${p.bill.service}` : ''}`, M + 2, y + 1.5)
    y += 11

    y = field(doc, y, 'Rehab for', p.reason)
    y = field(doc, y, 'Note', p.note)
    y = field(doc, y, 'Prescribed by', p.therapist)
    if (Number(p.bill?.amount) || Number(p.bill?.paid)) {
      y = field(doc, y, 'Billing', `Charged ${inr(p.bill.amount)} · Paid ${inr(p.bill.paid)} · Balance ${inr(p.bill.balance)} · ${p.bill.mode || '—'}`)
    }

    // One compact summary line per day (Day · Date · Where · Status) instead
    // of four separate table columns — frees up the width for a proper,
    // per-attribute exercise table underneath.
    ;(p.days || []).forEach((d) => {
      y = ensure(doc, y, 12)
      doc.setFillColor(238, 249, 251)
      doc.rect(M, y - 4, CW, 6.5, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...DARK)
      doc.text(`Day ${d.day}`, M + 2, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(90)
      doc.text(`·  ${fmtDate(d.date)}  ·  ${d.home ? 'Home' : 'Clinic'}`, M + 18, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(d.completed ? GREEN : AMBER))
      doc.text(d.completed ? 'Completed' : 'Pending', PW - M - 2, y, { align: 'right' })
      y += 5

      const exercises = d.exercises || []
      if (!exercises.length) {
        y = ensure(doc, y, 6)
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(150)
        doc.text('No exercises prescribed for this day.', M + 3, y)
        y += 6
        return
      }

      autoTable(doc, {
        startY: y,
        head: [['#', 'Exercise', 'Sets', 'Reps', 'Hold', 'Resistance', 'Frequency', 'Rest', 'Done']],
        body: exercises.map((e, i) => [
          String(i + 1),
          e.name + (e.notes ? `\n${e.notes}` : ''),
          e.sets || '—', e.reps || '—',
          e.hold && e.hold !== 'None' ? e.hold : '—',
          e.resistance || '—', e.frequency || '—', e.rest || '—',
          '', // Done — drawn as a vector tick below; jsPDF's base fonts can't render a ✓ glyph
        ]),
        theme: 'grid',
        headStyles: { fillColor: BRAND, fontSize: 7.5, halign: 'center' },
        bodyStyles: { fontSize: 7.5, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 13, halign: 'center' },
          3: { cellWidth: 13, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 18, halign: 'center' },
          7: { cellWidth: 14, halign: 'center' },
          8: { cellWidth: 12, halign: 'center' },
        },
        margin: { left: M, right: M },
        didDrawCell(data) {
          if (data.section !== 'body' || data.column.index !== 8) return
          const done = !!exercises[data.row.index]?.done
          const cx = data.cell.x + data.cell.width / 2
          const cy = data.cell.y + data.cell.height / 2
          if (done) {
            doc.setDrawColor(...GREEN)
            doc.setLineWidth(0.7)
            doc.line(cx - 2.1, cy - 0.2, cx - 0.4, cy + 1.6)
            doc.line(cx - 0.4, cy + 1.6, cx + 2.3, cy - 2.1)
          } else {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(190)
            doc.text('—', cx, cy + 1, { align: 'center' })
          }
        },
      })
      y = doc.lastAutoTable.finalY + 4
    })
    y += 4
  })

  footerAll(doc)
  const filename = `W2W_RehabReport_${client.clientId || 'client'}_${client.name?.replace(/\s+/g, '_') || 'report'}.pdf`
  return finalize(doc, filename, action, `${client.name || 'Patient'} — rehab & exercise report from W2W Fitness & Rehab.`)
}

// Same as generateRehabReport above, but for the Fitness module's plans —
// kept as a separate function (rather than a shared helper) since the two
// modules' plan documents, wording and filenames all differ.
export async function generateFitnessReport(client, opts = {}) {
  const { plans = [], action = 'download' } = opts
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Fitness Program Report', `Date: ${fmtDate(new Date())}`)

  y += 2
  doc.setFillColor(238, 249, 251)
  doc.roundedRect(M, y, CW, 28, 2, 2, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text(client.name || '—', M + 6, y + 7)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80)
  const col1 = [`Reg. No: ${client.clientId || '—'}`, `Age / Gender: ${client.age || '—'} / ${client.gender || '—'}`, `Phone: ${client.phone || '—'}`]
  const col2 = [`Occupation: ${client.occupation || '—'}`, `Referred by: ${client.referredBy || '—'}`]
  const col3 = [`Height: ${client.height || '—'} cm`, `Weight: ${client.weight || '—'} kg`, `Email: ${client.email || '—'}`]
  col1.forEach((t, i) => fitText(doc, t, M + 6, y + 13 + i * 4.6, 60, 8.5))
  col2.forEach((t, i) => fitText(doc, t, M + 70, y + 13 + i * 4.6, 61, 8.5))
  col3.forEach((t, i) => fitText(doc, t, M + 135, y + 13 + i * 4.6, PW - 2 * M - 135, 8.5))
  y += 33

  if (Array.isArray(client.fitnessGoals) && client.fitnessGoals.length) {
    y = ensure(doc, y, 8)
    y = field(doc, y, 'Fitness goals', client.fitnessGoals.join(', '))
  }

  if (!plans.length) {
    y = ensure(doc, y, 14)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120)
    doc.text('No fitness plans recorded yet.', M + 2, y)
  }

  const GREEN = [16, 150, 90]
  const AMBER = [200, 130, 20]

  const sorted = [...plans].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  sorted.forEach((p, pi) => {
    const totalDays = p.totalDays || (p.days || []).length
    y = ensure(doc, y, 16)
    doc.setFillColor(...DARK)
    doc.rect(M, y - 4, CW, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255)
    doc.text(`Plan ${pi + 1} — Started ${fmtDate(p.startDate)} · ${totalDays} day${totalDays > 1 ? 's' : ''}${p.bill?.service ? ` · ${p.bill.service}` : ''}`, M + 2, y + 1.5)
    y += 11

    y = field(doc, y, 'Goal', p.reason)
    y = field(doc, y, 'Note', p.note)
    y = field(doc, y, 'Prescribed by', p.therapist)
    if (Number(p.bill?.amount) || Number(p.bill?.paid)) {
      y = field(doc, y, 'Billing', `Charged ${inr(p.bill.amount)} · Paid ${inr(p.bill.paid)} · Balance ${inr(p.bill.balance)} · ${p.bill.mode || '—'}`)
    }

    ;(p.days || []).forEach((d) => {
      y = ensure(doc, y, 12)
      doc.setFillColor(238, 249, 251)
      doc.rect(M, y - 4, CW, 6.5, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...DARK)
      doc.text(`Day ${d.day}`, M + 2, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(90)
      doc.text(`·  ${fmtDate(d.date)}  ·  ${d.home ? 'Home' : 'Gym'}`, M + 18, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(d.completed ? GREEN : AMBER))
      doc.text(d.completed ? 'Completed' : 'Pending', PW - M - 2, y, { align: 'right' })
      y += 5

      const exercises = d.exercises || []
      if (!exercises.length) {
        y = ensure(doc, y, 6)
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(150)
        doc.text('No exercises prescribed for this day.', M + 3, y)
        y += 6
        return
      }

      // No Frequency column — that's Rehab-only (a fitness plan's cadence is
      // its day schedule), so the freed width goes to the exercise name.
      autoTable(doc, {
        startY: y,
        head: [['#', 'Exercise', 'Sets', 'Reps', 'Hold', 'Resistance', 'Rest', 'Done']],
        body: exercises.map((e, i) => [
          String(i + 1),
          e.name + (e.notes ? `\n${e.notes}` : ''),
          e.sets || '—', e.reps || '—',
          e.hold && e.hold !== 'None' ? e.hold : '—',
          e.resistance || '—', e.rest || '—',
          '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: BRAND, fontSize: 7.5, halign: 'center' },
        bodyStyles: { fontSize: 7.5, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 13, halign: 'center' },
          3: { cellWidth: 13, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 14, halign: 'center' },
          7: { cellWidth: 12, halign: 'center' },
        },
        margin: { left: M, right: M },
        didDrawCell(data) {
          if (data.section !== 'body' || data.column.index !== 7) return
          const done = !!exercises[data.row.index]?.done
          const cx = data.cell.x + data.cell.width / 2
          const cy = data.cell.y + data.cell.height / 2
          if (done) {
            doc.setDrawColor(...GREEN)
            doc.setLineWidth(0.7)
            doc.line(cx - 2.1, cy - 0.2, cx - 0.4, cy + 1.6)
            doc.line(cx - 0.4, cy + 1.6, cx + 2.3, cy - 2.1)
          } else {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(190)
            doc.text('—', cx, cy + 1, { align: 'center' })
          }
        },
      })
      y = doc.lastAutoTable.finalY + 4
    })
    y += 4
  })

  footerAll(doc)
  const filename = `W2W_FitnessReport_${client.clientId || 'client'}_${client.name?.replace(/\s+/g, '_') || 'report'}.pdf`
  return finalize(doc, filename, action, `${client.name || 'Patient'} — fitness program report from W2W Fitness & Rehab.`)
}

// ---------------------------------------------------------------------------
//  Monthly / date-range appointments + new clients report.
// ---------------------------------------------------------------------------
export async function generateMonthlyReport({ monthLabel, rangeLabel, appointments = [], clients = [], action = 'download' }) {
  const label = rangeLabel || monthLabel || ''
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Appointments Report', label)

  const completed = appointments.filter((a) => a.status === 'completed').length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length
  autoTable(doc, {
    startY: y + 2,
    body: [[`Total Appointments\n${appointments.length}`, `Completed\n${completed}`, `Cancelled\n${cancelled}`, `New Clients\n${clients.length}`]],
    theme: 'grid', styles: { halign: 'center', fontSize: 10, cellPadding: 3, textColor: DARK }, margin: { left: M, right: M },
  })
  y = doc.lastAutoTable.finalY + 6

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text('Appointments', 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [['Date', 'Time', 'Client', 'Phone', 'Service', 'Status']],
    body: appointments
      .slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .map((a) => [fmtDate(a.date), fmt12h(a.time), a.name, a.phone, a.service, a.status]),
    theme: 'striped', headStyles: { fillColor: BRAND, fontSize: 9 }, bodyStyles: { fontSize: 8.5 }, margin: { left: M, right: M },
  })
  y = doc.lastAutoTable.finalY + 8

  if (clients.length) {
    if (y > PH - 40) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
    doc.text('New Clients Registered', 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [['Reg. No', 'Name', 'Phone', 'Service / Concern', 'Registered']],
      body: clients.map((c) => [c.clientId, c.name, c.phone, c.complaint || c.service || '—', fmtDate(c.createdAt)]),
      theme: 'striped', headStyles: { fillColor: DARK, fontSize: 9 }, bodyStyles: { fontSize: 8.5 }, margin: { left: M, right: M },
    })
  }

  footerAll(doc)
  return finalize(doc, `W2W_Appointments_${label.replace(/\s+/g, '_')}.pdf`, action)
}

// ---------------------------------------------------------------------------
//  Expenses report.
// ---------------------------------------------------------------------------
export async function generateExpensesReport({ rangeLabel = '', expenses = [], action = 'download' }) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Expenses Report', rangeLabel)
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  autoTable(doc, {
    startY: y + 2,
    head: [['Date', 'Expense', 'Note', 'Amount']],
    body: expenses.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => [fmtDate(e.date), e.name, e.note || '—', inr(e.amount)]),
    foot: [['', '', 'Total', inr(total)]],
    theme: 'striped', headStyles: { fillColor: BRAND, fontSize: 9 }, bodyStyles: { fontSize: 9 },
    footStyles: { fillColor: DARK, textColor: 255, fontSize: 9.5 }, columnStyles: { 3: { halign: 'right' } }, margin: { left: M, right: M },
  })
  footerAll(doc)
  return finalize(doc, `W2W_Expenses_${rangeLabel.replace(/\s+/g, '_')}.pdf`, action)
}

// ---------------------------------------------------------------------------
//  Patient charges (income) report.
// ---------------------------------------------------------------------------
export async function generateIncomeReport({ rangeLabel = '', entries = [], action = 'download' }) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Patient Charges (Income) Report', rangeLabel)
  const charged = entries.reduce((s, e) => s + Number(e.amount || 0), 0)
  const paid = entries.reduce((s, e) => s + Number(e.paid || 0), 0)
  const due = entries.reduce((s, e) => s + Number(e.balance || 0), 0)
  autoTable(doc, {
    startY: y + 2,
    head: [['Date', 'Client', 'Service', 'Therapist', 'Charged', 'Paid', 'Due', 'Mode']],
    body: entries.slice().sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [fmtDate(e.date), e.clientName, e.service || '—', e.therapist || '—', inr(e.amount), inr(e.paid), inr(e.balance), e.mode || '—']),
    foot: [['', '', '', 'Total', inr(charged), inr(paid), inr(due), '']],
    theme: 'striped', headStyles: { fillColor: BRAND, fontSize: 8 }, bodyStyles: { fontSize: 8 },
    footStyles: { fillColor: DARK, textColor: 255, fontSize: 8 },
    columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }, margin: { left: M, right: M },
  })
  footerAll(doc)
  return finalize(doc, `W2W_Income_${rangeLabel.replace(/\s+/g, '_')}.pdf`, action)
}

// ---------------------------------------------------------------------------
//  Accounts report — income (patient charges) + expenses + net profit.
// ---------------------------------------------------------------------------
export async function generateAccountsReport({ rangeLabel = '', entries = [], expenses = [], action = 'download' }) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Accounts Report', rangeLabel)
  const charged = entries.reduce((s, e) => s + Number(e.amount || 0), 0)
  const received = entries.reduce((s, e) => s + Number(e.paid || 0), 0)
  const due = entries.reduce((s, e) => s + Number(e.balance || 0), 0)
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const net = received - totalExp

  autoTable(doc, {
    startY: y + 2,
    body: [[`Income (received)\n${inr(received)}`, `Expenses\n${inr(totalExp)}`, `Net Profit\n${inr(net)}`]],
    theme: 'grid', styles: { halign: 'center', fontSize: 11, cellPadding: 4, textColor: DARK }, margin: { left: M, right: M },
  })
  y = doc.lastAutoTable.finalY + 8

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK); doc.text('Income — Patient Charges', 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [['Date', 'Client', 'Service', 'Charged', 'Received', 'Due', 'Mode']],
    body: entries.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => [fmtDate(e.date), e.clientName, e.service || '—', inr(e.amount), inr(e.paid), inr(e.balance), e.mode || '—']),
    foot: [['', '', 'Total', inr(charged), inr(received), inr(due), '']],
    theme: 'striped', headStyles: { fillColor: BRAND, fontSize: 8 }, bodyStyles: { fontSize: 8 }, footStyles: { fillColor: DARK, textColor: 255, fontSize: 8 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }, margin: { left: M, right: M },
  })
  y = doc.lastAutoTable.finalY + 8
  if (y > PH - 60) { doc.addPage(); y = 20 }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK); doc.text('Expenses', 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [['Date', 'Expense', 'Note', 'Amount']],
    body: expenses.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => [fmtDate(e.date), e.name, e.note || '—', inr(e.amount)]),
    foot: [['', '', 'Total', inr(totalExp)]],
    theme: 'striped', headStyles: { fillColor: [176, 58, 58], fontSize: 9 }, bodyStyles: { fontSize: 9 }, footStyles: { fillColor: DARK, textColor: 255, fontSize: 9 },
    columnStyles: { 3: { halign: 'right' } }, margin: { left: M, right: M },
  })
  y = doc.lastAutoTable.finalY + 8

  y = ensure(doc, y, 16)
  doc.setFillColor(238, 249, 251); doc.roundedRect(M, y, CW, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text('Net Profit  (Income received − Expenses)', M + 4, y + 8)
  doc.text(inr(net), PW - M - 4, y + 8, { align: 'right' })

  footerAll(doc)
  return finalize(doc, `W2W_Accounts_${rangeLabel.replace(/\s+/g, '_')}.pdf`, action)
}

// ---------------------------------------------------------------------------
//  Workshop report — students, mobile, fees paid + total workshop income.
// ---------------------------------------------------------------------------
export async function generateWorkshopReport({ rangeLabel = '', registrations = [], workshops = [], action = 'download' }) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Workshop Report', rangeLabel)
  const feeOf = (r) => Number(workshops.find((w) => w.id === r.workshopId)?.fee || 0)
  const confirmed = registrations.filter((r) => r.status === 'confirmed')
  const income = confirmed.reduce((s, r) => s + feeOf(r), 0)

  autoTable(doc, {
    startY: y + 2,
    body: [[`Registrations\n${registrations.length}`, `Confirmed (paid)\n${confirmed.length}`, `Workshop Income\n${inr(income)}`]],
    theme: 'grid', styles: { halign: 'center', fontSize: 11, cellPadding: 4, textColor: DARK }, margin: { left: M, right: M },
  })
  y = doc.lastAutoTable.finalY + 6

  autoTable(doc, {
    startY: y,
    head: [['Workshop', 'Name', 'Mobile', 'Qualification', 'Status', 'Fee paid']],
    body: registrations.slice().sort((a, b) => (a.workshopTitle || '').localeCompare(b.workshopTitle || ''))
      .map((r) => [r.workshopTitle || '—', r.fullName || '—', r.phone || '—', r.qualification || '—', r.status === 'confirmed' ? 'Confirmed' : 'Pending', r.status === 'confirmed' ? inr(feeOf(r)) : '—']),
    foot: [['', '', '', '', 'Total income', inr(income)]],
    theme: 'striped', headStyles: { fillColor: BRAND, fontSize: 8.5 }, bodyStyles: { fontSize: 8.5 }, footStyles: { fillColor: DARK, textColor: 255, fontSize: 8.5 },
    columnStyles: { 5: { halign: 'right' } }, margin: { left: M, right: M },
  })

  footerAll(doc)
  return finalize(doc, `W2W_Workshops_${rangeLabel.replace(/\s+/g, '_')}.pdf`, action)
}
