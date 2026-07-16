import { User } from 'lucide-react'
import { avatarRingClass } from '../lib/patientAvatar'

// Auto avatar from registration details — a person icon tinted blue for Male,
// pink for Female (falls back to the name's first letter when gender isn't
// set). The ring color (from avatarRingClass) is a separate signal: red means
// registered for W2W Fitness & Rehab, blue means Treatment only.
const SIZES = {
  sm: { box: 'h-11 w-11', icon: 20 },
  lg: { box: 'h-16 w-16 text-2xl', icon: 30 },
}

export default function PatientAvatar({ client, size = 'sm', className = '' }) {
  const g = (client?.gender || '').toLowerCase()
  const isMale = g === 'male'
  const isFemale = g === 'female'
  const s = SIZES[size] || SIZES.sm
  const tint = isMale ? 'bg-sky-100 text-sky-700' : isFemale ? 'bg-pink-100 text-pink-700' : 'bg-brand-100 text-brand-700'

  return (
    <div className={`grid ${s.box} shrink-0 place-items-center rounded-full font-bold ${tint} ${avatarRingClass(client)} ${className}`}>
      {isMale || isFemale ? <User size={s.icon} strokeWidth={2.25} /> : (client?.name?.[0] || '?').toUpperCase()}
    </div>
  )
}
