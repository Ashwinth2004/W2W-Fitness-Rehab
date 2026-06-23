// Initialize the Firebase Admin SDK from a service-account key. The Admin SDK
// authenticates as a service account, so it can read/write the WHOLE database
// regardless of security rules — which is exactly what a complete backup needs.
//
// Credentials are looked up in this order:
//   1. FIREBASE_SERVICE_ACCOUNT  — the key JSON inline (used by GitHub Actions)
//   2. GOOGLE_APPLICATION_CREDENTIALS — path to a key file
//   3. ./serviceAccount.json     — a local key file next to the scripts
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
let _projectId = ''

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    resolve(HERE, '..', 'serviceAccount.json'),
  ].filter(Boolean)
  for (const f of candidates) {
    if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  }
  throw new Error(
    'No service-account credentials found. Set FIREBASE_SERVICE_ACCOUNT (inline JSON), '
    + 'or GOOGLE_APPLICATION_CREDENTIALS (file path), or place scripts/serviceAccount.json.'
  )
}

export function initDb() {
  if (!getApps().length) {
    const sa = loadServiceAccount()
    _projectId = sa.project_id || ''
    initializeApp({ credential: cert(sa) })
  }
  return getFirestore()
}

export function getProjectId() {
  return _projectId || process.env.GOOGLE_CLOUD_PROJECT || ''
}
