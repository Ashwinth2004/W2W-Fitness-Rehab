// ============================================================================
//  Firestore data access layer for W2W.
//  Collections:
//    enquiries      — contact-form messages
//    appointments   — booked sessions (from web or admin)
//    availability   — { times: [...] } booked slots per date (no PII, public)
//    clients        — patient/client CRM profiles (unique IDs W2W-0001…)
//        clients/{id}/notes     — dated report / visit notes (old reports too)
//        clients/{id}/progress  — pain / ROM / weight measurements over time
//    counters/clients — { seq } running number for unique client IDs
//    testimonials   — reviews shown on the site
//    posts          — blog articles
// ============================================================================
import { db } from '../firebase'
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, runTransaction, onSnapshot,
} from 'firebase/firestore'

// ---------- Enquiries -------------------------------------------------------
export async function createEnquiry(data) {
  return addDoc(collection(db, 'enquiries'), {
    ...data,
    status: 'new',
    createdAt: serverTimestamp(),
  })
}

export function watchEnquiries(cb) {
  const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function setEnquiryStatus(id, status) {
  return updateDoc(doc(db, 'enquiries', id), { status })
}

export async function deleteEnquiry(id) {
  return deleteDoc(doc(db, 'enquiries', id))
}

// ---------- Availability + Appointments ------------------------------------
export async function getBookedTimes(date) {
  const snap = await getDoc(doc(db, 'availability', date))
  return snap.exists() ? snap.data().times || [] : []
}

export function watchBookedTimes(date, cb) {
  return onSnapshot(
    doc(db, 'availability', date),
    (snap) => cb(snap.exists() ? snap.data().times || [] : []),
    (err) => {
      // Don't hang the UI if the read is denied (e.g. rules not published yet).
      console.warn('availability read failed:', err?.code || err)
      cb([])
    }
  )
}

/**
 * Books a slot atomically (instant auto-confirm). Throws 'SLOT_TAKEN' if the
 * time was grabbed by someone else first.
 */
export async function bookAppointment({ date, time, ...rest }) {
  const availRef = doc(db, 'availability', date)
  const apptRef = doc(collection(db, 'appointments'))
  await runTransaction(db, async (tx) => {
    const availSnap = await tx.get(availRef)
    const times = availSnap.exists() ? availSnap.data().times || [] : []
    if (times.includes(time)) throw new Error('SLOT_TAKEN')
    tx.set(availRef, { times: [...times, time] }, { merge: true })
    tx.set(apptRef, {
      date, time, ...rest,
      status: 'confirmed',
      createdAt: serverTimestamp(),
    })
  })
  return apptRef.id
}

export function watchAppointments(cb) {
  const q = query(collection(db, 'appointments'), orderBy('date', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getAppointmentsInRange(startDate, endDate) {
  const q = query(
    collection(db, 'appointments'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addAppointmentByAdmin(data) {
  // Admin-created appointment; still reserves the slot.
  return bookAppointment({ ...data, source: 'admin' })
}

export async function setAppointmentStatus(id, status) {
  return updateDoc(doc(db, 'appointments', id), { status })
}

export async function freeSlot(date, time) {
  const ref = doc(db, 'availability', date)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const times = (snap.data().times || []).filter((t) => t !== time)
  await setDoc(ref, { times }, { merge: true })
}

export async function cancelAppointment(appt) {
  await setAppointmentStatus(appt.id, 'cancelled')
  await freeSlot(appt.date, appt.time)
}

// ---------- Clients (CRM) ---------------------------------------------------
async function nextClientId() {
  const ref = doc(db, 'counters', 'clients')
  let seq = 1
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    seq = (snap.exists() ? snap.data().seq || 0 : 0) + 1
    tx.set(ref, { seq }, { merge: true })
  })
  return `W2W-${String(seq).padStart(4, '0')}`
}

export async function createClient(data) {
  const clientId = await nextClientId()
  const ref = await addDoc(collection(db, 'clients'), {
    ...data,
    clientId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: ref.id, clientId }
}

export function watchClients(cb) {
  const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getClient(id) {
  const snap = await getDoc(doc(db, 'clients', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/** Look up a client by their human-readable clientId (e.g. W2W-0007). */
export async function findClientByClientId(clientId) {
  const q = query(collection(db, 'clients'), where('clientId', '==', clientId.toUpperCase().trim()))
  const snap = await getDocs(q)
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export async function updateClient(id, data) {
  return updateDoc(doc(db, 'clients', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteClient(id) {
  return deleteDoc(doc(db, 'clients', id))
}

// Notes (dated report / visit text — also used for previous/old reports)
export async function addClientNote(clientId, note) {
  return addDoc(collection(db, 'clients', clientId, 'notes'), {
    ...note,
    createdAt: serverTimestamp(),
  })
}

export function watchClientNotes(clientId, cb) {
  const q = query(collection(db, 'clients', clientId, 'notes'), orderBy('date', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function deleteClientNote(clientId, noteId) {
  return deleteDoc(doc(db, 'clients', clientId, 'notes', noteId))
}

// Progress measurements (pain / ROM / weight over time)
export async function addProgress(clientId, entry) {
  return addDoc(collection(db, 'clients', clientId, 'progress'), {
    ...entry,
    createdAt: serverTimestamp(),
  })
}

export function watchProgress(clientId, cb) {
  const q = query(collection(db, 'clients', clientId, 'progress'), orderBy('date', 'asc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function deleteProgress(clientId, entryId) {
  return deleteDoc(doc(db, 'clients', clientId, 'progress', entryId))
}

export async function getClientNotesOnce(clientId) {
  const snap = await getDocs(query(collection(db, 'clients', clientId, 'notes'), orderBy('date', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getClientProgressOnce(clientId) {
  const snap = await getDocs(query(collection(db, 'clients', clientId, 'progress'), orderBy('date', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ---------- Testimonials ----------------------------------------------------
export function watchTestimonials(cb, approvedOnly = false) {
  const base = collection(db, 'testimonials')
  const q = approvedOnly
    ? query(base, where('approved', '==', true), orderBy('createdAt', 'desc'))
    : query(base, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getApprovedTestimonials() {
  const snap = await getDocs(query(collection(db, 'testimonials'), where('approved', '==', true)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createTestimonial(data) {
  return addDoc(collection(db, 'testimonials'), { ...data, createdAt: serverTimestamp() })
}

export async function setTestimonialApproved(id, approved) {
  return updateDoc(doc(db, 'testimonials', id), { approved })
}

export async function deleteTestimonial(id) {
  return deleteDoc(doc(db, 'testimonials', id))
}

// ---------- Blog posts ------------------------------------------------------
export function watchPosts(cb, publishedOnly = false) {
  const base = collection(db, 'posts')
  const q = publishedOnly
    ? query(base, where('published', '==', true), orderBy('createdAt', 'desc'))
    : query(base, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getPublishedPosts() {
  const snap = await getDocs(query(collection(db, 'posts'), where('published', '==', true)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getPostBySlug(slug) {
  const snap = await getDocs(query(collection(db, 'posts'), where('slug', '==', slug)))
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export async function createPost(data) {
  return addDoc(collection(db, 'posts'), { ...data, createdAt: serverTimestamp() })
}

export async function updatePost(id, data) {
  return updateDoc(doc(db, 'posts', id), data)
}

export async function deletePost(id) {
  return deleteDoc(doc(db, 'posts', id))
}
