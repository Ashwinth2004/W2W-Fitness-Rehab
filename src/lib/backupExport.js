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

// Run the export and trigger a download. Returns a small summary for the UI.
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
