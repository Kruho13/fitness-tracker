// Shared reference values, types, and formatting for Nutrition+, micronutrients,
// and 80/20 Weekly Balance. Reference values are general adult FDA Daily Values —
// not personalized per user (appropriate for this stage of the product).

export type FoodClassification = 'everyday' | 'treat' | 'neutral' | 'uncertain'

export const CLASSIFIER_VERSION = 'v1'

export const CLASSIFICATION_LABELS: Record<FoodClassification, string> = {
  everyday: 'Everyday',
  treat: 'Treat',
  neutral: 'Neutral',
  uncertain: 'Uncertain',
}

export interface FoodLogItem {
  name: string
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber?: number
  sodium?: number
  saturated_fat?: number
  sugar_added?: number
  classification?: FoodClassification
  classification_confidence?: number
  classifier_version?: string
}

export interface Micronutrients {
  potassium_mg?: number
  calcium_mg?: number
  iron_mg?: number
  magnesium_mg?: number
  zinc_mg?: number
  vitamin_a_mcg?: number
  vitamin_b12_mcg?: number
  vitamin_c_mg?: number
  vitamin_d_mcg?: number
  vitamin_e_mg?: number
  vitamin_k_mcg?: number
}

interface NutrientReference {
  label: string
  unit: string
  value: number
  direction: 'target' | 'limit'
  display: 'percent' | 'qualitative'
}

export const NUTRITION_PLUS_KEYS = ['fiber', 'sodium', 'sugar_added', 'saturated_fat'] as const
export type NutritionPlusKey = (typeof NUTRITION_PLUS_KEYS)[number]

// FDA general adult Daily Values (2000 kcal reference diet)
export const NUTRITION_PLUS_REFERENCE: Record<NutritionPlusKey, NutrientReference> = {
  fiber: { label: 'Fiber', unit: 'g', value: 28, direction: 'target', display: 'percent' },
  sodium: { label: 'Sodium', unit: 'mg', value: 2300, direction: 'limit', display: 'percent' },
  sugar_added: { label: 'Added Sugar', unit: 'g', value: 50, direction: 'limit', display: 'qualitative' },
  saturated_fat: { label: 'Saturated Fat', unit: 'g', value: 20, direction: 'limit', display: 'qualitative' },
}

export const MINERAL_KEYS: (keyof Micronutrients)[] = ['potassium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg']
export const VITAMIN_KEYS: (keyof Micronutrients)[] = [
  'vitamin_a_mcg', 'vitamin_b12_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_e_mg', 'vitamin_k_mcg',
]

// FDA general adult Daily Values (supplement facts reference)
export const MICRONUTRIENT_REFERENCE: Record<keyof Micronutrients, NutrientReference> = {
  potassium_mg: { label: 'Potassium', unit: 'mg', value: 4700, direction: 'target', display: 'percent' },
  calcium_mg: { label: 'Calcium', unit: 'mg', value: 1300, direction: 'target', display: 'percent' },
  iron_mg: { label: 'Iron', unit: 'mg', value: 18, direction: 'target', display: 'percent' },
  magnesium_mg: { label: 'Magnesium', unit: 'mg', value: 420, direction: 'target', display: 'percent' },
  zinc_mg: { label: 'Zinc', unit: 'mg', value: 11, direction: 'target', display: 'percent' },
  vitamin_a_mcg: { label: 'Vitamin A', unit: 'mcg', value: 900, direction: 'target', display: 'percent' },
  vitamin_b12_mcg: { label: 'Vitamin B12', unit: 'mcg', value: 2.4, direction: 'target', display: 'percent' },
  vitamin_c_mg: { label: 'Vitamin C', unit: 'mg', value: 90, direction: 'target', display: 'percent' },
  vitamin_d_mcg: { label: 'Vitamin D', unit: 'mcg', value: 20, direction: 'target', display: 'percent' },
  vitamin_e_mg: { label: 'Vitamin E', unit: 'mg', value: 15, direction: 'target', display: 'percent' },
  vitamin_k_mcg: { label: 'Vitamin K', unit: 'mcg', value: 120, direction: 'target', display: 'percent' },
}

export const NUTRITION_DISCLAIMER =
  'Estimated from your logged foods. Actual nutrient content may vary based on ingredients, preparation and portion size.'

export function percentOfReference(value: number, ref: NutrientReference): number {
  if (ref.value <= 0) return 0
  return Math.round((value / ref.value) * 100)
}

// Matches the exact copy from the Nutrition+ spec: percent nutrients show "X% of target" /
// "X% of reference limit"; qualitative nutrients (added sugar, saturated fat) just show
// whether they're within or above the reference — no fabricated precision.
export function nutrientContext(value: number, ref: NutrientReference): string {
  if (ref.display === 'qualitative') {
    return value > ref.value ? 'Above reference' : 'Within reference'
  }
  const pct = percentOfReference(value, ref)
  return ref.direction === 'limit' ? `${pct}% of reference limit` : `${pct}% of target`
}

const ALL_MICRONUTRIENT_KEYS = [...MINERAL_KEYS, ...VITAMIN_KEYS]

export function sumMicronutrients(rows: Micronutrients[]): Micronutrients {
  const totals: Micronutrients = {}
  for (const row of rows) {
    for (const key of ALL_MICRONUTRIENT_KEYS) {
      const v = row[key]
      if (typeof v === 'number') totals[key] = (totals[key] ?? 0) + v
    }
  }
  return totals
}

export function averageMicronutrients(totals: Micronutrients, days: number): Micronutrients {
  if (days <= 0) return {}
  const out: Micronutrients = {}
  for (const key of ALL_MICRONUTRIENT_KEYS) {
    const v = totals[key]
    if (typeof v === 'number') out[key] = v / days
  }
  return out
}

// Non-judgmental, descriptive framing per the 80/20 philosophy — never "good"/"bad".
export function balanceMessage(everydayPct: number): string {
  if (everydayPct >= 75 && everydayPct <= 85) return 'Right around 80/20'
  if (everydayPct > 85) return 'Mostly everyday foods this week'
  if (everydayPct >= 60) return 'More treats than usual this week'
  return 'Treats made up a big share this week'
}
