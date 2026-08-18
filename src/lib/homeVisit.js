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
// Falls back to the older single `homeVisitType` field for records made
// before multi-service registration, and to Physio if nothing is recorded
// at all, so an existing patient never ends up with no way in.
export function homeVisitServicesFor(client) {
  const programs = Array.isArray(client?.programs) ? client.programs : []
  const picked = HOME_VISIT_SERVICES.filter((s) => programs.includes(s.program)).map((s) => s.id)
  if (picked.length) return picked
  if (client?.homeVisitType && serviceById(client.homeVisitType)) return [client.homeVisitType]
  return ['physio']
}

// Turn the chosen service ids into the `programs` array stored on the client.
// 'W2W Home Visit' is always included — that's what marks them as belonging
// to this module — but it is never something the user picks by hand.
export function programsForServices(serviceIds = []) {
  const programs = HOME_VISIT_SERVICES.filter((s) => serviceIds.includes(s.id)).map((s) => s.program)
  return [...programs, HOME_VISIT_PROGRAM]
}

// Split a full client list into the two worlds in one pass.
export function partitionClients(clients = []) {
  const homeVisit = []
  const clinic = []
  for (const c of clients) (isHomeVisitOnlyClient(c) ? homeVisit : clinic).push(c)
  return { homeVisit, clinic }
}
