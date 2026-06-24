import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { watchOpenWorkshop } from '../lib/firestore'

// Scrolling (right → left) announcement strip pinned above the navbar.
// Shows "registrations open" with the live workshop title when the admin has a
// workshop open; otherwise the default "opens soon" teaser.
export default function AnnouncementBar() {
  const [workshop, setWorkshop] = useState(null)

  useEffect(() => {
    const unsub = watchOpenWorkshop(setWorkshop)
    return () => unsub && unsub()
  }, [])

  const isOpen = Boolean(workshop)
  const message = isOpen
    ? `W2W ONE DAY WORKSHOP — REGISTRATIONS OPEN NOW: ${workshop.title} · Limited slots — Register Today!`
    : 'W2W ONE DAY WORKSHOP REGISTRATION — OPENS SOON · Stay tuned for dates & details!'

  // The track holds two identical copies; translating it -50% loops seamlessly.
  const Copy = ({ hidden }) => (
    <span
      className="mx-8 inline-flex items-center gap-2 font-semibold tracking-wide"
      aria-hidden={hidden || undefined}
    >
      <Megaphone size={16} className="shrink-0" />
      {message}
    </span>
  )

  return (
    <div
      className={`no-print fixed inset-x-0 top-0 z-[60] flex h-9 items-center text-white ${
        isOpen ? 'bg-gradient-to-r from-brand-600 to-brand-700' : 'bg-brand-900'
      }`}
    >
      <Link to="/workshop" className="flex h-full w-full items-center hover:opacity-95" title="W2W Workshop registration">
        <div className="flex w-full overflow-hidden whitespace-nowrap text-sm">
          <div className="flex shrink-0 animate-marquee">
            <Copy />
            <Copy hidden />
          </div>
        </div>
      </Link>
    </div>
  )
}
