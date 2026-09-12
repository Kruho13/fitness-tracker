import { createClient } from '@/lib/supabase/server'
import { todayCT, daysAgoCT } from '@/lib/utils'
import { NUTRITION_PLUS_KEYS, sumMicronutrients, averageMicronutrients, balanceMessage, type Micronutrients, type FoodClassification, type FoodLogItem } from '@/lib/nutrition'

type Supabase = Awaited<ReturnType<typeof createClient>>

export interface NutritionAverages {
  loggedDays: number
  nutritionPlus: Record<(typeof NUTRITION_PLUS_KEYS)[number], number> | null
  micronutrients: Micronutrients | null
}

// Deterministic sum-over-logged-days average for Nutrition+ and micronutrients over the last N days.
// Shared by /api/nutrition (period selector) and Ask Pulse (data snapshot for the model).
export async function getNutritionAverages(supabase: Supabase, userId: string, days: number): Promise<NutritionAverages> {
  const today = todayCT()
  const startDate = days <= 1 ? today : daysAgoCT(days - 1)

  const { data: logs } = await supabase
    .from('food_logs')
    .select('date,fiber,sodium,sugar_added,saturated_fat,micronutrients')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', today)

  const rows = logs ?? []
  const loggedDays = new Set(rows.map(r => r.date)).size

  const plusTotals = { fiber: 0, sodium: 0, sugar_added: 0, saturated_fat: 0 }
  for (const row of rows) {
    for (const key of NUTRITION_PLUS_KEYS) plusTotals[key] += Number(row[key]) || 0
  }
  const divisor = loggedDays || 1
  const nutritionPlus = loggedDays > 0
    ? (Object.fromEntries(NUTRITION_PLUS_KEYS.map(key => [key, Math.round(plusTotals[key] / divisor)])) as NutritionAverages['nutritionPlus'])
    : null

  const microTotals = sumMicronutrients(rows.map(r => (r.micronutrients ?? {}) as Micronutrients))
  const micronutrients = loggedDays > 0 ? averageMicronutrients(microTotals, divisor) : null

  return { loggedDays, nutritionPlus, micronutrients }
}

export interface WeeklyBalance {
  hasData: boolean
  everydayCalories: number
  treatCalories: number
  everydayPct: number | null
  treatPct: number | null
  message: string | null
  topEveryday: { name: string; calories: number }[]
  topTreats: { name: string; calories: number }[]
}

// Rolling last-7-days 80/20 calorie split. Shared by /api/nutrition/balance and Ask Pulse.
export async function getWeeklyBalance(supabase: Supabase, userId: string): Promise<WeeklyBalance> {
  const today = todayCT()
  const startDate = daysAgoCT(6)

  const { data: logs } = await supabase
    .from('food_logs')
    .select('items')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', today)

  const items: FoodLogItem[] = (logs ?? []).flatMap(l => (Array.isArray(l.items) ? l.items : []) as FoodLogItem[])

  let everydayCalories = 0
  let treatCalories = 0
  const contributors: Record<FoodClassification, Map<string, number>> = {
    everyday: new Map(), treat: new Map(), neutral: new Map(), uncertain: new Map(),
  }

  for (const item of items) {
    const classification = item.classification ?? 'uncertain'
    const calories = Number(item.calories) || 0
    if (classification === 'everyday') everydayCalories += calories
    else if (classification === 'treat') treatCalories += calories

    const bucket = contributors[classification] ?? contributors.uncertain
    const key = item.name.trim()
    bucket.set(key, (bucket.get(key) ?? 0) + calories)
  }

  const denominator = everydayCalories + treatCalories
  const hasData = denominator > 0
  const everydayPct = hasData ? Math.round((everydayCalories / denominator) * 100) : null
  const treatPct = hasData ? 100 - (everydayPct ?? 0) : null

  const topContributors = (classification: FoodClassification, limit = 5) =>
    [...contributors[classification].entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, calories]) => ({ name, calories: Math.round(calories) }))

  return {
    hasData,
    everydayCalories: Math.round(everydayCalories),
    treatCalories: Math.round(treatCalories),
    everydayPct,
    treatPct,
    message: hasData ? balanceMessage(everydayPct!) : null,
    topEveryday: topContributors('everyday'),
    topTreats: topContributors('treat'),
  }
}
