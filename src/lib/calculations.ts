export type GoalMode = 'cut_aggressive' | 'cut' | 'maintain' | 'lean_bulk'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'
export type Gender = 'male' | 'female'

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  lightly_active: 'Lightly active (1–3 days/week)',
  moderately_active: 'Moderately active (3–5 days/week)',
  very_active: 'Very active (6–7 days/week)',
  extra_active: 'Extra active (athlete / physical job)',
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
}

export const GOAL_LABELS: Record<GoalMode, string> = {
  cut_aggressive: 'Aggressive Cut',
  cut: 'Cut',
  maintain: 'Maintain / Recomp',
  lean_bulk: 'Lean Bulk',
}

export const GOAL_DESCRIPTIONS: Record<GoalMode, string> = {
  cut_aggressive: 'Lose fat fast — 750 kcal deficit. High protein to preserve muscle.',
  cut: 'Steady fat loss — 500 kcal deficit. Sustainable over months.',
  maintain: 'Hold weight or slowly recomp. Great for body composition.',
  lean_bulk: 'Slow muscle gain — small surplus with controlled fat gain.',
}

export interface MacroTargets {
  calories: number
  protein: number
  carbs: number
  fats: number
  tdee: number
}

export function calculateBMR(gender: Gender, weight_lbs: number, height_cm: number, age: number): number {
  const weight_kg = weight_lbs * 0.453592
  if (gender === 'male') {
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  }
  return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
}

export function calculateMacros(
  gender: Gender,
  weight_lbs: number,
  height_cm: number,
  age: number,
  activity: ActivityLevel,
  goal: GoalMode
): MacroTargets {
  const bmr = calculateBMR(gender, weight_lbs, height_cm, age)
  const tdee = calculateTDEE(bmr, activity)

  const calorieAdjustments: Record<GoalMode, number> = {
    cut_aggressive: -750,
    cut: -500,
    maintain: 0,
    lean_bulk: 250,
  }

  const proteinMultipliers: Record<GoalMode, number> = {
    cut_aggressive: 1.1, // g per lb — higher to preserve muscle on aggressive cut
    cut: 0.95,
    maintain: 0.85,
    lean_bulk: 0.8,
  }

  const calories = Math.max(1200, Math.round(tdee + calorieAdjustments[goal]))
  const protein = Math.round(weight_lbs * proteinMultipliers[goal])
  const fats = Math.round((calories * 0.25) / 9) // 25% of cals from fat
  const carbCals = calories - protein * 4 - fats * 9
  const carbs = Math.max(50, Math.round(carbCals / 4))

  return { calories, protein, carbs, fats, tdee }
}

export function heightToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54)
}
