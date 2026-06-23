// Convert Firestore values <-> JSON-safe form, losslessly.
//
// Plain JSON can't represent Firestore's special types (Timestamp, GeoPoint,
// DocumentReference, Bytes), so we tag them with a `__t` marker on the way out
// and rebuild the real objects on the way back in. Everything else (strings,
// numbers, booleans, null, arrays, plain maps) passes through untouched.
//
// Collision note: if a document literally stored a map with a `__t` key equal to
// one of our markers, decode would misread it. No W2W document does this.
import { Timestamp, GeoPoint } from 'firebase-admin/firestore'

function isDocRef(v) {
  return v && typeof v === 'object'
    && typeof v.path === 'string' && typeof v.id === 'string'
    && typeof v.collection === 'function' && v.firestore !== undefined
}

export function encode(value) {
  if (value === null || value === undefined) return value
  if (value instanceof Timestamp) return { __t: 'timestamp', s: value.seconds, n: value.nanoseconds }
  if (value instanceof GeoPoint) return { __t: 'geopoint', lat: value.latitude, lng: value.longitude }
  if (Buffer.isBuffer(value)) return { __t: 'bytes', b64: value.toString('base64') }
  if (isDocRef(value)) return { __t: 'ref', path: value.path }
  if (Array.isArray(value)) return value.map(encode)
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = encode(v)
    return out
  }
  return value
}

// `db` (an Admin Firestore instance) is needed only to rebuild DocumentReferences.
export function decode(value, db) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map((v) => decode(v, db))
  if (typeof value === 'object') {
    switch (value.__t) {
      case 'timestamp': return new Timestamp(value.s, value.n)
      case 'geopoint': return new GeoPoint(value.lat, value.lng)
      case 'bytes': return Buffer.from(value.b64, 'base64')
      case 'ref': return db ? db.doc(value.path) : value.path
      default: {
        const out = {}
        for (const [k, v] of Object.entries(value)) out[k] = decode(v, db)
        return out
      }
    }
  }
  return value
}
