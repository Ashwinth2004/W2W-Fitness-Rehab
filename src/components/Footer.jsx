import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { BUSINESS, whatsappLink, telLink } from '../lib/constants'
import { WhatsAppIcon, InstagramIcon } from './BrandIcons'

export default function Footer() {
  return (
    <footer className="mt-16 bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="W2W" className="h-14 w-14 rounded-full bg-white object-contain" />
            <div>
              <p className="font-display text-xl font-bold text-white">W2W Fitness &amp; Rehab</p>
              <p className="text-xs text-brand-300">{BUSINESS.tagline}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-brand-200">{BUSINESS.slogan}</p>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/services" className="hover:text-white">Services</Link></li>
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/gallery" className="hover:text-white">Gallery</Link></li>
            <li><Link to="/testimonials" className="hover:text-white">Testimonials</Link></li>
            <li><Link to="/workshop" className="hover:text-white">W2W Workshop</Link></li>
            <li><Link to="/blog" className="hover:text-white">Health Tips</Link></li>
            <li><Link to="/book" className="hover:text-white">Book Appointment</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Get in Touch</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><MapPin size={18} className="mt-0.5 shrink-0 text-brand-400" />{BUSINESS.address}</li>
            <li><a href={telLink()} className="flex items-center gap-2 hover:text-white"><Phone size={18} className="text-brand-400" />{BUSINESS.phoneDisplay}</a></li>
            <li><a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-2 hover:text-white"><Mail size={18} className="text-brand-400" />{BUSINESS.email}</a></li>
          </ul>
          <div className="mt-4 flex gap-3">
            <a href={whatsappLink()} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366] text-white transition hover:opacity-90" aria-label="WhatsApp"><WhatsAppIcon size={20} /></a>
            <a href={BUSINESS.instagram} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white transition hover:opacity-90" aria-label="Instagram"><InstagramIcon size={20} /></a>
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Opening Hours</h4>
          <ul className="space-y-2 text-sm">
            {BUSINESS.hours.map((h) => (
              <li key={h.day} className="flex items-start gap-2">
                <Clock size={18} className="mt-0.5 shrink-0 text-brand-400" />
                <span><span className="block font-medium text-white">{h.day}</span>{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-brand-300 sm:flex-row">
          <p>© {new Date().getFullYear()} W2W Fitness &amp; Rehab. All Rights Reserved.</p>
          <p>Mylapore, Chennai · Way To Wellness</p>
        </div>
      </div>
    </footer>
  )
}
