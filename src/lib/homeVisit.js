// Who "owns" a patient record: the Home Visit module, or the clinic.
//
// The two sides are deliberately kept apart:
//   • A patient registered through the Home Visits module belongs to Home
//     Visits. Other logins can still reach them, but only inside the Home
//     Visits module — they never appear in the Clients list, Physio
//     Treatment, Rehab & Exercises or Fitness pickers.
//   • Everyone else belongs to the clinic and is never shown to the
//     freelance home-visit login.
//
// Ownership is recorded once, at registration, as `homeVisitOnly: true`.
// It is deliberately NOT inferred from the `programs` array: a home-visit
// patient can be given a rehab or fitness plan inside the Home Visits
// module, which tags them 'W2W Fitness & Rehab' / 'W2W Fitness' — that must
// not leak them into the clinic's own modules.
//
// Records created before this flag existed are recognised by the shape they
// had then: Home Visit as their only program.
export const HOME_VISIT_PROGRAM = 'W2W Home Visit'

export function isHomeVisitClient(c) {
  return Array.isArray(c?.programs) && c.programs.includes(HOME_VISIT_PROGRAM)
}

// True for patients that belong to the Home Visits module.
export function isHomeVisitOnlyClient(c) {
  if (!c) return false
  if (c.homeVisitOnly === true) return true
  if (c.homeVisitOnly === false) return false // explicitly a clinic patient
  const programs = Array.isArray(c.programs) ? c.programs : []
  return programs.length === 1 && programs[0] === HOME_VISIT_PROGRAM
}

// The clinic's own patients — everything the Home Visits module doesn't own.
export function isClinicClient(c) {
  return !isHomeVisitOnlyClient(c)
}

// Split a full client list into the two worlds in one pass.
export function partitionClients(clients = []) {
  const homeVisit = []
  const clinic = []
  for (const c of clients) (isHomeVisitOnlyClient(c) ? homeVisit : clinic).push(c)
  return { homeVisit, clinic }
}
