// Exercise library for the Fitness module — mirrors the Region → Type →
// Exercise structure used by Rehab & Exercises (see rehabExercises.js), with
// its own region/exercise set built for general training rather than
// clinical rehab. The generic prescription option lists (sets/reps/hold/etc.)
// are shared with Rehab — imported straight from there rather than duplicated.
export {
  SETS_OPTIONS, REPS_OPTIONS, HOLD_OPTIONS, RESISTANCE_OPTIONS, FREQUENCY_OPTIONS, REST_OPTIONS, PROGRESSION_OPTIONS,
} from './rehabExercises'

export const FITNESS_REGIONS = [
  'Shoulder', 'Chest', 'Back', 'Arms', 'Legs', 'Core & Abs', 'Cardio', 'Walking Variations', 'Whole Body',
]

// Most regions have one flat "Strength" list; Arms splits into Biceps/Triceps;
// Cardio & Walking Variations use "Cardio".
export const FITNESS_TYPES = ['Strength', 'Biceps', 'Triceps', 'Cardio']

const SHOULDER = [
  'Shoulder Press DB', 'Arnold Press DB', 'Front Raise DB', 'Side Raise DB', 'Shrugs DB', 'Upright Rows DB',
  'Upright Rows KB', 'Face Pulls Cable', 'V-Ups DB', 'Wall Angels', 'Resistance Band External Rotation',
  'Y-T Raise', 'High Plank Hold', 'High Plank Rocks', 'High Plank to Elbow Plank', 'High Plank Shoulder Taps',
]

const CHEST = [
  'Incline Pushups', 'Diamond Pushups', 'Wide Grip Pushups', 'Chest Press DB', 'Chest Press BB', 'Chest Fly DB',
  'Chest Fly Cable', 'Chest Front Push DB', 'Lat Pullover DB', 'Horizontal Abduction Resistance Band',
]

const BACK = [
  'Cable Lat Pulldown', 'Cable Rowing', 'Cable Face Pulls', 'Single-Hand DB Rowing', 'Reverse Fly', 'BB Bent Over Rows',
  'Deadlifts', 'RDL', 'Single-Leg RDL', 'Stability Ball Back Extensions', 'Stability Ball Leg Extensions',
  'Prone Upper Back Extension', 'Wall Y Raises', 'Prone Y Raises', 'Y-T Raises', 'Prone Angels',
]

const LEGS = [
  'Squats', 'VMO Squats', 'Goblet Squats', 'Sumo Squats', 'BB Squats', 'Static Lunges', 'Reverse Lunges',
  'Curtsy Lunges', 'Lunge Walk', 'Side Squats', 'Step Up and Down', 'Side Step Ups', 'Calf Raises',
  'Stepper Calf Raises', 'Single-Leg Calf Raises', 'Resistance Band Hamstring Curls', 'Stability Ball Hamstring Curls',
  'Single-Leg Hamstring Bridges', 'Kettlebell Tibialis Anterior Activations',
]

const BICEPS = [
  'DB Biceps Curl', 'DB Hammer Curl', 'DB Concentration Curl', 'DB Zottman Curl', 'DB Reverse Dumbbell Curl',
  'DB Isometric Curl Hold', 'Cable Biceps Curl', 'Cable Single-Arm Curl',
]

const TRICEPS = [
  'Overhead DB Triceps Extension', 'DB Single-Arm Triceps Extension', 'DB Overhead Extension', 'DB Triceps Kickback',
  'DB Skull Crusher', 'DB Floor Press', 'DB Triceps Pullover', 'Cable Pushdown', 'Cable Straight-Bar Pushdown',
  'Cable Single-Arm Pushdown', 'Cable Single-Arm Overhead Extension', 'Cable Skull Crusher',
]

const CARDIO = [
  'Butt Kicks', 'Marching in Place', 'Jump Squats', 'Mountain Climbers', 'Jumping Jacks', 'Shadow Boxing',
  'Speed Punches', 'Shuffle', 'Standing Cross Crunches', 'Box Step Up and Down', 'Step Up with Knee Drive',
  'Medicine Ball March with Overhead Hold', 'Cone Shuttle Run',
]

// Regions with no preset list yet (Whole Body, Walking Variations, Core &
// Abs) are still selectable — admin can add exercises for them inline via
// the same "Add your own" picker Rehab already has.
export const EXERCISES_BY_TYPE = {
  Strength: { Shoulder: SHOULDER, Chest: CHEST, Back: BACK, Legs: LEGS, 'Core & Abs': [], 'Whole Body': [] },
  Biceps: { Arms: BICEPS },
  Triceps: { Arms: TRICEPS },
  Cardio: { Cardio: CARDIO, 'Walking Variations': [] },
}

export function typesForRegion(region) {
  return FITNESS_TYPES.filter((t) => EXERCISES_BY_TYPE[t][region] !== undefined)
}

export function exercisesFor(region, type) {
  return EXERCISES_BY_TYPE[type]?.[region] || []
}

// Blank prescription for a newly-added exercise. `done` tracks whether the
// client has completed it, ticked off during a session.
export function blankPrescription(region, type, name) {
  return {
    region, type, name,
    sets: '3', reps: '12', hold: 'None', resistance: 'Bodyweight', frequency: '3× Week', rest: '60 sec',
    notes: '', progression: [], done: false,
  }
}
