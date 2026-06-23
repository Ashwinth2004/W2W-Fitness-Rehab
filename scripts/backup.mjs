#!/usr/bin/env node
// Export the ENTIRE Firestore database to a single snapshot file.
//
//   node backup.mjs                  # encrypt if BACKUP_ENCRYPTION_PASSPHRASE is set
//   node backup.mjs --out <dir>      # output directory (default: ./backups)
//   node backup.mjs --plain          # force unencrypted JSON (not recommended)
//   node backup.mjs --passphrase X   # pass the passphrase explicitly
//
// Reads every collection + subcollection recursively (see lib/traverse.mjs), so
// the snapshot is always complete. Output: w2w-backup-<timestamp>.json[.enc]
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { initDb, getProjectId } from './lib/admin.mjs'
import { dumpDatabase, countDocuments } from './lib/traverse.mjs'
import { encrypt } from './lib/crypto.mjs'

const args = process.argv.slice(2)
const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }

const outDir = getArg('--out') || 'backups'
const forcePlain = args.includes('--plain')
const passphrase = process.env.BACKUP_ENCRYPTION_PASSPHRASE || getArg('--passphrase') || ''

const db = initDb()
console.log(`Exporting Firestore project "${getProjectId() || 'unknown'}" (recursive)…`)

const collections = await dumpDatabase(db)
const totalDocs = countDocuments(collections)

const snapshot = {
  format: 'w2w-backup-v1',
  exportedAt: new Date().toISOString(),
  source: 'admin-sdk',
  projectId: getProjectId(),
  totalDocuments: totalDocs,
  collections,
}

const json = Buffer.from(JSON.stringify(snapshot), 'utf8')
mkdirSync(outDir, { recursive: true })
const stamp = snapshot.exportedAt.replace(/[:.]/g, '-')

let outPath
if (forcePlain || !passphrase) {
  outPath = resolve(outDir, `w2w-backup-${stamp}.json`)
  writeFileSync(outPath, json)
  if (!passphrase && !forcePlain) {
    console.warn('⚠  No BACKUP_ENCRYPTION_PASSPHRASE set — wrote PLAINTEXT. These are medical records; set a passphrase to encrypt.')
  }
} else {
  outPath = resolve(outDir, `w2w-backup-${stamp}.json.enc`)
  writeFileSync(outPath, encrypt(json, passphrase))
}

const summary = collections
  .map((c) => `${c.path}=${countDocuments([c])}`)
  .sort()
  .join('  ')
console.log(`✔  ${totalDocs} documents across ${collections.length} root collections.`)
console.log(`   ${summary}`)
console.log(`→  ${outPath}  (${(json.length / 1024).toFixed(1)} KB uncompressed)`)
