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

// The services a Home Visit patient can be registered for. Inside the Home
// Visits module these are the ONLY choice offered — "W2W Home Visit" itself
// is implied by registering here, so it is never shown as a separate option.
// The stored `program` value stays the clinic's original identifier so
// badges, reports and existing records keep working unchanged.
export const HOME_VISIT_SERVICES = [
  { id: 'physio', label: 'H-W2W PHYSIO', short: 'Physio', program: 'W2W Treatment' },
  { id: 'rehab', label: 'H-W2W REHAB', short: 'Rehab & Exercises', program: 'W2W Fitness & Rehab' },
  { id: 'fitness', label: 'H-W2W FITNESS', short: 'Fitness', program: 'W2W Fitness' },
]

export const serviceById = (id) => HOME_VISIT_SERVICES.find((s) => s.id === id) || null

// Which services a home-visit patient is registered for, as service ids.
//
// Stored in its own `homeVisitServices` field rather than mixed into the
// clinic's `programs` array. Keeping them apart matters: `programs` is the
// clinic's vocabulary, and a home-visit patient's programs array must stay
// exactly ['W2W Home Visit'] for the freelance login to be allowed to write
// it at all. It also means picking a service here can never make a patient
// look like a clinic patient.
//
// Older records fall back to the single `homeVisitType`, then to the program
// tags, then to Physio — so an existing patient always has a way in.
export function homeVisitServicesFor(client) {
  const stored = Array.isArray(client?.homeVisitServices) ? client.homeVisitServices.filter((id) => serviceById(id)) : []
  if (stored.length) return stored
  if (client?.homeVisitType && serviceById(client.homeVisitType)) return [client.homeVisitType]
  const programs = Array.isArray(client?.programs) ? client.programs : []
  const fromPrograms = HOME_VISIT_SERVICES.filter((s) => programs.includes(s.program)).map((s) => s.id)
  return fromPrograms.length ? fromPrograms : ['physio']
}

// Split a full client list into the two worlds in one pass.
export function partitionClients(clients = []) {
  const homeVisit = []
  const clinic = []
  for (const c of clients) (isHomeVisitOnlyClient(c) ? homeVisit : clinic).push(c)
  return { homeVisit, clinic }
}
