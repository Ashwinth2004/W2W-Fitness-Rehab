# W2W Data Backup & Restore

This project stores everything (patients, **clinical treatment records**, appointments,
accounts, workshops) in **Firebase Firestore**. On the free (Spark) plan Firestore has
**no built-in backup**, so we run our own — **free, automatic, encrypted, versioned,
off-site, and restorable**.

## The three layers

| Layer | What it is | Where it lives |
| --- | --- | --- |
| **1. Automated** | Daily full export → encrypted snapshot, committed to a private repo (versioned) | **Separate private repo: [`anandsundaramoorthysa/w2w-data-backups`](https://github.com/anandsundaramoorthysa/w2w-data-backups)** |
| **2. Manual** | "Export backup" button → downloads a full JSON snapshot to your machine | This repo — [`src/lib/backupExport.js`](src/lib/backupExport.js), shown on the admin Dashboard (full admin only) |
| **3. Restore** | Load any snapshot back into Firestore | [`scripts/restore.mjs`](scripts/restore.mjs) here, and the same tooling in the backups repo |

**Why a separate repo for Layer 1?** The automated job needs GitHub Actions *secrets*, and
adding those requires **admin** on the repo. This app repo is owned by `Ashwinth2004`, so the
daily backup runs from a private repo you own (`anandsundaramoorthysa/w2w-data-backups`) where
you're admin. It's also cleaner: medical-record snapshots stay isolated from the app code.

**Completeness:** the exporter uses the Admin SDK to *discover* collections
(`listCollections`) and recurse into subcollections (`clients/{id}/treatments`), so every
collection — now or added later — is captured automatically. Snapshots use one format
(`w2w-backup-v1`), so `restore.mjs` can restore a file from either layer.

---

## Layer 1 — automated daily backup
Lives in the private **[`w2w-data-backups`](https://github.com/anandsundaramoorthysa/w2w-data-backups)**
repo. Setup is two secrets (`FIREBASE_SERVICE_ACCOUNT`, `BACKUP_ENCRYPTION_PASSPHRASE`) — see
that repo's `README.md`. It runs daily at 02:00 IST and commits each encrypted snapshot to its
`backups/` folder.

## Layer 2 — one-click manual export
The **"Export backup"** card on the admin **Dashboard** (full admin only) downloads a complete
JSON snapshot to your device on demand — use it right before a risky bulk edit. No setup.

## Layer 3 — restore
> Restore **writes/overwrites** documents at their original paths; it never deletes anything
> not in the backup. Always `--dry-run` first, ideally against a scratch project the first time.

```bash
cd scripts
npm install
export FIREBASE_SERVICE_ACCOUNT="$(cat /path/to/serviceAccount.json)"
export BACKUP_ENCRYPTION_PASSPHRASE="your-passphrase"   # only needed for encrypted .json.enc files

node restore.mjs /path/to/backup.json.enc --dry-run                 # preview, writes nothing
node restore.mjs /path/to/backup.json.enc --collections clients     # restore one collection
node restore.mjs /path/to/backup.json.enc                           # full restore (type RESTORE to confirm)
```

A plain `.json` file from the in-app **Export backup** button restores the same way (no
passphrase needed).

---

## FAQ
- **Cost?** $0. Private repos are free; the daily job uses a tiny slice of GitHub's free Action
  minutes; a full export is a few thousand Firestore reads, far under the free 50,000/day.
- **Safe if a repo leaks?** Yes — snapshots are AES‑256‑GCM encrypted; useless without the
  passphrase. (Keep the backups repo private anyway.)
- **Lost passphrase?** Encrypted backups become unrecoverable. Store it in a password manager.
- **Added a new collection?** Layer 1 picks it up automatically. For the in-app button (Layer 2),
  add its name to `ROOT_COLLECTIONS` in `src/lib/backupExport.js`.
