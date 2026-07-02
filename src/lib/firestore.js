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
  query, where, orderBy, serverTimestamp, runTransaction, onSnapshot, writeBatch, deleteField,
} from 'firebase/firestore'
import { SLOT_TIMES } from './constants'

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
// Each 30-minute time slot allows only ONE appointment. The
// `availability/{date}.times` list holds one entry per booking; a slot is
// "unavailable" once it has been booked.
const SLOT_LIMIT = 1

function fullTimes(times) {
  const counts = {}
  for (const t of times) counts[t] = (counts[t] || 0) + 1
  return Object.keys(counts).filter((t) => counts[t] >= SLOT_LIMIT)
}

function removeOne(arr, val) {
  const i = arr.indexOf(val)
  return i === -1 ? arr : [...arr.slice(0, i), ...arr.slice(i + 1)]
}

export async function getBookedTimes(date) {
  const snap = await getDoc(doc(db, 'availability', date))
  return snap.exists() ? fullTimes(snap.data().times || []) : []
}

export function watchBookedTimes(date, cb) {
  return onSnapshot(
    doc(db, 'availability', date),
    (snap) => cb(snap.exists() ? fullTimes(snap.data().times || []) : []),
    (err) => {
      // Don't hang the UI if the read is denied (e.g. rules not published yet).
      console.warn('availability read failed:', err?.code || err)
      cb([])
    }
  )
}

// Admin "time off" blocks live in their OWN collection (slotBlocks/{date} =
// { times: [...] }), NOT inside availability/{date}. Keeping availability to a
// single `times` key is what lets a public booking write pass the security
// rule — mixing a `blocked` field in there is exactly what broke booking.
//
// Live { booked, blocked } for one date (used by the slot picker). Combines the
// two docs; either read failing (e.g. rules not yet published) just yields [].
export function watchDayAvailability(date, cb) {
  let booked = []
  let blocked = []
  const emit = () => cb({ booked, blocked })
  const u1 = onSnapshot(
    doc(db, 'availability', date),
    (s) => { booked = s.exists() ? fullTimes(s.data().times || []) : []; emit() },
    (err) => { console.warn('availability read failed:', err?.code || err); booked = []; emit() }
  )
  const u2 = onSnapshot(
    doc(db, 'slotBlocks', date),
    (s) => { blocked = s.exists() ? (s.data().times || []) : []; emit() },
    (err) => { console.warn('slotBlocks read failed:', err?.code || err); blocked = []; emit() }
  )
  return () => { u1(); u2() }
}

// All dates that currently have blocked slots (admin overview).
export function watchBlockedDays(cb) {
  return onSnapshot(
    collection(db, 'slotBlocks'),
    (snap) => {
      const days = snap.docs
        .map((d) => ({ date: d.id, blocked: d.data().times || [] }))
        .filter((d) => d.blocked.length > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
      cb(days)
    },
    (err) => { console.warn('slotBlocks list failed:', err?.code || err); cb([]) }
  )
}

// Mark slots as unavailable ("time off") across one or more dates in a single
// action. Empty/omitted `times` blocks the WHOLE day (all slots).
export async function blockSlots(dates, times) {
  const list = Array.isArray(dates) ? dates : [dates]
  const slots = times && times.length ? times : SLOT_TIMES
  const batch = writeBatch(db)
  for (const date of list) {
    const ref = doc(db, 'slotBlocks', date)
    const snap = await getDoc(ref)
    const prev = snap.exists() ? snap.data().times || [] : []
    batch.set(ref, { times: Array.from(new Set([...prev, ...slots])) }, { merge: true })
  }
  await batch.commit()
}

// Re-open (un-block) slots across dates. Empty `times` re-opens the whole day.
export async function unblockSlots(dates, times) {
  const list = Array.isArray(dates) ? dates : [dates]
  const batch = writeBatch(db)
  for (const date of list) {
    const ref = doc(db, 'slotBlocks', date)
    const snap = await getDoc(ref)
    if (!snap.exists()) continue
    const prev = snap.data().times || []
    const next = times && times.length ? prev.filter((t) => !times.includes(t)) : []
    if (next.length) batch.set(ref, { times: next }, { merge: true })
    else batch.delete(ref)
  }
  await batch.commit()
}

// One-time cleanup: earlier builds stored admin blocks as a `blocked` field
// INSIDE availability/{date}, which broke public booking (the availability
// write rule only permits a `times` key). Move any such blocks to slotBlocks
// and strip the field so those dates can be booked again. Admin-only; safe to
// run on every Appointments mount — it only touches docs that still carry it.
export async function migrateLegacyBlocks() {
  try {
    const snap = await getDocs(collection(db, 'availability'))
    for (const d of snap.docs) {
      const data = d.data()
      if (!('blocked' in data)) continue
      const blocked = data.blocked || []
      if (blocked.length) { try { await setDoc(doc(db, 'slotBlocks', d.id), { times: blocked }, { merge: true }) } catch (_) {} }
      try { await updateDoc(doc(db, 'availability', d.id), { blocked: deleteField() }) } catch (_) {}
    }
  } catch (_) { /* ignore — best effort */ }
}

/**
 * Books a slot atomically (instant auto-confirm). Throws 'SLOT_TAKEN' if the
 * time was grabbed by someone else first.
 */
export async function bookAppointment({ date, time, ...rest }) {
  // Reject admin-blocked slots (admins may override). Best-effort: a read error
  // (e.g. the slotBlocks rule isn't published yet) must NEVER block a real
  // booking — the transaction below only ever writes the `times` list.
  if (rest.source !== 'admin') {
    try {
      const blk = await getDoc(doc(db, 'slotBlocks', date))
      if (blk.exists() && (blk.data().times || []).includes(time)) throw new Error('SLOT_BLOCKED')
    } catch (e) {
      if (e.message === 'SLOT_BLOCKED') throw e
    }
  }
  const availRef = doc(db, 'availability', date)
  const apptRef = doc(collection(db, 'appointments'))
  await runTransaction(db, async (tx) => {
    const availSnap = await tx.get(availRef)
    const times = availSnap.exists() ? availSnap.data().times || [] : []
    if (times.filter((t) => t === time).length >= SLOT_LIMIT) throw new Error('SLOT_TAKEN')
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
  // Free a single booking of this slot (other patient in the slot keeps theirs).
  const times = removeOne(snap.data().times || [], time)
  await setDoc(ref, { times }, { merge: true })
}

export async function cancelAppointment(appt) {
  await setAppointmentStatus(appt.id, 'cancelled')
  await freeSlot(appt.date, appt.time)
}

// Permanently remove an appointment (won't appear in reports). Frees its slot
// first (unless it was already cancelled, which freed it).
export async function deleteAppointment(appt) {
  if (appt.status !== 'cancelled') { try { await freeSlot(appt.date, appt.time) } catch (_) {} }
  return deleteDoc(doc(db, 'appointments', appt.id))
}

// Admin free-text remarks/notes on an appointment.
export async function setAppointmentRemarks(id, remarks) {
  return updateDoc(doc(db, 'appointments', id), { remarks })
}

// Edit an appointment's entered details (name, phone, email, service…).
export async function updateAppointment(id, data) {
  return updateDoc(doc(db, 'appointments', id), data)
}

/**
 * Move an appointment to a new date/time. Frees the old slot and reserves the
 * new one. Admin override: the new slot is allowed even if already booked
 * (two clients can share a slot when the admin chooses to).
 */
export async function rescheduleAppointment(appt, newDate, newTime) {
  const oldRef = doc(db, 'availability', appt.date)
  const newRef = doc(db, 'availability', newDate)
  const apptRef = doc(db, 'appointments', appt.id)
  const sameDate = appt.date === newDate
  await runTransaction(db, async (tx) => {
    const oldSnap = await tx.get(oldRef)
    const newSnap = sameDate ? oldSnap : await tx.get(newRef)
    const oldTimes = removeOne(oldSnap.exists() ? oldSnap.data().times || [] : [], appt.time)
    if (sameDate) {
      // Admin override — place the client in the new slot even if it's full.
      tx.set(oldRef, { times: [...oldTimes, newTime] }, { merge: true })
    } else {
      tx.set(oldRef, { times: oldTimes }, { merge: true })
      const base = newSnap.exists() ? newSnap.data().times || [] : []
      tx.set(newRef, { times: [...base, newTime] }, { merge: true })
    }
    tx.update(apptRef, { date: newDate, time: newTime, status: 'confirmed' })
  })
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

// `customClientId` (optional) lets the admin set the Reg. No manually; otherwise
// it auto-generates the next W2W-#### in sequence.
export async function createClient(data, customClientId = '') {
  const clientId = (customClientId || '').trim().toUpperCase() || await nextClientId()
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

// ---------- Video testimonials (Instagram reels) ---------------------------
export function watchReels(cb) {
  const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getReels() {
  const snap = await getDocs(query(collection(db, 'reels'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createReel(data) {
  return addDoc(collection(db, 'reels'), { ...data, createdAt: serverTimestamp() })
}

export async function deleteReel(id) {
  return deleteDoc(doc(db, 'reels', id))
}

// ---------- Workshops -------------------------------------------------------
// A workshop doc holds public info (title, fee, slots, date, venue, status…).
// status: 'draft' (hidden) | 'open' (registrations open) | 'closed'.
export function watchWorkshops(cb) {
  const q = query(collection(db, 'workshops'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

// Public: the workshop currently open for registration (latest one).
export async function getOpenWorkshop() {
  const snap = await getDocs(
    query(collection(db, 'workshops'), where('status', '==', 'open'))
  )
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
  return list[0] || null
}

// Public live status (does an open workshop exist?) for the announcement bar.
export function watchOpenWorkshop(cb) {
  const q = query(collection(db, 'workshops'), where('status', '==', 'open'))
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      cb(list[0] || null)
    },
    (err) => {
      console.warn('open workshop read failed:', err?.code || err)
      cb(null)
    }
  )
}

export async function createWorkshop(data) {
  return addDoc(collection(db, 'workshops'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateWorkshop(id, data) {
  return updateDoc(doc(db, 'workshops', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteWorkshop(id) {
  await deleteDoc(doc(db, 'workshops', id))
  // best-effort: clear its public seat counter too
  try { await deleteDoc(doc(db, 'workshopStats', id)) } catch (_) {}
}

// Public seat counter (no PII) — number of admin-CONFIRMED seats, so the site
// can show how many are left and auto-close when full.
export function watchWorkshopSeats(workshopId, cb) {
  return onSnapshot(
    doc(db, 'workshopStats', workshopId),
    (snap) => cb(snap.exists() ? (snap.data().confirmed ?? snap.data().count ?? 0) : 0),
    () => cb(0)
  )
}

// ---------- Workshop registrations -----------------------------------------
// Public create — the registration is PENDING (the student has paid via UPI and
// must message the admin). A seat is only consumed once the admin APPROVES, so
// there is no public counter write here. Reads are admin-only (PII).
export async function registerForWorkshop(workshop, data) {
  const payload = {
    ...data,
    workshopId: workshop.id,
    workshopTitle: workshop.title,
    status: 'pending',
    createdAt: serverTimestamp(),
  }
  // One registration per phone AND per email, per workshop. We write atomically:
  //   • the registration at a deterministic id `{workshopId}__{phone}`, and
  //   • an empty "email guard" at `workshopRegEmails/{workshopId}__{email}`.
  // Both collections allow public CREATE but not UPDATE (rules), so a repeat with
  // the same phone OR the same email targets an existing doc → a denied update →
  // the whole batch fails. We surface that as DUPLICATE for a friendly message.
  const phone = String(data.phone || '').replace(/\D/g, '')
  const email = String(data.email || '').toLowerCase().trim().replace(/\//g, '_')

  const batch = writeBatch(db)
  const regRef = phone
    ? doc(db, 'workshopRegistrations', `${workshop.id}__${phone}`)
    : doc(collection(db, 'workshopRegistrations'))
  batch.set(regRef, payload)
  if (email) batch.set(doc(db, 'workshopRegEmails', `${workshop.id}__${email}`), {})

  try {
    await batch.commit()
  } catch (err) {
    if (err?.code === 'permission-denied') throw new Error('DUPLICATE')
    throw err
  }
  return regRef.id
}

export function watchWorkshopRegistrations(cb) {
  const q = query(collection(db, 'workshopRegistrations'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

// Admin edit of a registration's entered details (name, phone, email, qualification…).
export async function updateRegistration(id, data) {
  return updateDoc(doc(db, 'workshopRegistrations', id), data)
}

// Admin-added registration (manual entry). Reuses the per-phone/email dedup.
export async function addRegistrationByAdmin(workshop, data) {
  return registerForWorkshop(workshop, { ...data, available: true, markedPaid: data.markedPaid ?? true })
}

export async function getWorkshopRegistrationsOnce() {
  const snap = await getDocs(query(collection(db, 'workshopRegistrations'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Admin approves a paid registration → confirmed (books a seat: +1 confirmed).
export async function approveRegistration(reg) {
  if (reg.status === 'confirmed') return
  const statsRef = doc(db, 'workshopStats', reg.workshopId)
  const regRef = doc(db, 'workshopRegistrations', reg.id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(statsRef)
    const confirmed = snap.exists() ? snap.data().confirmed || 0 : 0
    tx.set(statsRef, { confirmed: confirmed + 1, workshopId: reg.workshopId }, { merge: true })
    tx.update(regRef, { status: 'confirmed' })
  })
}

// Admin reverts a confirmed registration back to pending → frees the seat.
export async function unapproveRegistration(reg) {
  const regRef = doc(db, 'workshopRegistrations', reg.id)
  if (reg.status !== 'confirmed') return updateDoc(regRef, { status: 'pending' })
  const statsRef = doc(db, 'workshopStats', reg.workshopId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(statsRef)
    const confirmed = snap.exists() ? snap.data().confirmed || 0 : 0
    tx.set(statsRef, { confirmed: Math.max(0, confirmed - 1), workshopId: reg.workshopId }, { merge: true })
    tx.update(regRef, { status: 'pending' })
  })
}

// Accepts a registration object (preferred — adjusts the seat count if it was
// confirmed) or a bare id.
export async function deleteRegistration(reg) {
  if (typeof reg === 'string') return deleteDoc(doc(db, 'workshopRegistrations', reg))
  if (reg.status === 'confirmed') {
    const statsRef = doc(db, 'workshopStats', reg.workshopId)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(statsRef)
      const confirmed = snap.exists() ? snap.data().confirmed || 0 : 0
      tx.set(statsRef, { confirmed: Math.max(0, confirmed - 1) }, { merge: true })
      tx.delete(doc(db, 'workshopRegistrations', reg.id))
    })
    return
  }
  return deleteDoc(doc(db, 'workshopRegistrations', reg.id))
}

// ---------- Therapists ------------------------------------------------------
// The physiotherapists who deliver treatment (selected on the patient report).
export function watchTherapists(cb) {
  const q = query(collection(db, 'therapists'), orderBy('name'))
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  )
}

export async function createTherapist(name) {
  return addDoc(collection(db, 'therapists'), { name: name.trim(), createdAt: serverTimestamp() })
}

export async function updateTherapist(id, name) {
  return updateDoc(doc(db, 'therapists', id), { name: name.trim() })
}

export async function deleteTherapist(id) {
  return deleteDoc(doc(db, 'therapists', id))
}

// ---------- Accounting: patient charges (income) ---------------------------
// One entry per billed report: { date, clientId, clientName, service,
// therapist, amount, paid, balance, mode, note }. `date` is 'yyyy-MM-dd'.
export async function addAccountingEntry(data) {
  return addDoc(collection(db, 'accounting'), {
    ...data,
    type: 'income',
    createdAt: serverTimestamp(),
  })
}

export function watchAccounting(cb) {
  const q = query(collection(db, 'accounting'), orderBy('date', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getAccountingInRange(start, end) {
  const q = query(
    collection(db, 'accounting'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updateAccountingEntry(id, data) {
  return updateDoc(doc(db, 'accounting', id), data)
}

export async function deleteAccountingEntry(id) {
  return deleteDoc(doc(db, 'accounting', id))
}

// ---------- Accounting: expenses (submodule) -------------------------------
// Admin-defined: { date, name (salary/rent/eb…), amount, note }.
export async function addExpense(data) {
  return addDoc(collection(db, 'expenses'), { ...data, createdAt: serverTimestamp() })
}

export function watchExpenses(cb) {
  const q = query(collection(db, 'expenses'), orderBy('date', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getExpensesInRange(start, end) {
  const q = query(
    collection(db, 'expenses'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updateExpense(id, data) {
  return updateDoc(doc(db, 'expenses', id), data)
}

export async function deleteExpense(id) {
  return deleteDoc(doc(db, 'expenses', id))
}

// Reusable expense names for the dropdown (admin adds new ones on the fly).
export function watchExpenseCategories(cb) {
  const q = query(collection(db, 'expenseCategories'), orderBy('name'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]))
}

export async function addExpenseCategory(name) {
  return addDoc(collection(db, 'expenseCategories'), { name: name.trim(), createdAt: serverTimestamp() })
}

export async function updateExpenseCategory(id, name) {
  return updateDoc(doc(db, 'expenseCategories', id), { name: name.trim() })
}

export async function deleteExpenseCategory(id) {
  return deleteDoc(doc(db, 'expenseCategories', id))
}

export async function getExpenseCategoriesOnce() {
  const snap = await getDocs(query(collection(db, 'expenseCategories'), orderBy('name')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ---------- Patient signatures ---------------------------------------------
// One per client at signatures/{clientId}; the drawn image is stored as a PNG
// data URL. Reflected on the "Patient's signature" line of that client's reports.
export function watchSignatures(cb) {
  return onSnapshot(collection(db, 'signatures'), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]))
}

export async function getSignatureOnce(clientId) {
  const snap = await getDoc(doc(db, 'signatures', clientId))
  return snap.exists() ? snap.data() : null
}

export async function saveSignature(clientId, clientName, dataUrl, updatedBy = '') {
  return setDoc(doc(db, 'signatures', clientId), {
    clientId, clientName: clientName || '', dataUrl, updatedBy, updatedAt: serverTimestamp(),
  })
}

export async function deleteSignature(clientId) {
  return deleteDoc(doc(db, 'signatures', clientId))
}

// ---------- Treatments (per-visit clinical assessments) --------------------
// Stored under clients/{id}/treatments — one record per session, holding the
// clinical fields + handling therapist + next-session date.
export async function addTreatment(clientId, data) {
  const ref = await addDoc(collection(db, 'clients', clientId, 'treatments'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  // Remember the latest handling therapist on the client (default for next time).
  if (data.therapist) {
    try { await updateDoc(doc(db, 'clients', clientId), { therapist: data.therapist, updatedAt: serverTimestamp() }) } catch (_) {}
  }
  return ref.id
}

export function watchTreatments(clientId, cb) {
  const q = query(collection(db, 'clients', clientId, 'treatments'), orderBy('date', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getTreatmentsOnce(clientId) {
  const snap = await getDocs(query(collection(db, 'clients', clientId, 'treatments'), orderBy('date', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updateTreatment(clientId, id, data) {
  return updateDoc(doc(db, 'clients', clientId, 'treatments', id), data)
}

export async function deleteTreatment(clientId, id) {
  return deleteDoc(doc(db, 'clients', clientId, 'treatments', id))
}
