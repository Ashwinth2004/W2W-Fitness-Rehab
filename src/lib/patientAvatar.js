// Avatar ring color for a patient's registered program — red border if they're
// registered for W2W Fitness & Rehab (rehab-only or Both), blue (brand) border
// if Treatment only. Applies automatically from `client.programs`, so every
// existing and new patient gets it with no manual toggle.
export function avatarRingClass(client) {
  const isRehab = Array.isArray(client?.programs) && client.programs.includes('W2W Fitness & Rehab')
  return isRehab ? 'border-2 border-red-500' : 'border-2 border-brand-600'
}
