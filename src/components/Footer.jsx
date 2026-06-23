import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { BUSINESS, whatsappLink, telLink } from '../lib/constants'
import { WhatsAppIcon, InstagramIcon } from './BrandIcons'
import { useBooking } from '../context/BookingContext'

export default function Footer() {
  const { openBooking } = useBooking()
  return (
    <footer className="bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-12 text-center md:grid-cols-2 md:text-left lg:grid-cols-4">
        <div>
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <img src="/w2w-fitness-rehab-logo.webp" alt="W2W Fitness & Rehab logo" className="h-14 w-14 rounded-full bg-white object-contain" />
            <div>
              <p className="font-display text-xl font-bold text-white">W2W Fitness &amp; Rehab</p>
              <p className="text-xs text-brand-300">{BUSINESS.tagline}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white">{BUSINESS.slogan}</p>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/gallery" className="hover:text-white">Gallery</Link></li>
            <li><Link to="/testimonials" className="hover:text-white">Testimonials</Link></li>
            <li><Link to="/workshop" className="hover:text-white">W2W Workshop</Link></li>
            <li>
              <button type="button" onClick={() => openBooking()} className="hover:text-white">
                Book Appointment
              </button>
            </li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Get in Touch</h4>
          <ul className="space-y-4 text-sm md:space-y-3">
            <li><a href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 text-center hover:text-white md:flex-row md:gap-2 md:text-left"><MapPin size={18} className="shrink-0 text-brand-400" />{BUSINESS.address}</a></li>
            <li><a href={telLink()} className="flex flex-col items-center gap-1.5 text-center hover:text-white md:flex-row md:gap-2 md:text-left"><Phone size={18} className="text-brand-400" />{BUSINESS.phoneDisplay}</a></li>
            <li><a href={`mailto:${BUSINESS.email}`} className="flex flex-col items-center gap-1.5 text-center hover:text-white md:flex-row md:gap-2 md:text-left"><Mail size={18} className="text-brand-400" />{BUSINESS.email}</a></li>
          </ul>
          <div className="mt-4 flex justify-center gap-3 md:justify-start">
            <a href={whatsappLink()} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366] text-white transition hover:opacity-90" aria-label="WhatsApp"><WhatsAppIcon size={20} /></a>
            <a href={BUSINESS.instagram} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white transition hover:opacity-90" aria-label="Instagram"><InstagramIcon size={20} /></a>
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Opening Hours</h4>
          <ul className="space-y-4 text-sm md:space-y-2">
            {BUSINESS.hours.map((h) => (
              <li key={h.day} className="flex flex-col items-center gap-1.5 text-center md:flex-row md:items-start md:gap-2 md:text-left">
                <Clock size={18} className="shrink-0 text-brand-400 md:mt-0.5" />
                <span>
                  <span className="block font-medium text-white">{h.day}</span>
                  {h.time.split(' & ').map((t) => (
                    <span key={t} className="block">{t}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-brand-300 sm:flex-row">
          <p>© {new Date().getFullYear()} W2W Fitness &amp; Rehab. All Rights Reserved.</p>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <span aria-hidden="true">·</span>
            <span>Mylapore, Chennai · Way To Wellness</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
