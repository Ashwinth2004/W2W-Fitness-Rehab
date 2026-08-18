// Admin roles, keyed by login email.
//   'full'      → access to every module.
//   'limited'   → every module EXCEPT Reports, Accounting and Notes & Goals
//                 (those stay full-admin only; everything else — Dashboard
//                 (which now includes the Enquiries inbox), Appointments,
//                 Clients, Treatment, Rehab & Exercises, Fitness, Home Visits,
//                 Signatures, W2W Workshop, Blogs — is visible).
//   'homevisit' → outside freelance home-visit physiotherapists. Access to
//                 ONLY the Home Visits module (plus the public website,
//                 which is unauthenticated anyway) — no Dashboard, no other
//                 clinic module. Their own client registrations, visit
//                 records and therapist-name list are also kept out of every
//                 other module at the Firestore rules level, not just here.
//
// NOTE: these accounts must exist in Firebase Authentication (Email/Password)
// with the agreed passwords. This file only decides what each one can SEE/OPEN
// once signed in — passwords are never stored here.
const ROLES = {
  'admin@w2w.in': 'full',
  'admin2@w2w.in': 'limited',
  'homevisit@w2w.in': 'homevisit',
}

// Paths a 'limited' admin may open (Dashboard '/admin' is handled separately).
// Reports, Accounting and Notes & Goals are deliberately NOT in this list.
const LIMITED_ALLOW = [
  '/admin/appointments', '/admin/clients', '/admin/treatment',
  '/admin/rehab', '/admin/fitness', '/admin/home-visits', '/admin/signatures', '/admin/workshops', '/admin/content',
]

// Role for an email, or null if it isn't one of the configured admins.
export function roleForEmail(email) {
  return ROLES[(email || '').toLowerCase().trim()] || null
}

// Where a role should land right after login / whenever it's bounced off a
// path it can't open (canAccessPath('/admin') is false for 'homevisit', so
// the usual '/admin' fallback would loop — send it straight to its module).
export function landingPathFor(role) {
  if (role === 'homevisit') return '/admin/home-visits'
  return '/admin'
}

// Whether a role may open a given admin path.
export function canAccessPath(role, path) {
  if (role === 'homevisit') {
    if (path === '/admin/home-visits' || path.startsWith('/admin/home-visits/')) return true
    // A single patient's profile opens from inside the Home Visits module
    // ("View Profile"), so the detail page is reachable — but the Clients
    // LIST itself stays closed, which also keeps it out of the sidebar.
    return /^\/admin\/clients\/[^/]+$/.test(path)
  }
  if (role !== 'limited') return true
  if (path === '/admin') return true
  return LIMITED_ALLOW.some((p) => path === p || path.startsWith(p + '/'))
}
