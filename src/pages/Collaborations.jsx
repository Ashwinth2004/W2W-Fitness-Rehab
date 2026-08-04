import { Mic2, Users2, Building2, HeartHandshake, Phone } from 'lucide-react'
import { WhatsAppIcon } from '../components/BrandIcons'
import EnquiryForm from '../components/EnquiryForm'
import { BUSINESS, whatsappLink, telLink, collaborationWhatsappMessage } from '../lib/constants'
import Seo from '../components/Seo'

const OFFERINGS = [
  {
    icon: Mic2,
    title: 'Guest Speaking',
    text: 'Invite our physiotherapists and trainers to speak at your event, studio session, or webinar on movement, injury prevention, posture, and recovery.',
  },
  {
    icon: Users2,
    title: 'Workshop Collaborations',
    text: 'Co-host a practical workshop with us — we bring the clinical expertise and hands-on training, you bring your community.',
  },
  {
    icon: Building2,
    title: 'Corporate Wellness Sessions',
    text: 'On-site or virtual sessions for your team — posture at the workstation, movement breaks, and injury-prevention basics.',
  },
  {
    icon: HeartHandshake,
    title: 'Studio & Institutional Partnerships',
    text: 'Yoga studios, gyms, colleges and wellness communities — partner with W2W for ongoing sessions, referrals, or joint programs.',
  },
]

export default function Collaborations() {
  return (
    <>
      <Seo
        title="Guest Speaking & Collaborations"
        description="W2W Fitness & Rehab is available for guest speaking, workshop collaborations, and corporate wellness partnerships. Get in touch to partner with us."
        path="/collaborations"
      />

      <section className="bg-gradient-to-br from-brand-50 to-white py-14 md:py-20">
        <div className="container-page text-center">
          <span className="section-eyebrow">Partner With Us</span>
          <h1 className="text-4xl font-extrabold md:text-5xl">Guest Speaking &amp; Collaborations</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Beyond our own clinic and academy, W2W Fitness &amp; Rehab is available as a guest speaker and collaborator
            for workshops, corporate wellness sessions, and partnerships with studios, gyms and institutions. If you're
            organising something and want our clinical expertise involved, we'd love to hear from you.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={whatsappLink(collaborationWhatsappMessage())} target="_blank" rel="noreferrer" className="btn-primary !bg-[#25D366] hover:!bg-[#1ebe5a]">
              <WhatsAppIcon size={18} /> WhatsApp Us
            </a>
            <a href={telLink()} className="btn-outline"><Phone size={18} /> {BUSINESS.phoneDisplay}</a>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-page">
          <div className="text-center">
            <span className="section-eyebrow">What We Offer</span>
            <h2 className="mt-2 text-3xl font-extrabold">Ways to work with W2W</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {OFFERINGS.map((o) => (
              <div key={o.title} className="card p-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><o.icon size={26} /></div>
                <h3 className="mt-4 font-bold text-slate-900">{o.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{o.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured collaboration */}
      <section className="bg-brand-50/50 py-14 md:py-20">
        <div className="container-page">
          <div className="text-center">
            <span className="section-eyebrow">Recent Collaboration</span>
            <h2 className="mt-2 text-3xl font-extrabold">In Association With Yogavahini</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Our physiotherapist Sakthi (Alagu Vishalatchi S, BPT, M.Sc EPN, MIAP) led a practical workshop on
              observing postural deviations, movement patterns and assessment — organised by Yogavahini, Besant Nagar.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-sm overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
            <img
              src="/collaborations/observing-postural-deviations-workshop.jpg"
              alt="A Practical Workshop on Observing Postural Deviations — organised by Yogavahini in association with W2W Fitness & Rehab"
              className="w-full"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section className="py-14 md:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl card p-6 text-center md:p-8">
            <h2 className="text-2xl font-bold">Have an event or workshop in mind?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Tell us a bit about it — date, audience, and what you'd like us to cover — and we'll get back to you.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={whatsappLink(collaborationWhatsappMessage())} target="_blank" rel="noreferrer" className="btn-primary !bg-[#25D366] hover:!bg-[#1ebe5a]">
                <WhatsAppIcon size={18} /> Chat on WhatsApp
              </a>
              <a href={telLink()} className="btn-outline"><Phone size={18} /> Call {BUSINESS.phoneDisplay}</a>
            </div>
            <div className="mt-8 text-left">
              <EnquiryForm defaultService="Guest Speaking & Collaborations" lockService />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
