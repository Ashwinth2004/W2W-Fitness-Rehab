// Exercise library for the Rehab & Exercises module.
//
// Region-driven types (Mobility / Strengthening / Stretching) — exercise list
// depends on both the region AND the type. Whole-body types (Functional /
// Balance / Plyometric / Cardio) are not region-specific — picking region
// "Whole Body" unlocks these instead.
export const REHAB_REGIONS = [
  'Neck', 'Shoulder', 'Chest', 'Upper Arm', 'Elbow', 'Forearm & Wrist', 'Wrist & Hand',
  'Thoracic Spine', 'Lumbar Spine', 'Back', 'Abdomen', 'Core', 'Hip', 'Thigh', 'Knee',
  'Lower Leg', 'Ankle', 'Ankle & Foot', 'Foot', 'Whole Body',
]

export const REGION_TYPES = ['Mobility', 'Strengthening', 'Stretching']
export const WHOLE_BODY_TYPES = ['Functional', 'Balance', 'Plyometric', 'Cardio']

// ---- Mobility ---------------------------------------------------------------
const MOBILITY = {
  Neck: ['Cervical Flexion', 'Cervical Extension', 'Cervical Rotation', 'Cervical Side Flexion', 'Chin Tuck', 'Cervical CARs'],
  Shoulder: ['Pendulum', 'Wand Flexion', 'Wand Abduction', 'Wall Slides', 'Finger Ladder', 'Sleeper Stretch', 'Cross-body Stretch', 'Shoulder CARs'],
  Elbow: ['Elbow Flexion/Extension ROM', 'Forearm Pronation/Supination', 'Elbow CARs'],
  'Wrist & Hand': ['Wrist Flexion/Extension', 'Radial/Ulnar Deviation', 'Tendon Glides', 'Finger ROM'],
  'Thoracic Spine': ['Cat-Camel', 'Open Book', 'Thread the Needle', 'Thoracic Extension', 'Thoracic Rotation'],
  'Lumbar Spine': ['Pelvic Tilt', 'Cat-Camel', 'Knee Rolls', 'Lumbar Flexion/Extension', 'Lumbar Rotation'],
  Hip: ['Hip CARs', 'Hip Front/back swings', 'Hip Internal Rotation', 'Hip External Rotation', 'Hip side swings'],
  Knee: ['Heel Slides', 'Knee Flexion ROM', 'Knee Extension ROM', 'Patellar Mobility'],
  Ankle: ['Ankle Pumps', 'Alphabet', 'Dorsiflexion Mobility', 'Plantarflexion Mobility', 'Inversion/Eversion ROM', 'Ankle CARs'],
  Foot: ['Toe Flexion/Extension', 'Toe Yoga', 'Arch Mobility'],
}

// ---- Strengthening ------------------------------------------------------------
const STRENGTHENING = {
  Neck: ['Deep Neck Flexor', 'Cervical Isometrics', 'Band Neck Strengthening'],
  Shoulder: ['External Rotation', 'Internal Rotation', 'Scaption', 'Front Raise', 'Lateral Raise', 'Shoulder Press', 'Row', 'Face Pull', 'Serratus Punch', 'Push-up Plus', 'Scapular Retraction'],
  Elbow: ['Biceps Curl', 'Hammer Curl', 'Triceps Extension', 'Wrist Flexion', 'Wrist Extension', 'Pronation', 'Supination'],
  'Wrist & Hand': ['Grip Strengthening', 'Putty Squeeze', 'Finger Extension', 'Thumb Opposition'],
  Core: ['Dead Bug', 'Bird Dog', 'Plank', 'Side Plank', 'Pallof Press', 'Farmer Carry'],
  Hip: ['Glute Bridge', 'Single-leg Bridge', 'Clamshell', 'Side-lying Hip Abduction', 'Fire Hydrant', 'Hip Thrust', 'Monster Walk', 'Lateral Band Walk', 'Hip Extension', 'Hip Adduction', 'Hip Flexion', 'Bulgarian Split Squat', 'Single-leg Squat', 'Step-up'],
  Knee: ['Quad Set', 'Straight Leg Raise', 'Short Arc Quad', 'Long Arc Quad', 'Terminal Knee Extension', 'Mini Squat', 'Wall Sit', 'Sit-to-Stand', 'Step-up', 'Step-down', 'Leg Press', 'Hamstring Curl', 'Nordic Hamstring'],
  'Ankle & Foot': ['Heel Raise', 'Single-leg Heel Raise', 'Tibialis Raise', 'Band Dorsiflexion', 'Band Plantarflexion', 'Band Inversion', 'Band Eversion', 'Short Foot', 'Toe Curl', 'Towel Scrunch'],
}

// ---- Stretching ---------------------------------------------------------------
const STRETCHING = {
  Neck: ['Upper Trapezius Stretch', 'Levator Scapulae Stretch', 'Sternocleidomastoid (SCM) Stretch', 'Scalene Stretch', 'Cervical Extensor Stretch'],
  Shoulder: ['Posterior Capsule Stretch', 'Cross-Body Shoulder Stretch', 'Anterior Shoulder Stretch', 'Deltoid Stretch', 'Rotator Cuff Stretch'],
  Chest: ['Pectoralis Major Stretch', 'Pectoralis Minor Doorway Stretch'],
  'Upper Arm': ['Biceps Stretch', 'Triceps Stretch'],
  'Forearm & Wrist': ['Wrist Flexor Stretch', 'Wrist Extensor Stretch', 'Forearm Pronator Stretch', 'Forearm Supinator Stretch'],
  Back: ['Latissimus Dorsi Stretch', 'Thoracic Extension Stretch', "Child's Pose", 'Cat-Camel Stretch', 'Quadratus Lumborum Stretch'],
  Abdomen: ['Cobra Stretch', 'Side Trunk Stretch'],
  Hip: ['Hip Flexor Stretch', 'Glute Stretch', 'Piriformis Stretch', 'Tensor Fasciae Latae (TFL) Stretch', 'IT Band Stretch'],
  Thigh: ['Hamstring Stretch', 'Quadriceps Stretch', 'Adductor (Butterfly) Stretch', 'Standing Adductor Stretch', 'Sartorius Stretch'],
  'Lower Leg': ['Gastrocnemius Stretch', 'Soleus Stretch', 'Tibialis Anterior Stretch', 'Peroneal Stretch'],
  Foot: ['Plantar Fascia Stretch'],
}

export const EXERCISES_BY_TYPE = { Mobility: MOBILITY, Strengthening: STRENGTHENING, Stretching: STRETCHING }

// ---- Whole-body types (no region) ----------------------------------------
export const FUNCTIONAL_EXERCISES = [
  "Farmer's Carry", 'Suitcase Carry', 'Overhead Carry', "Waiter's Carry", 'Cross-Body Carry',
  'TRX Power Pull', 'TRX Sprinter Start', 'TRX Body Saw', 'Pallof Press Walkout', 'Cable Lift',
  'Cable Chop', 'BOSU Single-Leg Reach', 'BOSU Weight Shift', 'BOSU Squat Hold', 'Kettlebell Around the Body Pass',
  'Bear Crawl with Band Resistance', 'Reactive Cone Drill', 'Figure-8 Cone Run', 'Lateral Shuffle with Cone Touch', 'Plate Halo',
]

// Balance exercises keep their difficulty level for grouped display, but are
// selectable as one flat list (some names repeat across levels on purpose).
export const BALANCE_EXERCISES = [
  { name: 'Double-Leg Stance', level: 'Basic' },
  { name: 'Tandem Stance', level: 'Basic' },
  { name: 'Single-Leg Stance', level: 'Basic' },
  { name: 'Weight Shifts', level: 'Basic' },
  { name: 'Marching in Place', level: 'Basic' },
  { name: 'Single-Leg Toe Taps', level: 'Basic' },
  { name: 'Tandem Walk', level: 'Moderate' },
  { name: 'Heel-to-Toe Walk', level: 'Moderate' },
  { name: 'Clock Reach', level: 'Moderate' },
  { name: 'Star Reach', level: 'Moderate' },
  { name: 'Step-Up Balance Hold', level: 'Moderate' },
  { name: 'BOSU Double-Leg Balance', level: 'Moderate' },
  { name: "Farmer's Carry", level: 'Moderate' },
  { name: 'BOSU Single-Leg Balance', level: 'Advanced' },
  { name: 'BOSU Single-Leg Reach', level: 'Advanced' },
  { name: 'TRX Single-Leg Squat', level: 'Advanced' },
  { name: 'Cable Pallof Press (Single-Leg)', level: 'Advanced' },
  { name: 'Single-Leg Romanian Deadlift Reach', level: 'Advanced' },
  { name: 'Single-Leg Hop & Stick', level: 'Advanced' },
  { name: 'Reactive Cone Drill', level: 'Advanced' },
]

export const PLYOMETRIC_EXERCISES = [
  'Squat Jump', 'Box Jump', 'Box Jump to Stick', 'Depth Drop (Box)', 'Drop Jump',
  'Lateral Box Jump', 'Single-Leg Box Hop', 'Box Bound', 'BOSU Jump to Balance', 'BOSU Lateral Hop',
  'Skater Jump Over Cone', 'Cone Hop Series', 'Reactive Cone Hop', 'Broad Jump', 'Bounding',
  'TRX Assisted Jump Squat', 'Resistance Band Assisted Jump', 'Resistance Band Resisted Broad Jump', 'Treadmill Sprint Intervals', 'Kettlebell Swing (Power)',
]

export const CARDIO_EXERCISES = [
  'Treadmill Walking', 'Incline Treadmill Walking', 'Treadmill Jogging', 'Treadmill Running', 'Treadmill Interval Training',
  'Cycling', 'High resistance cycling', 'Jump rope', 'Burpees', 'Surya namaskar',
]

export const WHOLE_BODY_EXERCISES = {
  Functional: FUNCTIONAL_EXERCISES,
  Balance: BALANCE_EXERCISES.map((b) => b.name),
  Plyometric: PLYOMETRIC_EXERCISES,
  Cardio: CARDIO_EXERCISES,
}

// Level lookup for the Balance list (used to show a "Basic/Moderate/Advanced" tag).
export const BALANCE_LEVEL = Object.fromEntries(BALANCE_EXERCISES.map((b) => [b.name, b.level]))

// Which types are available for a given region (Whole Body → whole-body types).
export function typesForRegion(region) {
  if (region === 'Whole Body') return WHOLE_BODY_TYPES
  return REGION_TYPES.filter((t) => EXERCISES_BY_TYPE[t][region])
}

// The selectable exercise names for a region + type combination.
export function exercisesFor(region, type) {
  if (region === 'Whole Body') return WHOLE_BODY_EXERCISES[type] || []
  return EXERCISES_BY_TYPE[type]?.[region] || []
}

// ---- Prescription option lists --------------------------------------------
export const SETS_OPTIONS = [1, 2, 3, 4, 5]
export const REPS_OPTIONS = Array.from({ length: 26 }, (_, i) => i + 5) // 5..30
export const HOLD_OPTIONS = ['None', '5 sec', '10 sec', '15 sec', '20 sec', '30 sec']
export const RESISTANCE_OPTIONS = ['Bodyweight', 'Band', 'Dumbbell', 'Barbell', 'Machine', 'Ankle weights']
export const FREQUENCY_OPTIONS = ['Daily', 'Alternate Days', '2× Week', '3× Week', '4× Week', '5× Week']
export const REST_OPTIONS = ['15 sec', '30 sec', '45 sec', '60 sec', '90 sec']
export const PROGRESSION_OPTIONS = [
  'Increase Repetitions', 'Increase Sets', 'Increase Hold', 'Increase Resistance', 'Progress to Next Exercise',
]

// Blank prescription for a newly-added exercise. `done` tracks whether the
// patient has completed it, ticked off during a follow-up visit.
export function blankPrescription(region, type, name) {
  return {
    region, type, name,
    sets: '3', reps: '10', hold: 'None', resistance: 'Bodyweight', frequency: 'Daily', rest: '30 sec',
    notes: '', progression: [], done: false,
  }
}
