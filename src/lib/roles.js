// Admin roles, keyed by login email.
//   'full'    → access to every module.
//   'limited' → every module EXCEPT Reports, Accounting and Notes & Goals
//               (those stay full-admin only; everything else — Dashboard,
//               Enquiries, Appointments, Clients, Treatment, Rehab &
//               Exercises, Signatures, W2W Workshop, Blogs — is visible).
//
// NOTE: these accounts must exist in Firebase Authentication (Email/Password)
// with the agreed passwords. This file only decides what each one can SEE/OPEN
// once signed in — passwords are never stored here.
const ROLES = {
  'admin@w2w.in': 'full',
  'admin2@w2w.in': 'limited',
}

// Paths a 'limited' admin may open (Dashboard '/admin' is handled separately).
// Reports, Accounting and Notes & Goals are deliberately NOT in this list.
const LIMITED_ALLOW = [
  '/admin/queries', '/admin/appointments', '/admin/clients', '/admin/treatment',
  '/admin/rehab', '/admin/signatures', '/admin/workshops', '/admin/content',
]

// Role for an email, or null if it isn't one of the configured admins.
export function roleForEmail(email) {
  return ROLES[(email || '').toLowerCase().trim()] || null
}

// Whether a role may open a given admin path.
export function canAccessPath(role, path) {
  if (role !== 'limited') return true
  if (path === '/admin') return true
  return LIMITED_ALLOW.some((p) => path === p || path.startsWith(p + '/'))
}
