// Recursively walk the entire Firestore database.
//
// The key to "back up ALL data" is discovery, not a hardcoded list:
//   db.listCollections()          -> every top-level collection
//   docSnap.ref.listCollections() -> every subcollection under each document
// so nested data (e.g. clients/{id}/treatments) and any collection added in the
// future is captured automatically — nothing is ever forgotten.
import { encode } from './serialize.mjs'

// Dump one collection (and everything beneath it) into a plain tree:
//   { path: <collectionId>, count, documents: [ { id, data, collections: [...] } ] }
export async function dumpCollection(colRef) {
  const snap = await colRef.get()
  const documents = []
  for (const docSnap of snap.docs) {
    const subRefs = await docSnap.ref.listCollections()
    const collections = []
    for (const sub of subRefs) collections.push(await dumpCollection(sub))
    documents.push({ id: docSnap.id, data: encode(docSnap.data()), collections })
  }
  return { path: colRef.id, count: documents.length, documents }
}

export async function dumpDatabase(db) {
  const roots = await db.listCollections()
  const collections = []
  for (const col of roots) collections.push(await dumpCollection(col))
  return collections
}

// Total document count (including all nested subcollections).
export function countDocuments(collections) {
  let n = 0
  const walk = (c) => {
    n += c.documents.length
    for (const d of c.documents) for (const sub of d.collections) walk(sub)
  }
  collections.forEach(walk)
  return n
}
