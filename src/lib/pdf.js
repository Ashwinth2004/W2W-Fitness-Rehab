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
import { BUSINESS } from './constants'
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
  const present = pairs.filter(([, v]) => v != null && v !== '')
  if (!present.length) return y
  y = sectionHeader(doc, y, title)
  for (const [label, value] of present) y = field(doc, y, label, value, blockKeys.includes(label))
  return y + 2
}

// ---------------------------------------------------------------------------
//  Individual patient assessment report (matches the W2W intake form).
// ---------------------------------------------------------------------------
export async function generateClientReport(client, opts = {}) {
  const { notes = [], progress = [], therapist = '', bill = null, action = 'download' } = opts
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
  col1.forEach((t, i) => doc.text(t, M + 6, y + 15 + i * 5))
  col2.forEach((t, i) => doc.text(t, M + 70, y + 15 + i * 5))
  col3.forEach((t, i) => doc.text(t, M + 135, y + 15 + i * 5))
  y += 38
  if (client.address) { doc.setFontSize(9); doc.setTextColor(90); y = field(doc, y, 'Address', client.address) }

  // Sections (skip groups with no data)
  y = group(doc, y, 'Activity Levels', [
    ['Walking / steps per day', client.walking], ['Exercise routines', client.exercise],
    ['Desktop work or others', client.deskWork], ['Sleep (hours & cycle)', client.sleep],
    ['Hydration (water/day)', client.hydration],
  ])
  y = group(doc, y, 'History', [
    ['Past Medical History', client.pastHistory], ['Present Medical History', client.presentHistory],
    ['Current chief complaints', client.complaint], ['Mechanism of injury', client.mechanism],
  ], ['Past Medical History', 'Present Medical History', 'Current chief complaints', 'Mechanism of injury'])
  y = group(doc, y, 'Pain Assessment', [
    ['Area (side & site)', client.painArea], ['Duration', client.painDuration],
    ['Nature / type', client.painType], ['Impact on ADL', client.painADL],
    ['Aggravating factor', client.painAggravating], ['Relieving factor', client.painRelieving],
    ['VAS — pain score (0-10)', client.vas],
  ])
  y = group(doc, y, 'Objective Assessment', [
    ['Built', client.built], ['Deformities / Edema / Wasting', client.deformities],
    ['Gait', client.gait], ['Notes', client.objectiveNotes],
  ], ['Notes'])
  y = group(doc, y, 'On Palpation', [
    ['Tenderness', client.tenderness], ['Swelling / Spasm', client.swelling],
    ['Crepitus / Abnormal sounds', client.crepitus],
  ])
  y = group(doc, y, 'On Examination', [
    ['ROM', client.rom], ['End feel', client.endFeel], ['Grip', client.grip],
    ['Muscle tone', client.muscleTone], ['Girth measurements', client.girth],
    ['Limb length discrepancies', client.limbLength], ['Reflexes', client.reflexes],
    ['Special tests & functional testing', client.specialTests],
  ], ['ROM', 'Special tests & functional testing'])
  y = group(doc, y, 'Assessment & Plan', [
    ['Opinion about the condition', client.opinion], ['Treatment options (with evidence)', client.treatmentOptions],
    ['Expected duration of recovery & outcomes', client.expectedRecovery],
    ['Treatment plan', client.treatmentPlan], ['Follow up', client.followUp],
  ], ['Opinion about the condition', 'Treatment options (with evidence)', 'Expected duration of recovery & outcomes', 'Treatment plan', 'Follow up'])

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
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK)
  doc.text("Patient's signature", M + 2, y + 5)
  doc.text('Consultant Physiotherapist', PW - M - 70, y + 5)
  if (therapist) { doc.setFont('helvetica', 'normal'); doc.setTextColor(80); doc.text(therapist, PW - M - 70, y + 10) }

  footerAll(doc)
  const filename = `W2W_Report_${client.clientId || 'client'}_${client.name?.replace(/\s+/g, '_') || 'report'}.pdf`
  return finalize(doc, filename, action, `${client.name || 'Patient'} — physiotherapy assessment report from W2W Fitness & Rehab.`)
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
