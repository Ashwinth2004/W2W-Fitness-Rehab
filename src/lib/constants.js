// ============================================================================
//  Central business config. Edit here to update contact info everywhere.
// ============================================================================
import { fmtDate } from './format'

export const BUSINESS = {
  name: 'W2W Fitness & Rehab',
  shortName: 'W2W',
  tagline: 'Way To Wellness',
  slogan: 'Your Journey to Strength Starts Here!',
  quote: '“The human body is the best work of art.” — Jess C. Scott',
  address: 'No.5, Balaiah Avenue, Luz Road, Mylapore, Chennai – 600 004',
  phone: '+917200043621',
  phoneDisplay: '+91 72000 43621',
  whatsapp: '917200043621', // digits only, country code first
  whatsappDisplay: '+91 72000 43621',
  email: 'contact@w2wfitnessandrehab.in',
  website: 'https://www.w2wfitnessandrehab.in',
  instagram: 'https://www.instagram.com/w2wphysiotherapy/',
  instagramHandle: '@w2wphysiotherapy',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=No.5+Balaiah+Avenue+Luz+Road+Mylapore+Chennai+600004',
  reviewsUrl: 'https://maps.app.goo.gl/e5pDpML3fXHeN2Eq8',
  rating: 5.0,
  reviewCount: 106,
  hours: [
    { day: 'Monday – Saturday', time: '9:00 AM – 12:00 PM & 4:00 PM – 8:00 PM' },
    { day: 'Sunday', time: 'Closed' },
  ],
}

// Canonical site origin (no trailing slash) — used for SEO canonical/OG tags.
export const SITE_URL = BUSINESS.website

export const SERVICES = [
  {
    id: 'physiotherapy',
    title: 'Physiotherapy',
    short: 'Sports injury recovery, ortho & neuro treatment, post-surgery rehab, and elderly care.',
    description: 'Hands-on, evidence-based physiotherapy that targets the root cause of your pain — not just the symptom. From the very first assessment we build a personalised recovery plan using manual therapy, dry needling and a tailored home-exercise program, so you move freely again and stay that way.',
    points: [
      'Sports injury rehabilitation',
      'Orthopaedic & neurological treatment',
      'Post-surgery recovery programs',
      'Geriatric (elderly) care',
      'Manual therapy & dry needling',
    ],
    icon: 'Activity',
    photo: '/services/physiotherapy-rehab-mylapore.webp',
    bookable: true, // only physiotherapy is bookable online (others: enquiry)
  },
  {
    id: 'yoga',
    title: 'Yoga',
    short: 'Hatha Yoga, flexibility training, posture correction, and advanced body movements.',
    description: 'Traditional Hatha Yoga blended with modern movement science. Improve flexibility, correct posture and build body awareness at your own pace — from gentle beginner flows to advanced asanas — with breathwork and mindfulness woven into every session to calm the mind as it strengthens the body.',
    points: [
      'Hatha Yoga sessions',
      'Flexibility & mobility training',
      'Posture correction',
      'Breathwork & mindfulness',
    ],
    icon: 'Flower2',
    photo: '/services/hatha-yoga-classes-chennai.webp',
    bookable: false,
  },
  {
    id: 'lifestyle-fitness',
    title: 'Lifestyle Fitness',
    short: 'Strength training, weight management, mobility improvement, and endurance building.',
    description: 'Sustainable fitness designed around your life. We build personalised strength, weight-management and mobility programs with the right form and progression — so you gain real strength, endurance and confidence without burning out or risking injury.',
    points: [
      'Personalized strength training',
      'Weight management',
      'Mobility & endurance building',
      'Functional fitness coaching',
    ],
    icon: 'Dumbbell',
    photo: '/services/lifestyle-fitness-training.webp',
    bookable: false,
  },
  {
    id: 'w2w-academy',
    title: 'W2W Academy',
    short: 'Professional training in fitness & physiotherapy — hands-on workshops for aspiring professionals.',
    description: 'The W2W Academy trains the next generation of fitness and physiotherapy professionals. Hands-on workshops cover anatomy, biomechanics, exercise prescription and real case discussions — bridging the gap between textbook and clinic. 100+ students trained in just six months.',
    points: [
      'Anatomy & biomechanics workshops',
      'Exercise prescription training',
      'Case discussions & treatment approaches',
      '100+ students trained in 6 months',
    ],
    icon: 'GraduationCap',
    photo: '/services/w2w-academy-workshop.webp',
    bookable: false,
  },
]

export const FOUNDERS = [
  {
    name: 'Sakthi Saravanan',
    role: 'Head Physiotherapist & Founder',
    instagram: 'https://www.instagram.com/98sakthisaravanan',
    photo: '/team/sakthi-saravanan-physiotherapist.webp',
    credentials: ['BPT', 'M.Sc. Exercise Physiology & Nutrition', 'Dip. Manual Therapy', 'Certified Dry Needling'],
    bio: 'Head physiotherapist and Way to Wellness founder with six years of experience. BPT, M.Sc. in Exercise Physiology & Nutrition, Diploma in Manual Therapy, certified in evidence-based orthopaedic manual therapy and certified dry needling practitioner. Worked with the Tamil Nadu senior women’s football squad for two years.',
  },
  {
    name: 'Akash Pariyar',
    role: 'Fitness Director',
    instagram: 'https://www.instagram.com/akash_8_pariyar',
    photo: '/team/akash-pariyar-fitness-director.webp',
    credentials: ['ACE Certified', 'ACSM Certified', 'Hatha Yoga Trained', '10+ yrs experience'],
    bio: 'An internationally certified fitness professional with close to a decade of experience in health and wellness. Holds credentials from the American Council on Exercise (ACE) and the American College of Sports Medicine (ACSM), with formal training in Hatha Yoga, bringing a comprehensive and integrative approach to fitness.',
  },
]

// Gallery images (optimised copies live in /public/gallery). Captions are
// generic but descriptive — tweak any time without touching the page.
export const GALLERY_PHOTOS = [
  { src: '/gallery/w2w-academy-batch.webp', caption: 'Our W2W Academy batch' },
  { src: '/gallery/hands-on-rehab-training.webp', caption: 'Hands-on rehab training' },
  { src: '/gallery/physiotherapy-workshop-session.webp', caption: 'Workshop in session' },
  { src: '/gallery/clinic-case-discussion.webp', caption: 'Case discussion at the clinic' },
  { src: '/gallery/patient-assessment-demo.webp', caption: 'Patient assessment demo' },
  { src: '/gallery/w2w-academy-students.webp', caption: 'Students at W2W' },
  { src: '/gallery/rehab-planning-session.webp', caption: 'Rehab planning session' },
  { src: '/gallery/interactive-learning-workshop.webp', caption: 'Interactive learning' },
  { src: '/gallery/physiotherapy-treatment-in-progress.webp', caption: 'Treatment in progress' },
  { src: '/gallery/w2w-academy-certificate-day.webp', caption: 'Certificate ceremony' },
  { src: '/gallery/mentoring-physiotherapy-students.webp', caption: 'Mentoring future therapists' },
  { src: '/gallery/group-learning-w2w-academy.webp', caption: 'Group learning at W2W' },
  { src: '/gallery/strength-and-conditioning-training.webp', caption: 'Strength & conditioning' },
  { src: '/gallery/inside-w2w-clinic.webp', caption: 'Inside W2W Fitness & Rehab' },
  { src: '/gallery/w2w-academy-certificate-presentation.webp', caption: 'Certificate presentation' },
  // Photos from our Google Business listing
  { src: '/gallery/w2w-clinic-consultation.webp', caption: 'Consultation at the clinic' },
  { src: '/gallery/physiotherapy-patient-assessment.webp', caption: 'Patient assessment' },
  { src: '/gallery/physiotherapy-treatment-planning.webp', caption: 'Treatment planning session' },
  { src: '/gallery/inside-w2w-fitness-rehab.webp', caption: 'Inside the W2W clinic' },
  { src: '/gallery/one-on-one-physiotherapy.webp', caption: 'One-on-one physiotherapy' },
  { src: '/gallery/personalised-physiotherapy-care.webp', caption: 'Personalised care' },
  { src: '/gallery/w2w-clinic-mylapore-chennai.webp', caption: 'W2W Fitness & Rehab, Mylapore' },
  // From our Instagram (@w2wphysiotherapy)
  { src: '/gallery/w2w-academy-ankle-complex-session.webp', caption: 'W2W Academy — ankle complex session' },
  { src: '/gallery/sci-edu-award-2026.webp', caption: 'Sci-Edu Award 2026' },
]

// Instagram feed for the Gallery/Testimonials pages. Paste a LightWidget /
// SnapWidget *iframe src* here to show a live auto-updating feed; if left
// blank the page falls back to a "Follow on Instagram" call-to-action.
export const INSTAGRAM_PROFILE = 'https://www.instagram.com/w2wphysiotherapy/'
export const INSTAGRAM_HANDLE = '@w2wphysiotherapy'
export const INSTAGRAM_FEED_EMBED = '' // e.g. 'https://lightwidget.com/widgets/xxxxx.html'

// Real Instagram reels (@w2wphysiotherapy) shown on the Testimonials page.
// Thumbnails are self-hosted (IG blocks hotlinking); clicking a card plays the
// reel inline via Instagram's embed, with a fallback link to open it on IG.
// Used as a fallback until the admin curates reels in Firestore.
export const REELS = [
  { url: 'https://www.instagram.com/p/DZzoig_iRLS/', caption: 'A W2W Fitness & Rehab success story' },
  { url: 'https://www.instagram.com/reel/DZr4htuCBSS/', thumbnail: '/reels/knee-pain-clinical-reasoning.webp', caption: 'Why did my knee pain return? — the clinical reasoning' },
  { url: 'https://www.instagram.com/reel/DTyAqiakt8i/', thumbnail: '/reels/way-to-wellness-2-years.webp', caption: 'Way to Wellness turns two' },
  { url: 'https://www.instagram.com/reel/DRQ_H-nkp_E/', thumbnail: '/reels/physiotherapy-clinical-reasoning.webp', caption: 'When the prescription already decides the treatment…' },
  { url: 'https://www.instagram.com/reel/DRHlSbYEmhW/', thumbnail: '/reels/vertigo-balance-challenge.webp', caption: 'The vertigo challenge — give it a try!' },
  { url: 'https://www.instagram.com/reel/DQ_hB3Ukn2Q/', thumbnail: '/reels/chase-understanding-not-certificates.webp', caption: 'Don’t chase certificates, chase understanding' },
  { url: 'https://www.instagram.com/reel/DQyb_0ZEnZh/', thumbnail: '/reels/healing-emotional-wellbeing.webp', caption: 'Healing isn’t just physical, it’s emotional too' },
]

// Appointment slots, kept in sync with the opening hours (BUSINESS.hours):
// Mon–Sat, morning 9:00 AM–12:00 PM and evening 4:00 PM–8:00 PM. Each slot is a
// 30-minute session (e.g. 9:00–9:30 AM); the last morning slot is 11:30→12 and
// the last evening slot 7:30→8 PM. Only one appointment is allowed per slot.
// Sundays are closed (the date picker blocks them). Appointments must be
// booked before arrival.
export const SLOT_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', // morning 9 AM – 12 PM
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', // evening 4 PM – 8 PM
]

// Each appointment slot is 30 minutes long.
export const SLOT_MINUTES = 30

export const SERVICE_OPTIONS = SERVICES.map((s) => s.title)

// --- Prefilled WhatsApp helpers -------------------------------------------
export function whatsappLink(message) {
  const text = encodeURIComponent(message || defaultWhatsappGreeting())
  return `https://wa.me/${BUSINESS.whatsapp}?text=${text}`
}

export function defaultWhatsappGreeting() {
  return `Hi ${BUSINESS.name},\n\nI'd like to know more about your services and book an appointment. Could you please help me?`
}

export function serviceWhatsappMessage(service) {
  return `Hi ${BUSINESS.name},\n\nI'm interested in your *${service}* service. Please share availability and details for booking.`
}

export function telLink() {
  return `tel:${BUSINESS.phone}`
}

// --- Workshop helpers ------------------------------------------------------
// UPI deep link (opens GPay/PhonePe/Paytm). Pass the workshop's UPI id + amount.
export function upiLink({ upiId, name, amount, note }) {
  if (!upiId) return ''
  const params = new URLSearchParams({
    pa: upiId,
    pn: name || BUSINESS.name,
    cu: 'INR',
  })
  if (amount) params.set('am', String(amount))
  if (note) params.set('tn', note)
  return `upi://pay?${params.toString()}`
}

// QR image (no extra dependency) for the UPI link, via a public QR endpoint.
export function upiQrImage(upiPayUrl, size = 220) {
  if (!upiPayUrl) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiPayUrl)}`
}

// Ready-to-share promotional message for a workshop (WhatsApp / Instagram /
// broadcast). Auto-built from the workshop's fields; the admin can override it
// with a custom `shareMessage`. Kept here so it stays in sync everywhere.
export function workshopShareMessage(workshop) {
  if (!workshop) return ''
  const lines = []
  lines.push(`🚨 ${workshop.title || 'W2W Workshop'} 🚀`)
  if (workshop.description) { lines.push(''); lines.push(workshop.description) }
  lines.push('')
  if (workshop.date) lines.push(`📅 Date: ${fmtDate(workshop.date, 'EEEE, d MMMM yyyy')}`)
  if (workshop.time) lines.push(`⏰ Time: ${workshop.time}`)
  if (workshop.venue) lines.push(`📍 Location: ${workshop.venue}`)
  if (workshop.mapUrl) lines.push(`🗺️ ${workshop.mapUrl}`)
  lines.push('')
  if (workshop.fee != null && workshop.fee !== '') lines.push(`💰 Fee: ₹${workshop.fee} only`)
  if (workshop.slots) lines.push(`⚠️ Limited to ${workshop.slots} slots only!`)
  lines.push('')
  lines.push('📞 Register now:')
  lines.push(`${BUSINESS.website}/workshop`)
  if (workshop.paymentNumber) lines.push(`📲 ${workshop.paymentNumber}`)
  lines.push('')
  lines.push('See you there! 🚀')
  return lines.join('\n')
}

// Accepts the full workshop object (preferred — includes date & time) or a bare
// title string, plus the registrant's name.
export function workshopWhatsappMessage(workshop, fullName) {
  const title = typeof workshop === 'string' ? workshop : workshop?.title || 'the workshop'
  const when = []
  if (typeof workshop === 'object' && workshop) {
    if (workshop.date) when.push(`Date: ${fmtDate(workshop.date)}`)
    if (workshop.time) when.push(`Time: ${workshop.time}`)
  }
  const whenStr = when.length ? ` (${when.join(', ')})` : ''
  return `Hi ${BUSINESS.name},\n\nI have registered for *${title}*${whenStr} under the name *${fullName || ''}* and completed the payment. Sharing my payment screenshot here to confirm my slot.`
}
