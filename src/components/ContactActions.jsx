import { Phone, MessageCircle } from 'lucide-react'

// Click-to-call + WhatsApp icons next to a client's phone number.
export default function ContactActions({ phone, size = 'md', showNumber = false }) {
  if (!phone) return <span className="text-slate-400">—</span>
  const digits = String(phone).replace(/\D/g, '')
  const wa = digits.length === 10 ? `91${digits}` : digits
  const cls = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const icon = size === 'sm' ? 15 : 18

  return (
    <div className="inline-flex items-center gap-2">
      {showNumber && <span className="text-sm text-slate-700">{phone}</span>}
      <a
        href={`tel:${phone}`}
        title={`Call ${phone}`}
        className={`grid ${cls} place-items-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-600 hover:text-white`}
      >
        <Phone size={icon} />
      </a>
      <a
        href={`https://wa.me/${wa}`}
        target="_blank"
        rel="noreferrer"
        title={`WhatsApp ${phone}`}
        className={`grid ${cls} place-items-center rounded-full bg-green-50 text-green-600 transition hover:bg-green-500 hover:text-white`}
      >
        <MessageCircle size={icon} />
      </a>
    </div>
  )
}
