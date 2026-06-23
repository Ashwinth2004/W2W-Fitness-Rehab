// Layer 2 of the backup plan: a one-click, on-demand export the full admin can
// run from the dashboard (e.g. right before a risky bulk edit). It downloads a
// complete JSON snapshot to your machine in the SAME format as the automated
// Admin-SDK backup, so scripts/restore.mjs can restore either one.
//
// Note: the browser SDK can't *discover* collections/subcollections (that's an
// Admin-SDK-only ability), so we read from a known map. Keep this in sync if you
// ever add a new top-level collection or a new subcollection under clients. The
// automated Layer 1 backup discovers everything automatically and remains the
// authoritative, always-complete copy.
import { collection, getDocs, Timestamp, GeoPoint, Bytes, DocumentReference } from 'firebase/firestore'
import { db } from '../firebase'

// Every top-level collection in the database (see firestore.rules).
const ROOT_COLLECTIONS = [
  'enquiries', 'availability', 'appointments', 'counters', 'clients',
  'testimonials', 'posts', 'reels', 'workshops', 'workshopStats',
  'workshopRegistrations', 'workshopRegEmails', 'therapists',
  'accounting', 'expenses', 'expenseCategories',
]

// Subcollections to read under each client document. `treatments` is current;
// `notes`/`progress` cover any legacy session data.
const CLIENT_SUBCOLLECTIONS = ['treatments', 'notes', 'progress']

// Mirror of scripts/lib/serialize.mjs `encode`, for the browser SDK types.
function encode(value) {
  if (value === null || value === undefined) return value
  if (value instanceof Timestamp) return { __t: 'timestamp', s: value.seconds, n: value.nanoseconds }
  if (value instanceof GeoPoint) return { __t: 'geopoint', lat: value.latitude, lng: value.longitude }
  if (value instanceof Bytes) return { __t: 'bytes', b64: value.toBase64() }
  if (value instanceof DocumentReference) return { __t: 'ref', path: value.path }
  if (Array.isArray(value)) return value.map(encode)
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = encode(v)
    return out
  }
  return value
}

async function dumpCollection(segments, withClientSubs) {
  const snap = await getDocs(collection(db, ...segments))
  const documents = []
  for (const d of snap.docs) {
    const node = { id: d.id, data: encode(d.data()), collections: [] }
    if (withClientSubs) {
      for (const sub of CLIENT_SUBCOLLECTIONS) {
        const subDump = await dumpCollection([...segments, d.id, sub], false)
        if (subDump.documents.length) node.collections.push(subDump)
      }
    }
    documents.push(node)
  }
  return { path: segments[segments.length - 1], count: documents.length, documents }
}

function countDocuments(collections) {
  let n = 0
  const walk = (c) => { n += c.documents.length; for (const d of c.documents) for (const s of d.collections) walk(s) }
  collections.forEach(walk)
  return n
}

// Build a complete snapshot object. Collections that fail to read (shouldn't
// happen for the full admin) are recorded in `skipped` rather than aborting.
export async function buildBackup() {
  const collections = []
  const skipped = []
  for (const name of ROOT_COLLECTIONS) {
    try {
      collections.push(await dumpCollection([name], name === 'clients'))
    } catch (e) {
      skipped.push({ collection: name, error: e?.code || e?.message || 'read failed' })
    }
  }
  const snapshot = {
    format: 'w2w-backup-v1',
    exportedAt: new Date().toISOString(),
    source: 'admin-button',
    projectId: db.app?.options?.projectId || '',
    totalDocuments: countDocuments(collections),
    collections,
  }
  return { snapshot, skipped }
}

// Run the export and trigger a JSON download. Kept as the technical, restore-
// compatible format (used by scripts/restore.mjs). The admin dashboard uses the
// Excel export below; this remains available programmatically.
export async function downloadBackup() {
  const { snapshot, skipped } = await buildBackup()
  const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `w2w-backup-${snapshot.exportedAt.replace(/[:.]/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { count: snapshot.totalDocuments, collections: snapshot.collections.length, skipped }
}

// ===========================================================================
//  Excel export — a human-readable workbook for non-technical staff.
//  One sheet per data type + a Summary cover sheet. Readable dates, friendly
//  headers, auto-filters. Complete and future-proof (plain .xlsx).
// ===========================================================================

// Friendly names + a sensible tab order. Anything not listed still gets a sheet
// (auto-named) so new collections are never dropped.
const SHEET_LABELS = {
  clients: 'Clients (Patients)',
  __treatments: 'Treatments (Sessions)',
  appointments: 'Appointments',
  accounting: 'Income (Patient Charges)',
  expenses: 'Expenses',
  expenseCategories: 'Expense Categories',
  workshops: 'Workshops',
  workshopRegistrations: 'Workshop Registrations',
  workshopStats: 'Workshop Seats',
  workshopRegEmails: 'Workshop Reg Emails',
  enquiries: 'Enquiries',
  therapists: 'Therapists',
  availability: 'Booked Slots',
  counters: 'Counters',
  testimonials: 'Testimonials',
  posts: 'Blog Posts',
  reels: 'Reels',
}
const SHEET_ORDER = [
  'clients', '__treatments', 'appointments', 'accounting', 'expenses', 'expenseCategories',
  'workshops', 'workshopRegistrations', 'workshopStats', 'workshopRegEmails', 'enquiries',
  'therapists', 'availability', 'counters', 'testimonials', 'posts', 'reels',
]

// "createdAt" -> "Created At", "workshopTitle" -> "Workshop Title"
function prettify(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

function tsToString(s, n) {
  const d = new Date(s * 1000 + Math.floor((n || 0) / 1e6))
  if (Number.isNaN(d.getTime())) return ''
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// Turn any (already-encoded) Firestore value into a readable cell value.
function cell(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number' || typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(cell).join(', ')
  if (typeof v === 'object') {
    if (v.__t === 'timestamp') return tsToString(v.s, v.n)
    if (v.__t === 'geopoint') return `${v.lat}, ${v.lng}`
    if (v.__t === 'ref') return v.path
    if (v.__t === 'bytes') return '[binary]'
    return JSON.stringify(v)
  }
  return String(v)
}

// Build a worksheet from a list of { id, data } docs. `leading` adds extra
// columns before the ID (used to attach client info to treatment rows).
function sheetFromDocs(XLSX, docs, leading = []) {
  const keys = []
  const seen = new Set()
  for (const d of docs) for (const k of Object.keys(d.data || {})) if (!seen.has(k)) { seen.add(k); keys.push(k) }
  const headers = [...leading.map((l) => l.header), 'ID', ...keys.map(prettify)]
  const rows = docs.map((d) => [
    ...leading.map((l) => cell(l.get(d))),
    d.id,
    ...keys.map((k) => cell(d.data?.[k])),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map((h, i) => {
    let max = String(h).length
    for (const r of rows) { const len = String(r[i] ?? '').length; if (len > max) max = len }
    return { wch: Math.min(Math.max(max + 2, 8), 60) }
  })
  if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] }
  return ws
}

// Assemble the whole workbook from a snapshot. Pure (takes the XLSX module), so
// it's easy to test.
export function buildWorkbook(XLSX, snapshot) {
  const wb = XLSX.utils.book_new()
  const byPath = {}
  for (const col of snapshot.collections) byPath[col.path] = col

  // Pull treatments out of clients into their own flat sheet.
  const treatments = []
  for (const c of byPath.clients?.documents || []) {
    const clientName = c.data?.name || ''
    for (const sub of c.collections || []) {
      if (sub.path === 'treatments') for (const t of sub.documents) {
        treatments.push({ id: t.id, data: t.data, _cid: c.id, _cname: clientName })
      }
    }
  }

  const used = new Set()
  const stats = []
  const addSheet = (label, ws, count) => {
    let name = label.slice(0, 31)
    let i = 2
    while (used.has(name)) name = `${label.slice(0, 28)} ${i++}`
    used.add(name)
    XLSX.utils.book_append_sheet(wb, ws, name)
    stats.push({ sheet: name, rows: count })
  }

  const emitCollection = (key) => {
    if (key === '__treatments') {
      if (treatments.length) {
        addSheet(SHEET_LABELS.__treatments, sheetFromDocs(XLSX, treatments, [
          { header: 'Client ID', get: (d) => d._cid },
          { header: 'Client Name', get: (d) => d._cname },
        ]), treatments.length)
      }
      return
    }
    const col = byPath[key]
    if (!col || !col.documents.length) return
    addSheet(SHEET_LABELS[key] || prettify(key), sheetFromDocs(XLSX, col.documents), col.documents.length)
  }

  SHEET_ORDER.forEach(emitCollection)
  // Future-proof: any collection not in the known order still gets a sheet.
  for (const col of snapshot.collections) {
    if (SHEET_ORDER.includes(col.path)) continue
    if (!col.documents.length) continue
    addSheet(SHEET_LABELS[col.path] || prettify(col.path), sheetFromDocs(XLSX, col.documents), col.documents.length)
  }

  // Summary cover sheet (placed first).
  const summary = [
    ['W2W Fitness & Rehab — Data Backup'],
    [],
    ['Exported on', new Date(snapshot.exportedAt).toLocaleString()],
    ['Database', snapshot.projectId || 'w2w-fitness-and-rehab'],
    ['Total records', snapshot.totalDocuments],
    [],
    ['A complete, readable copy of the clinic data — one tab per type (see below).'],
    ['Dates are shown as YYYY-MM-DD HH:MM in your local time.'],
    [],
    ['Sheet', 'Records'],
    ...stats.map((s) => [s.sheet, s.rows]),
  ]
  const sumWs = XLSX.utils.aoa_to_sheet(summary)
  sumWs['!cols'] = [{ wch: 42 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, sumWs, 'Summary')
  wb.SheetNames.unshift(wb.SheetNames.pop()) // move Summary to the front

  return { wb, stats }
}

// Read everything, build the workbook, and download it as .xlsx.
export async function downloadExcelBackup() {
  const { snapshot, skipped } = await buildBackup()
  const XLSX = await import('xlsx')
  const { wb, stats } = buildWorkbook(XLSX, snapshot)
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `W2W-Backup-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { count: snapshot.totalDocuments, sheets: stats.length, skipped }
}
