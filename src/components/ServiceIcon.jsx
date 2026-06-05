import { Activity, Flower2, Dumbbell, GraduationCap, HeartPulse } from 'lucide-react'

const map = { Activity, Flower2, Dumbbell, GraduationCap }

export default function ServiceIcon({ name, ...props }) {
  const Icon = map[name] || HeartPulse
  return <Icon {...props} />
}
