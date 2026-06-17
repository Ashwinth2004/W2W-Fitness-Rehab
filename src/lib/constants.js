// ============================================================================
//  Central business config. Edit here to update contact info everywhere.
// ============================================================================

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
  website: 'https://w2wfitnessandrehab.in',
  instagram: 'https://www.instagram.com/w2wphysiotherapy/',
  instagramHandle: '@w2wphysiotherapy',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=No.5+Balaiah+Avenue+Luz+Road+Mylapore+Chennai+600004',
  reviewsUrl: 'https://maps.app.goo.gl/e5pDpML3fXHeN2Eq8',
  rating: 4.9,
  reviewCount: 60,
  hours: [
    { day: 'Monday – Saturday', time: '6:00 AM – 9:00 PM' },
    { day: 'Sunday', time: 'Closed' },
  ],
}

export const SERVICES = [
  {
    id: 'physiotherapy',
    title: 'Physiotherapy',
    short: 'Sports injury recovery, ortho & neuro treatment, post-surgery rehab, and elderly care.',
    points: [
      'Sports injury rehabilitation',
      'Orthopaedic & neurological treatment',
      'Post-surgery recovery programs',
      'Geriatric (elderly) care',
      'Manual therapy & dry needling',
    ],
    icon: 'Activity',
    photo: '/services/physiotherapy.jpg',
    bookable: true, // only physiotherapy is bookable online (others: enquiry)
  },
  {
    id: 'yoga',
    title: 'Yoga',
    short: 'Hatha Yoga, flexibility training, posture correction, and advanced body movements.',
    points: [
      'Hatha Yoga sessions',
      'Flexibility & mobility training',
      'Posture correction',
      'Breathwork & mindfulness',
    ],
    icon: 'Flower2',
    photo: '/services/yoga.jpg',
    bookable: false,
  },
  {
    id: 'lifestyle-fitness',
    title: 'Lifestyle Fitness',
    short: 'Strength training, weight management, mobility improvement, and endurance building.',
    points: [
      'Personalized strength training',
      'Weight management',
      'Mobility & endurance building',
      'Functional fitness coaching',
    ],
    icon: 'Dumbbell',
    photo: '/services/fitness.jpg',
    bookable: false,
  },
  {
    id: 'w2w-academy',
    title: 'W2W Academy',
    short: 'Professional training in fitness & physiotherapy — hands-on workshops for aspiring professionals.',
    points: [
      'Anatomy & biomechanics workshops',
      'Exercise prescription training',
      'Case discussions & treatment approaches',
      '100+ students trained in 6 months',
    ],
    icon: 'GraduationCap',
    photo: '/services/academy.jpg',
    bookable: false,
  },
]

export const FOUNDERS = [
  {
    name: 'Sakthi Saravanan',
    role: 'Head Physiotherapist & Founder',
    instagram: 'https://www.instagram.com/98sakthisaravanan',
    photo: '/team/sakthi.jpg',
    credentials: ['BPT', 'M.Sc. Exercise Physiology & Nutrition', 'Dip. Manual Therapy', 'Certified Dry Needling'],
    bio: 'Head physiotherapist and Way to Wellness founder with six years of experience. BPT, M.Sc. in Exercise Physiology & Nutrition, Diploma in Manual Therapy, certified in evidence-based orthopaedic manual therapy and certified dry needling practitioner. Worked with the Tamil Nadu senior women’s football squad for two years.',
  },
  {
    name: 'Akash Pariyar',
    role: 'Fitness Director',
    instagram: 'https://www.instagram.com/akash_8_pariyar',
    photo: '/team/akash.jpg',
    credentials: ['ACE Certified', 'ACSM Certified', 'Hatha Yoga Trained', '10+ yrs experience'],
    bio: 'An internationally certified fitness professional with close to a decade of experience in health and wellness. Holds credentials from the American Council on Exercise (ACE) and the American College of Sports Medicine (ACSM), with formal training in Hatha Yoga, bringing a comprehensive and integrative approach to fitness.',
  },
]

// Gallery images (optimised copies live in /public/gallery). Captions are
// generic but descriptive — tweak any time without touching the page.
export const GALLERY_PHOTOS = [
  { src: '/gallery/g01.jpg', caption: 'Our W2W Academy batch' },
  { src: '/gallery/g02.jpg', caption: 'Hands-on rehab training' },
  { src: '/gallery/g03.jpg', caption: 'Workshop in session' },
  { src: '/gallery/g04.jpg', caption: 'Case discussion at the clinic' },
  { src: '/gallery/g05.jpg', caption: 'Patient assessment demo' },
  { src: '/gallery/g06.jpg', caption: 'Students at W2W' },
  { src: '/gallery/g07.jpg', caption: 'Rehab planning session' },
  { src: '/gallery/g08.jpg', caption: 'Interactive learning' },
  { src: '/gallery/g09.jpg', caption: 'Treatment in progress' },
  { src: '/gallery/g10.jpg', caption: 'Certificate ceremony' },
  { src: '/gallery/g11.jpg', caption: 'Mentoring future therapists' },
  { src: '/gallery/g12.jpg', caption: 'Group learning at W2W' },
  { src: '/gallery/g13.jpg', caption: 'Strength & conditioning' },
  { src: '/gallery/g14.jpg', caption: 'Inside W2W Fitness & Rehab' },
  { src: '/gallery/g15.jpg', caption: 'Certificate presentation' },
  { src: '/gallery/g16.jpg', caption: 'Achievement, recognised' },
]

// Instagram feed for the Gallery/Testimonials pages. Paste a LightWidget /
// SnapWidget *iframe src* here to show a live auto-updating feed; if left
// blank the page falls back to a "Follow on Instagram" call-to-action.
export const INSTAGRAM_PROFILE = 'https://www.instagram.com/w2wphysiotherapy/'
export const INSTAGRAM_HANDLE = '@w2wphysiotherapy'
export const INSTAGRAM_FEED_EMBED = '' // e.g. 'https://lightwidget.com/widgets/xxxxx.html'

// Operating slots (instant auto-confirm booking). One-hour slots, Mon–Sat.
export const SLOT_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

export const SERVICE_OPTIONS = SERVICES.map((s) => s.title)

// --- Prefilled WhatsApp helpers -------------------------------------------
export function whatsappLink(message) {
  const text = encodeURIComponent(message || defaultWhatsappGreeting())
  return `https://wa.me/${BUSINESS.whatsapp}?text=${text}`
}

export function defaultWhatsappGreeting() {
  return `Hi ${BUSINESS.name} 👋\n\nI'd like to know more about your services and book an appointment. Could you please help me?`
}

export function serviceWhatsappMessage(service) {
  return `Hi ${BUSINESS.name} 👋\n\nI'm interested in your *${service}* service. Please share availability and details for booking.`
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

export function workshopWhatsappMessage(workshopTitle, fullName) {
  return `Hi ${BUSINESS.name} 👋\n\nI have registered for *${workshopTitle}* under the name *${fullName || ''}* and completed the payment. Sharing my payment screenshot here to confirm my slot.`
}
