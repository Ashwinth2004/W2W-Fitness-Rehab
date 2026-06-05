// ============================================================================
//  Branded PDF reports (jsPDF + autotable).
//   - generateClientReport(client, notes, progress)
//   - generateMonthlyReport({ month, appointments, clients })
//  Every page gets the W2W letterhead (logo) and a footer with the company
//  address, contact and website.
// ============================================================================
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BUSINESS } from './constants'
import { fmtDate, fmt12h } from './format'

const BRAND = [14, 139, 161] // #0e8ba1
const DARK = [17, 76, 91]

let _logoCache = null
async function loadLogo() {
  if (_logoCache) return _logoCache
  try {
    const res = await fetch('/logo.jpg')
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

const line = (doc, y) => { const W = doc.internal.pageSize.getWidth(); doc.setDrawColor(235); doc.line(14, y, W - 14, y) }

// ---------------------------------------------------------------------------
export async function generateClientReport(client, notes = [], progress = []) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Client / Patient Report', `Generated on ${fmtDate(new Date(), 'dd MMM yyyy')}`)

  // Client details box
  y += 4
  doc.setFillColor(238, 249, 251)
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 34, 2, 2, 'F')
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(client.name || '—', 20, y + 9)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80)
  const left = [
    `Client ID: ${client.clientId || '—'}`,
    `Phone: ${client.phone || '—'}`,
    `Email: ${client.email || '—'}`,
  ]
  const right = [
    `Age / Gender: ${client.age || '—'} / ${client.gender || '—'}`,
    `Registered: ${fmtDate(client.createdAt)}`,
    `Address: ${client.address || '—'}`,
  ]
  left.forEach((t, i) => doc.text(t, 20, y + 17 + i * 5))
  right.forEach((t, i) => doc.text(t, 110, y + 17 + i * 5))
  y += 42

  if (client.complaint) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK)
    doc.text('Chief Complaint / Goal', 14, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(70)
    const lines = doc.splitTextToSize(client.complaint, doc.internal.pageSize.getWidth() - 28)
    doc.text(lines, 14, y); y += lines.length * 5 + 4
  }
  if (client.history) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK)
    doc.text('Medical History / Previous Reports', 14, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(70)
    const lines = doc.splitTextToSize(client.history, doc.internal.pageSize.getWidth() - 28)
    doc.text(lines, 14, y); y += lines.length * 5 + 4
  }

  // Progress table
  if (progress.length) {
    autoTable(doc, {
      startY: y + 2,
      head: [['Date', 'Pain (0-10)', 'ROM / Notes', 'Weight (kg)']],
      body: progress.map((p) => [fmtDate(p.date), p.pain ?? '—', p.rom || p.note || '—', p.weight ?? '—']),
      theme: 'striped',
      headStyles: { fillColor: BRAND, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {},
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Visit notes / report entries
  if (notes.length) {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK)
    doc.text('Visit Notes & Report Entries', 14, y); y += 4; line(doc, y); y += 5
    doc.setFontSize(10)
    notes.forEach((n) => {
      if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND)
      doc.text(fmtDate(n.date), 14, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(70)
      const lines = doc.splitTextToSize(n.text || '', doc.internal.pageSize.getWidth() - 50)
      doc.text(lines, 40, y)
      y += Math.max(lines.length * 5, 5) + 4
    })
  }

  footerAll(doc)
  doc.save(`W2W_${client.clientId || 'client'}_${client.name?.replace(/\s+/g, '_') || 'report'}.pdf`)
}

// ---------------------------------------------------------------------------
export async function generateMonthlyReport({ monthLabel, appointments = [], clients = [] }) {
  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = header(doc, logo, 'Monthly Report', monthLabel)

  // Summary cards
  const completed = appointments.filter((a) => a.status === 'completed').length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length
  const summary = [
    ['Total Appointments', String(appointments.length)],
    ['Completed', String(completed)],
    ['Cancelled', String(cancelled)],
    ['New Clients', String(clients.length)],
  ]
  autoTable(doc, {
    startY: y + 2,
    body: [summary.map((s) => `${s[0]}\n${s[1]}`)],
    theme: 'grid',
    styles: { halign: 'center', fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: { 0: {}, 1: {}, 2: {}, 3: {} },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 6

  // Appointments table
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text('Appointments', 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [['Date', 'Time', 'Client', 'Phone', 'Service', 'Status']],
    body: appointments
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .map((a) => [fmtDate(a.date), fmt12h(a.time), a.name, a.phone, a.service, a.status]),
    theme: 'striped',
    headStyles: { fillColor: BRAND, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 8

  // New clients table
  if (clients.length) {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
    doc.text('New Clients Registered', 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [['Client ID', 'Name', 'Phone', 'Service / Concern', 'Registered']],
      body: clients.map((c) => [c.clientId, c.name, c.phone, c.complaint || c.service || '—', fmtDate(c.createdAt)]),
      theme: 'striped',
      headStyles: { fillColor: DARK, fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: 14, right: 14 },
    })
  }

  footerAll(doc)
  doc.save(`W2W_Monthly_Report_${monthLabel.replace(/\s+/g, '_')}.pdf`)
}
