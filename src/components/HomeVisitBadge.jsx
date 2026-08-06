// Small violet "H" badge shown next to a client's ID wherever it appears, when
// that client is also registered for the Home Visit module.
export default function HomeVisitBadge({ client, className = '' }) {
  if (!Array.isArray(client?.programs) || !client.programs.includes('W2W Home Visit')) return null
  return (
    <span
      title="Also registered for W2W Home Visit"
      className={`ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500 align-middle text-[9px] font-bold leading-none text-white ${className}`}
    >
      H
    </span>
  )
}
