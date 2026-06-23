# W2W Data Backup & Restore

This project stores everything (patients, **clinical treatment records**, appointments,
accounts, workshops) in **Firebase Firestore**. On the free (Spark) plan Firestore has
**no built-in backup**, so we run our own. It's **free, automatic, encrypted, versioned,
off-site, and restorable**.

## The three layers

| Layer | What it is | Runs | Where it lives |
| --- | --- | --- | --- |
| **1. Automated** | Daily full export → encrypted snapshot pushed to a private repo | GitHub Actions cron (02:00 IST) | [`.github/workflows/backup.yml`](.github/workflows/backup.yml) + [`scripts/`](scripts/) |
| **2. Manual** | "Export backup" button → downloads a full JSON snapshot | When you click it (Dashboard) | [`src/lib/backupExport.js`](src/lib/backupExport.js) |
| **3. Restore** | Load any snapshot back into Firestore | When you need it | [`scripts/restore.mjs`](scripts/restore.mjs) |

**Completeness:** Layer 1 uses the Admin SDK to *discover* collections (`listCollections`),
so it walks the **entire** database recursively — every collection, every subcollection
(`clients/{id}/treatments`), and anything added in the future — automatically. It is the
authoritative copy. Layer 2 (browser) reads from a known list and is a convenient on-demand
extra.

All snapshots share one format (`w2w-backup-v1`), so `restore.mjs` can restore a file from
either layer.

---

## One-time setup (Layer 1 — automated)

You'll do this once. It stays free forever (uses ~30 of GitHub's 2,000 free Action-minutes/month).

### 1. Create a Firebase service-account key
Firebase Console → ⚙ **Project settings** → **Service accounts** → **Generate new private key**.
A JSON file downloads. **Treat it like a password** — it grants full database access.
(Never commit it; `.gitignore` already blocks `*serviceAccount*.json`.)

### 2. Create a private backups repo
On GitHub, create a **new private repository**, e.g. `w2w-data-backups`. This keeps medical
data isolated from the app's code repo. (It can be empty.)

### 3. Create a token that can write to it
GitHub → **Settings → Developer settings → Fine-grained personal access tokens** → generate one:
- **Repository access:** only the `w2w-data-backups` repo.
- **Permissions:** **Contents → Read and write**.
Copy the token.

### 4. Add the secrets to *this* repo
In **this** repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret name | Value |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | the **entire contents** of the service-account JSON from step 1 |
| `BACKUP_ENCRYPTION_PASSPHRASE` | a long passphrase you choose — **store it safely**, you need it to restore |
| `BACKUP_REPO` | `your-username/w2w-data-backups` |
| `BACKUP_REPO_TOKEN` | the token from step 3 |

> ⚠️ If you lose `BACKUP_ENCRYPTION_PASSPHRASE`, the encrypted backups **cannot** be
> decrypted. Save it in a password manager.

### 5. Test it
This repo → **Actions → "Firestore daily backup" → Run workflow**. After ~1 minute a new
`backups/w2w-backup-….json.enc` file appears in your `w2w-data-backups` repo. After that it
runs automatically every day. Each day is a separate file **and** a git commit, so you can
recover the state from any past day.

---

## Restoring (Layer 3)

> Restore **writes/overwrites** documents at their original paths. It does **not** delete
> anything that isn't in the backup. Test against a scratch Firebase project the first time.

```bash
cd scripts
npm install

# Provide credentials + passphrase (same as the secrets above):
export FIREBASE_SERVICE_ACCOUNT="$(cat /path/to/serviceAccount.json)"
export BACKUP_ENCRYPTION_PASSPHRASE="your-passphrase"
# (or drop the key file at scripts/serviceAccount.json instead of the env var)

# 1) See what WOULD happen — writes nothing:
node restore.mjs /path/to/w2w-backup-….json.enc --dry-run

# 2) Restore only a collection that got damaged (e.g. clients + their treatments):
node restore.mjs /path/to/backup.json.enc --collections clients

# 3) Full restore (asks you to type RESTORE to confirm):
node restore.mjs /path/to/backup.json.enc
```

A plain `.json` file from the **"Export backup"** button restores the same way (no passphrase
needed for unencrypted files).

---

## Running a backup manually from your computer

```bash
cd scripts
npm install
export BACKUP_ENCRYPTION_PASSPHRASE="your-passphrase"   # optional but recommended
# credentials via scripts/serviceAccount.json or FIREBASE_SERVICE_ACCOUNT
node backup.mjs                 # writes scripts/backups/w2w-backup-….json.enc
```

---

## FAQ

- **Does any of this cost money?** No. Private repos are free; the daily job uses a tiny slice
  of GitHub's free Action minutes; a full export is a few thousand Firestore reads, far under
  the free **50,000 reads/day**.
- **Are the backups safe if the repo leaks?** Yes — they're AES‑256‑GCM encrypted; without the
  passphrase they're unreadable. (Still keep the repo private.)
- **How far back can I go?** Every daily snapshot is kept (separate file + git history), so any
  past day is recoverable. Prune old files anytime if you wish.
- **I added a new collection — anything to do?** Layer 1 picks it up automatically. For the
  in-app button (Layer 2), add its name to `ROOT_COLLECTIONS` in `src/lib/backupExport.js`.

## Alternative: store backups in this same repo
Prefer not to manage a second repo + token? You can instead commit snapshots to an orphan
`db-backups` branch of this repo (only `FIREBASE_SERVICE_ACCOUNT` and
`BACKUP_ENCRYPTION_PASSPHRASE` needed). Ask and the workflow can be switched to that mode —
the separate private repo is recommended for cleaner isolation of medical data.
