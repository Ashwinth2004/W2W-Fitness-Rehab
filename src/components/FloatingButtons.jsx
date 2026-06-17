import { BUSINESS, whatsappLink, telLink, defaultWhatsappGreeting } from '../lib/constants'
import { WhatsAppIcon, InstagramIcon, PhoneIcon } from './BrandIcons'

// Always-visible floating contact cluster — exact brand icons, no "+" toggle.
export default function FloatingButtons() {
  const items = [
    {
      label: 'Chat on WhatsApp',
      href: whatsappLink(defaultWhatsappGreeting()),
      Icon: WhatsAppIcon,
      cls: 'bg-[#25D366] hover:bg-[#1ebe5a]',
      external: true,
    },
    {
      label: 'Follow on Instagram',
      href: BUSINESS.instagram,
      Icon: InstagramIcon,
      cls: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] hover:opacity-90',
      external: true,
    },
    {
      label: 'Call us',
      href: telLink(),
      Icon: PhoneIcon,
      cls: 'bg-brand-600 hover:bg-brand-700',
      external: false,
    },
  ]

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 no-print">
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target={it.external ? '_blank' : undefined}
          rel={it.external ? 'noreferrer' : undefined}
          aria-label={it.label}
          title={it.label}
          className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-xl transition hover:scale-105 ${it.cls}`}
        >
          <it.Icon size={26} />
        </a>
      ))}
    </div>
  )
}
