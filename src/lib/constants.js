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
    credentials: ['BPT', 'M.Sc. Exercise Physiology & Nutrition', 'MIAP (Member of Indian Association of Physiotherapists)', 'Dip. Manual Therapy', 'Certified Dry Needling'],
    bio: 'Head physiotherapist and Way to Wellness founder with 6+ years of experience. BPT, M.Sc. in Exercise Physiology & Nutrition, and a Member of the Indian Association of Physiotherapists (MIAP), with a Diploma in Manual Therapy, certified in evidence-based orthopaedic manual therapy and a certified dry needling practitioner. Worked with the Tamil Nadu senior women’s football squad for two years.',
  },
  {
    name: 'Akash Pariyar',
    role: 'Fitness Director',
    instagram: 'https://www.instagram.com/akash_8_pariyar',
    photo: '/team/akash-pariyar-fitness-director.webp',
    credentials: ['ACE Certified', 'ACSM Certified', 'Hatha Yoga Trained', '10+ yrs experience'],
    bio: 'An internationally certified fitness professional with close to a decade of experience in health and wellness. Holds credentials from the American Council on Exercise (ACE) and the American College of Sports Medicine (ACSM), with formal training in Hatha Yoga, he brings a comprehensive and integrative approach to fitness.',
  },
]

// A therapist's formal qualification line — shown after their name wherever they
// are credited (e.g. under the consultant's signature on client reports). Keyed
// by name so each therapist carries their own credentials.
export const THERAPIST_QUALIFICATIONS = {
  'Sakthi Saravanan': 'BPT, M.Sc Exercise Physiology & Nutrition, MIAP',
}

export const qualificationFor = (name) => THERAPIST_QUALIFICATIONS[(name || '').trim()] || ''

// A therapist's signature image, shown above their name in the consultant block
// of client reports. Sakthi Saravanan is the default consultant, so hers shows
// by default. (Other therapists simply show their name, with no signature.)
export const THERAPIST_SIGNATURES = {
  'Sakthi Saravanan': '/signatures/sakthi-saravanan.jpg',
}

export const signatureFor = (name) => THERAPIST_SIGNATURES[(name || '').trim()] || ''

// Consent declaration shown when capturing a patient's signature (in client
// registration and in the Signatures module). Their signature confirms it.
export const CONSENT_DECLARATION =
  'I voluntarily consent to physiotherapy assessment and treatment at W2W Fitness & Rehab, '
  + 'Balaiah Avenue, Mylapore, Chennai. I confirm that this is my own decision, that the nature '
  + 'and purpose of the treatment have been explained to me, and that I am free to ask questions '
  + 'or decline any part of the treatment at any time. I take responsibility for the information '
  + 'I have provided and willingly agree to proceed with the treatment.'

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
  { url: 'https://www.instagram.com/p/DZzoig_iRLS/', thumbnail: '/reels/w2w-physiotherapy-patient-success-story-mylapore.webp', caption: 'A W2W Fitness & Rehab success story' },
  { url: 'https://www.instagram.com/reel/DZr4htuCBSS/', thumbnail: '/reels/knee-pain-clinical-reasoning.webp', caption: 'Why did my knee pain return? — the clinical reasoning' },
  { url: 'https://www.instagram.com/reel/DTyAqiakt8i/', thumbnail: '/reels/way-to-wellness-2-years.webp', caption: 'Way to Wellness turns two' },
  { url: 'https://www.instagram.com/reel/DRQ_H-nkp_E/', thumbnail: '/reels/physiotherapy-clinical-reasoning.webp', caption: 'When the prescription already decides the treatment…' },
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

export const SERVICE_OPTIONS = [...SERVICES.map((s) => s.title), 'Rehab']

// Services that can be booked as an appointment (website + admin).
export const BOOKABLE_SERVICES = ['Physiotherapy', 'Rehab']

// ============================================================================
//  Clinical intake + assessment option lists (Clients & Treatment forms).
//  Used by assessmentSchema.js, AssessmentField.jsx, the report PDF and the
//  read-only detail views, so everything stays in sync.
// ============================================================================

// --- Client intake (front desk) -------------------------------------------
export const WALKING_ROUTINE_OPTIONS = ['1–2k steps', '3–5k steps', '5–7k steps', '7–10k steps']
export const EXERCISE_ROUTINE_OPTIONS = ['Yoga', 'Strength training', 'Only walking', 'Others']
export const MEDICAL_HISTORY_OPTIONS = ['Diabetics', 'Hypertension', 'Thyroid', 'Other']
export const HYDRATION_OPTIONS = ['Less than 1 L', '1–2 L', '2–3 L', '3 L & above']
export const SLEEP_OPTIONS = ['< 5 hrs', '5–6 hrs', '6–7 hrs', '7–8 hrs', '8+ hrs']
export const DESKWORK_OPTIONS = ['< 2 hrs', '2–4 hrs', '4–6 hrs', '6–8 hrs', '8+ hrs']

// --- Treatment / examination (doctor) --------------------------------------
export const PAIN_DURATION_UNITS = ['Days', 'Weeks', 'Months']
export const PAIN_TYPE_OPTIONS = [
  'Sharp / Shooting', 'Dull / Aching', 'Burning / Tingling', 'Throbbing / Pulsing', 'Deep / Heavy', 'Other',
]
export const ADL_IMPACT_OPTIONS = ["It doesn't affect my ADL", 'It is affecting my ADL']
export const BUILT_OPTIONS = ['Ectomorph', 'Mesomorph', 'Endomorph']
export const POS_NEG = ['+ve', '-ve']

// Pain response — used under EVERY joint movement and on the spine.
export const PAIN_RESPONSE = ['No', 'End-range Pain', 'Throughout ROM', 'Unable to Assess']
// Spine ROM grading (lumbar & thoracic).
export const SPINE_ROM_GRADES = ['Full', 'Mild Limitation', 'Moderate Limitation', 'Severe Limitation', 'Unable']

// Joint-wise ROM reference (from the W2W ROM assessment sheet).
//  type 'rom'   → each movement records AROM, PROM, Pain (normal = degrees)
//  type 'spine' → each movement records a ROM grade + Pain (no AROM/PROM)
export const JOINTS = [
  { id: 'cervical', name: 'Cervical', type: 'rom', movements: [
    { key: 'flex', name: 'Flexion', normal: '45°' }, { key: 'ext', name: 'Extension', normal: '45°' },
    { key: 'latflex', name: 'Lateral Flexion', normal: '45°' }, { key: 'rot', name: 'Rotation', normal: '60–80°' },
  ] },
  { id: 'shoulder', name: 'Shoulder', type: 'rom', movements: [
    { key: 'flex', name: 'Flexion', normal: '180°' }, { key: 'ext', name: 'Extension', normal: '60°' },
    { key: 'abd', name: 'Abduction', normal: '180°' }, { key: 'add', name: 'Adduction', normal: '45°' },
    { key: 'ir', name: 'Internal Rotation', normal: '70°' }, { key: 'er', name: 'External Rotation', normal: '90°' },
  ] },
  { id: 'elbow', name: 'Elbow', type: 'rom', movements: [
    { key: 'flex', name: 'Flexion', normal: '150°' }, { key: 'ext', name: 'Extension', normal: '0°' },
  ] },
  { id: 'forearm', name: 'Forearm', type: 'rom', movements: [
    { key: 'pro', name: 'Pronation', normal: '90°' }, { key: 'sup', name: 'Supination', normal: '90°' },
  ] },
  { id: 'wrist', name: 'Wrist', type: 'rom', movements: [
    { key: 'flex', name: 'Flexion', normal: '80°' }, { key: 'ext', name: 'Extension', normal: '70°' },
    { key: 'rd', name: 'Radial Deviation', normal: '20°' }, { key: 'ud', name: 'Ulnar Deviation', normal: '30°' },
  ] },
  { id: 'thumb', name: 'Thumb', type: 'rom', movements: [
    { key: 'mcp', name: 'MCP Flexion', normal: '50°' }, { key: 'ip', name: 'IP Flexion', normal: '80°' },
  ] },
  { id: 'fingers', name: 'Fingers', type: 'rom', movements: [
    { key: 'mcp', name: 'MCP Flexion', normal: '90°' }, { key: 'pip', name: 'PIP Flexion', normal: '100°' },
    { key: 'dip', name: 'DIP Flexion', normal: '90°' },
  ] },
  { id: 'hip', name: 'Hip', type: 'rom', movements: [
    { key: 'flex', name: 'Flexion', normal: '120°' }, { key: 'ext', name: 'Extension', normal: '20°' },
    { key: 'abd', name: 'Abduction', normal: '45°' }, { key: 'add', name: 'Adduction', normal: '30°' },
    { key: 'ir', name: 'Internal Rotation', normal: '45°' }, { key: 'er', name: 'External Rotation', normal: '45°' },
  ] },
  { id: 'knee', name: 'Knee', type: 'rom', movements: [
    { key: 'flex', name: 'Flexion', normal: '135°' }, { key: 'ext', name: 'Extension', normal: '0°' },
  ] },
  { id: 'ankle', name: 'Ankle', type: 'rom', movements: [
    { key: 'df', name: 'Dorsiflexion', normal: '20°' }, { key: 'pf', name: 'Plantarflexion', normal: '50°' },
    { key: 'inv', name: 'Inversion', normal: '35°' }, { key: 'ev', name: 'Eversion', normal: '15°' },
  ] },
  { id: 'thoracic', name: 'Thoracic Spine', type: 'spine', movements: [
    { key: 'flex', name: 'Flexion', normal: '' }, { key: 'ext', name: 'Extension', normal: '' },
    { key: 'sf_r', name: 'Side Flexion (Right)', normal: '' }, { key: 'sf_l', name: 'Side Flexion (Left)', normal: '' },
    { key: 'rot_r', name: 'Rotation (Right)', normal: '' }, { key: 'rot_l', name: 'Rotation (Left)', normal: '' },
  ] },
  { id: 'lumbar', name: 'Lumbar Spine', type: 'spine', movements: [
    { key: 'flex', name: 'Flexion', normal: '60°' }, { key: 'ext', name: 'Extension', normal: '25°' },
    { key: 'sf_r', name: 'Side Flexion (Right)', normal: '20°' }, { key: 'sf_l', name: 'Side Flexion (Left)', normal: '20°' },
    { key: 'rot_r', name: 'Rotation (Right)', normal: '18°' }, { key: 'rot_l', name: 'Rotation (Left)', normal: '18°' },
  ] },
]

// --- Functional activities -------------------------------------------------
export const FUNCTIONAL_UPPER = [
  'Overhead Reach', 'Reach Behind Neck', 'Reach Behind Back', 'Hand to Mouth', 'Lift/Carry Object',
  'Push/Pull', 'Grip', 'Pinch', 'Fine Motor Tasks (Writing/Buttoning/Zipping)',
]
export const FUNCTIONAL_LOWER = [
  'Sit to Stand', 'Squatting', 'Bending Forward', 'Walking', 'Stair Climbing', 'Running (if applicable)',
  'Heel Raise', 'Toe Raise', 'Single-Leg Balance', 'Cross-Leg Sitting', 'Floor Transfers',
]
export const MOVEMENT_QUALITY = ['Normal', 'Compensated', 'Guarded', 'Poor Control']

// --- Girth & limb length ---------------------------------------------------
export const GIRTH_SITES = [
  'Mid Arm', 'Maximum Forearm Girth', '10 cm Above Patella', 'Knee Joint Line (Mid-Patella)',
  'Maximum Calf Girth', 'Figure-of-Eight (Ankle)',
]
export const GIRTH_FINDINGS = ['Normal', 'Swelling', 'Muscle Atrophy', 'Muscle Hypertrophy', 'Post-operative']
export const LIMB_LENGTH_TYPES = ['True', 'Apparent', 'Both']

// Default service charges for the Accounting → Patient Charges dropdown. Seeded
// into the `serviceCharges` collection once, then fully editable in the UI.
export const PRESET_SERVICE_CHARGES = [
  { name: 'Assessment', amount: 800 },
  { name: 'Treatment', amount: 600 },
  { name: 'Lifestyle fitness/rehab', amount: 600 },
  { name: 'Monthly Rehab package', amount: 6000 },
  { name: '3 month Rehab package', amount: 15000 },
]

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
  if (workshop.paymentNumber) { lines.push(''); lines.push(`📲 ${workshop.paymentNumber}`) }
  lines.push('')
  lines.push('See you there! 🚀')
  return lines.join('\n')
}

// The confirmation message a student sends on WhatsApp after registering (the
// "Message us on WhatsApp" button). Clean, formatted layout — accepts the full
// workshop object (preferred — includes date & time) or a bare title string.
export function workshopWhatsappMessage(workshop, fullName) {
  const title = typeof workshop === 'string' ? workshop : workshop?.title || 'the workshop'
  const name = String(fullName || '').trim()
  const lines = [
    '✅ *Workshop Registration — Payment Done*',
    '',
    `Hi ${BUSINESS.name}! 👋`,
    '',
    'I’ve registered for your workshop and completed the payment. My details:',
    '',
  ]
  if (name) lines.push(`🧑 *Name:* ${name}`)
  lines.push(`🎓 *Workshop:* ${title}`)
  if (typeof workshop === 'object' && workshop) {
    if (workshop.date) lines.push(`📅 *Date:* ${fmtDate(workshop.date, 'EEEE, d MMMM yyyy')}`)
    if (workshop.time) lines.push(`⏰ *Time:* ${workshop.time}`)
  }
  lines.push('')
  lines.push('I’m sharing my payment screenshot here to confirm my slot — please verify and confirm. 🙏')
  lines.push('')
  lines.push('Thank you!')
  return lines.join('\n')
}
