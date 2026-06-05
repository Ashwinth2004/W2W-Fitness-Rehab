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
  phone: '+918925496578',
  phoneDisplay: '+91 89254 96578',
  whatsapp: '917200043621', // digits only, country code first
  whatsappDisplay: '+91 72000 43621',
  email: 'contact@w2wfitnessandrehab.in',
  website: 'https://w2wfitnessandrehab.in',
  instagram: 'https://www.instagram.com/w2w1.7',
  instagramHandle: '@w2w1.7',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=No.5+Balaiah+Avenue+Luz+Road+Mylapore+Chennai+600004',
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
  },
]

export const FOUNDERS = [
  {
    name: 'Sakthi Saravanan',
    role: 'Head Physiotherapist & Founder',
    instagram: 'https://www.instagram.com/98sakthisaravanan',
    bio: 'Head physiotherapist and Way to Wellness founder with six years of experience. BPT, M.Sc. in Exercise Physiology & Nutrition, Diploma in Manual Therapy, certified in evidence-based orthopaedic manual therapy and certified dry needling practitioner. Worked with the Tamil Nadu senior women’s football squad for two years.',
  },
  {
    name: 'Akash Pariyar',
    role: 'Fitness Director',
    instagram: 'https://www.instagram.com/akash_8_pariyar',
    bio: 'An internationally certified fitness professional with close to a decade of experience in health and wellness. Holds credentials from the American Council on Exercise (ACE) and the American College of Sports Medicine (ACSM), with formal training in Hatha Yoga, bringing a comprehensive and integrative approach to fitness.',
  },
]

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
