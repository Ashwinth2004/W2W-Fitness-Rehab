import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'
import { BUSINESS, telLink } from '../lib/constants'
import Seo from '../components/Seo'

const EFFECTIVE = '21 June 2026'

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

export default function Privacy() {
  return (
    <div className="container-page max-w-3xl py-14 md:py-20">
      <Seo
        title="Privacy Policy"
        description="How W2W Fitness & Rehab, Mylapore collects, uses, stores and protects your personal and health information."
        path="/privacy"
      />

      <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">Privacy Policy</h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: {EFFECTIVE}</p>

      <p className="mt-6 leading-relaxed text-slate-600">
        {BUSINESS.name} (“we”, “us”, “our”), located at {BUSINESS.address}, is committed to protecting your privacy. This
        policy explains what information we collect when you use our website ({BUSINESS.website}) or our physiotherapy,
        rehabilitation, fitness and workshop services, how we use it, and the choices you have. By using our website or
        services, you agree to the practices described here.
      </p>

      <Section title="Information we collect">
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Appointment bookings:</strong> your name, mobile number, email (optional), chosen service, and preferred date/time.</li>
          <li><strong>Enquiries &amp; contact forms:</strong> your name, contact details and the message you send us.</li>
          <li><strong>Patient / client records:</strong> when you receive treatment, we record clinical information such as age, gender, occupation, medical history, complaints, assessments and treatment notes, so our clinicians can care for you safely.</li>
          <li><strong>Workshop registrations:</strong> your name, email, phone, qualification, and confirmation that a payment was made (we do not store card or bank credentials).</li>
        </ul>
      </Section>

      <Section title="How we use your information">
        <p>We use your information only to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>schedule, confirm and manage your appointments and workshop seats;</li>
          <li>provide physiotherapy, rehabilitation and fitness care and maintain your treatment history;</li>
          <li>respond to your enquiries and communicate with you (e.g. via phone, WhatsApp or email);</li>
          <li>confirm workshop payments and seat allocation;</li>
          <li>maintain and improve our services.</li>
        </ul>
        <p>We do <strong>not</strong> sell, rent or trade your personal or health information to anyone.</p>
      </Section>

      <Section title="How we store and protect it">
        <p>
          Your data is stored securely using Google Firebase (Firestore &amp; Authentication), with data transmitted over
          encrypted (HTTPS) connections. Access to patient records and the admin dashboard is restricted to authorised
          staff who sign in with a private account. We take reasonable technical and organisational measures to protect
          your information against unauthorised access, loss or misuse.
        </p>
      </Section>

      <Section title="Sharing with third parties">
        <p>We only share information where necessary to run our services, with:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>our treating clinicians and authorised clinic staff;</li>
          <li>infrastructure providers (Google Firebase for secure hosting and database);</li>
          <li>communication channels you choose to use with us (e.g. WhatsApp, phone, email);</li>
          <li>UPI / payment apps you use to pay workshop fees (we receive only a confirmation, not your banking details).</li>
        </ul>
        <p>We may also disclose information if required by law or to protect the safety of our patients and staff.</p>
      </Section>

      <Section title="Data retention">
        <p>
          We keep appointment, enquiry and patient records for as long as needed to provide care and meet our legal and
          professional obligations. You may request deletion of your personal data, subject to any records we are
          required to retain.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You may request to access, correct or delete the personal information we hold about you, or withdraw consent for
          non-essential communications. To make a request, contact us using the details below and we will respond within a
          reasonable time, in line with the Digital Personal Data Protection Act, 2023 (India).
        </p>
      </Section>

      <Section title="Cookies &amp; analytics">
        <p>
          Our website uses only the cookies/local storage required for the site and admin dashboard to function (for
          example, to keep an admin signed in). We do not use invasive advertising trackers.
        </p>
      </Section>

      <Section title="Children’s information">
        <p>
          We treat minors only with the involvement and consent of a parent or guardian, who is responsible for providing
          and managing the child’s information.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. The “Last updated” date above shows when it was last revised.
          Continued use of our website or services means you accept the current policy.
        </p>
      </Section>

      <Section title="Contact us">
        <p>For any privacy questions or requests, reach us at:</p>
        <ul className="space-y-2">
          <li className="flex items-start justify-center gap-2 md:justify-start"><MapPin size={18} className="mt-0.5 shrink-0 text-brand-500" /> {BUSINESS.address}</li>
          <li><a href={`mailto:${BUSINESS.email}`} className="flex items-center justify-center gap-2 font-medium text-brand-700 hover:underline md:justify-start"><Mail size={18} className="text-brand-500" /> {BUSINESS.email}</a></li>
          <li><a href={telLink()} className="flex items-center justify-center gap-2 font-medium text-brand-700 hover:underline md:justify-start"><Phone size={18} className="text-brand-500" /> {BUSINESS.phoneDisplay}</a></li>
        </ul>
      </Section>

      <div className="mt-12 rounded-2xl bg-brand-50 p-6 text-center">
        <p className="font-semibold text-slate-900">Have a question about your care or data?</p>
        <Link to="/contact" className="btn-primary mt-4">Contact us</Link>
      </div>
    </div>
  )
}
