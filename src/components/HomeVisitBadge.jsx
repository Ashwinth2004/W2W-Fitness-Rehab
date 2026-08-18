// Badge showing Home Visit service type shown next to a client's ID wherever it appears
export default function HomeVisitBadge({ client, className = '' }) {
  if (!Array.isArray(client?.programs) || !client.programs.includes('W2W Home Visit')) return null

  const type = client.homeVisitType || 'H'
  const color = type === 'physio' ? 'bg-violet-500' : type === 'rehab' ? 'bg-green-500' : 'bg-slate-400'
  const label = type === 'physio' ? 'P' : type === 'rehab' ? 'R' : 'H'
  const title = type === 'physio' ? 'Home Visit - Physio' : type === 'rehab' ? 'Home Visit - Rehab & Exercise' : 'Home Visit'

  return (
    <span
      title={title}
      className={`ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${color} align-middle text-[9px] font-bold leading-none text-white ${className}`}
    >
      {label}
    </span>
  )
}
