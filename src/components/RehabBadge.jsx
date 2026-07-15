// Small red "R" badge shown next to a client's ID wherever it appears, when
// that client is registered for W2W Fitness & Rehab (Rehab-only or Both).
export default function RehabBadge({ client, className = '' }) {
  if (!Array.isArray(client?.programs) || !client.programs.includes('W2W Fitness & Rehab')) return null
  return (
    <span
      title="Also registered for W2W Fitness & Rehab"
      className={`ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 align-middle text-[9px] font-bold leading-none text-white ${className}`}
    >
      R
    </span>
  )
}
