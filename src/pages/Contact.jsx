import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import EnquiryForm from '../components/EnquiryForm'
import { WhatsAppIcon, InstagramIcon } from '../components/BrandIcons'
import { BUSINESS, whatsappLink, telLink } from '../lib/constants'
import Seo from '../components/Seo'

export default function Contact() {
  return (
    <>
      <Seo
        title="Contact & Book Appointment"
        description="Visit W2W Fitness & Rehab at Balaiah Avenue, Luz, Mylapore, Chennai. Call +91 72000 43621 or book your physiotherapy appointment online."
        path="/contact"
      />
      <section className="bg-gradient-to-br from-brand-50 to-white py-14 md:py-20">
        <div className="container-page text-center">
          <span className="section-eyebrow">Contact</span>
          <h1 className="text-4xl font-extrabold md:text-5xl">We’re Ready, Let’s Talk.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Have a question or want to book a session? Reach out — we usually reply within a few hours.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          {/* Info */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold">Contact Information</h2>
              <ul className="mt-5 space-y-4 text-slate-700">
                <li className="flex gap-3"><MapPin className="shrink-0 text-brand-600" /> {BUSINESS.address}</li>
                <li><a href={telLink()} className="flex items-center gap-3 hover:text-brand-700"><Phone className="text-brand-600" /> {BUSINESS.phoneDisplay}</a></li>
                <li><a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-3 hover:text-brand-700"><Mail className="text-brand-600" /> {BUSINESS.email}</a></li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn-primary !bg-[#25D366] hover:!bg-[#1ebe5a]"><WhatsAppIcon size={18} /> WhatsApp</a>
                <a href={BUSINESS.instagram} target="_blank" rel="noreferrer" className="btn-outline"><InstagramIcon size={18} /> Instagram</a>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold"><Clock className="text-brand-600" size={20} /> Opening Hours</h3>
              <ul className="mt-4 space-y-2 text-slate-700">
                {BUSINESS.hours.map((h) => (
                  <li key={h.day} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                    <span className="font-medium">{h.day}</span><span>{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <iframe
                title="W2W Fitness & Rehab location"
                src="https://www.google.com/maps?q=Luz%20Road%20Mylapore%20Chennai%20600004&output=embed"
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Form */}
          <div className="card h-fit p-6 md:p-8">
            <h2 className="text-xl font-bold">Send us a message</h2>
            <p className="mt-1 text-sm text-slate-500">We’ll get back to you as soon as possible.</p>
            <div className="mt-6">
              <EnquiryForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
