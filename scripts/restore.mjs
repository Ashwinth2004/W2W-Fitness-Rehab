#!/usr/bin/env node
// Restore a snapshot (from backup.mjs OR the in-app "Export backup" button)
// back into Firestore. A backup you can't restore isn't a backup — so test this
// once against a scratch project before you ever need it for real.
//
//   node restore.mjs <file>                          # restore everything (asks to confirm)
//   node restore.mjs <file> --dry-run                # show what WOULD be written, write nothing
//   node restore.mjs <file> --collections clients,accounting   # only these root collections
//   node restore.mjs <file> --yes                    # skip the typed confirmation (for automation)
//
// Encrypted files are decrypted with BACKUP_ENCRYPTION_PASSPHRASE (or --passphrase).
// Writes use set() at the document's original path, recreating IDs and nesting
// exactly. Existing docs at those paths are OVERWRITTEN; docs not in the backup
// are left untouched (restore does not delete).
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { initDb, getProjectId } from './lib/admin.mjs'
import { decode } from './lib/serialize.mjs'
import { decrypt, isEncrypted } from './lib/crypto.mjs'

const args = process.argv.slice(2)
const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }

const file = args.find((a) => !a.startsWith('--')) || getArg('--file')
const dryRun = args.includes('--dry-run')
const skipConfirm = args.includes('--yes')
const only = (getArg('--collections') || '').split(',').map((s) => s.trim()).filter(Boolean)
const passphrase = process.env.BACKUP_ENCRYPTION_PASSPHRASE || getArg('--passphrase') || ''

if (!file) {
  console.error('Usage: node restore.mjs <backup-file> [--dry-run] [--collections a,b] [--yes]')
  process.exit(1)
}

let buf = readFileSync(file)
if (isEncrypted(buf)) {
  if (!passphrase) { console.error('File is encrypted. Set BACKUP_ENCRYPTION_PASSPHRASE or pass --passphrase.'); process.exit(1) }
  buf = decrypt(buf, passphrase)
}

let snapshot
try { snapshot = JSON.parse(buf.toString('utf8')) } catch { console.error('Could not parse the backup file as JSON.'); process.exit(1) }
if (snapshot.format !== 'w2w-backup-v1') { console.error(`Unrecognized backup format: ${snapshot.format}`); process.exit(1) }

// Flatten the tree into a list of { path, raw } (data still encoded), rebuilding
// full document paths. Decoding is deferred to write time so --dry-run needs no
// credentials and writes nothing.
const writes = []
const walk = (col, parentSegments) => {
  if (parentSegments.length === 0 && only.length && !only.includes(col.path)) return
  for (const d of col.documents) {
    const segments = [...parentSegments, col.path, d.id]
    writes.push({ path: segments.join('/'), raw: d.data })
    for (const sub of d.collections) walk(sub, segments)
  }
}
for (const col of snapshot.collections) walk(col, [])

console.log(`Backup: ${file}`)
console.log(`  taken: ${snapshot.exportedAt}  ·  source: ${snapshot.source}  ·  project: ${snapshot.projectId || '?'}`)
if (only.length) console.log(`  filter: root collections [${only.join(', ')}]`)
console.log(`${dryRun ? '[DRY RUN] ' : ''}${writes.length} documents to write.`)

if (dryRun) {
  for (const w of writes.slice(0, 25)) console.log('  set', w.path)
  if (writes.length > 25) console.log(`  …and ${writes.length - 25} more`)
  console.log('Dry run complete — nothing was written.')
  process.exit(0)
}

if (writes.length === 0) { console.log('Nothing to restore.'); process.exit(0) }

const db = initDb()
console.log(`  target project: ${getProjectId() || '?'}`)

if (!skipConfirm) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ans = await rl.question(`\nThis OVERWRITES ${writes.length} docs in project "${getProjectId()}". Type RESTORE to proceed: `)
  rl.close()
  if (ans.trim() !== 'RESTORE') { console.log('Aborted — nothing written.'); process.exit(1) }
}

let done = 0
const CHUNK = 400 // Firestore batch limit is 500; stay under it
for (let i = 0; i < writes.length; i += CHUNK) {
  const batch = db.batch()
  for (const w of writes.slice(i, i + CHUNK)) batch.set(db.doc(w.path), decode(w.raw, db))
  await batch.commit()
  done += Math.min(CHUNK, writes.length - i)
  console.log(`  committed ${done}/${writes.length}`)
}
console.log('✔  Restore complete.')
