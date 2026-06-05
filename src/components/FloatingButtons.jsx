import { useState } from 'react'
import { MessageCircle, Instagram, Phone, X, Plus } from 'lucide-react'
import { BUSINESS, whatsappLink, telLink, defaultWhatsappGreeting } from '../lib/constants'

// Floating action cluster: WhatsApp (auto greeting), Instagram, Call.
export default function FloatingButtons() {
  const [open, setOpen] = useState(false)

  const items = [
    {
      label: 'WhatsApp',
      href: whatsappLink(defaultWhatsappGreeting()),
      icon: MessageCircle,
      cls: 'bg-green-500 hover:bg-green-600',
    },
    { label: 'Instagram', href: BUSINESS.instagram, icon: Instagram, cls: 'bg-pink-500 hover:bg-pink-600' },
    { label: 'Call', href: telLink(), icon: Phone, cls: 'bg-brand-600 hover:bg-brand-700' },
  ]

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 no-print">
      {open &&
        items.map((it) => (
          <a
            key={it.label}
            href={it.href}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 rounded-full ${it.cls} animate-pop-in py-2 pl-3 pr-4 text-white shadow-lg`}
          >
            <it.icon size={20} />
            <span className="text-sm font-semibold">{it.label}</span>
          </a>
        ))}
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-xl transition hover:bg-brand-700"
        aria-label="Contact options"
      >
        {open ? <X size={26} /> : <Plus size={26} className="animate-pulse" />}
      </button>
    </div>
  )
}
