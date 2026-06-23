// Authenticated symmetric encryption for backup files, using only Node's
// built-in crypto (no extra dependency, runs anywhere — including GitHub
// Actions). The passphrase never leaves your secrets; the key is derived per
// file with a random salt (scrypt), and AES-256-GCM provides tamper detection.
//
// File layout:  MAGIC(7) | salt(16) | iv(12) | authTag(16) | ciphertext
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto'

const MAGIC = 'W2WENC1'
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16
const KDF = { N: 16384, r: 8, p: 1 } // scrypt cost params

function deriveKey(passphrase, salt) {
  return scryptSync(String(passphrase), salt, 32, KDF)
}

export function isEncrypted(buf) {
  return Buffer.isBuffer(buf) && buf.length >= MAGIC.length
    && buf.subarray(0, MAGIC.length).toString('latin1') === MAGIC
}

export function encrypt(plaintext, passphrase) {
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = deriveKey(passphrase, salt)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([Buffer.from(MAGIC, 'latin1'), salt, iv, tag, enc])
}

export function decrypt(buf, passphrase) {
  if (!isEncrypted(buf)) throw new Error('Not a W2W-encrypted backup (bad header).')
  let o = MAGIC.length
  const salt = buf.subarray(o, (o += SALT_LEN))
  const iv = buf.subarray(o, (o += IV_LEN))
  const tag = buf.subarray(o, (o += TAG_LEN))
  const enc = buf.subarray(o)
  const key = deriveKey(passphrase, salt)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  try {
    return Buffer.concat([decipher.update(enc), decipher.final()])
  } catch {
    throw new Error('Decryption failed — wrong passphrase or the file is corrupted.')
  }
}
