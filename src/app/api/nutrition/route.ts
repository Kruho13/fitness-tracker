import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayCT, daysAgoCT } from '@/lib/utils'
import { NUTRITION_PLUS_KEYS, sumMicronutrients, averageMicronutrients, type Micronutrients } from '@/lib/nutrition'

export type NutritionPeriod = 'today' | '7d' | '30d'

const PERIOD_DAYS: Record<NutritionPeriod, number> = { today: 1, '7d': 7, '30d': 30 }

// GET /api/nutrition?period=today|7d|30d
// Returns deterministic per-day averages (sum over logged days / logged days) for
// Nutrition+ and micronutrients — all computed here, never asked of the model.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const periodParam = req.nextUrl.searchParams.get('period') ?? 'today'
  const period: NutritionPeriod = periodParam === '7d' || periodParam === '30d' ? periodParam : 'today'

  const today = todayCT()
  const startDate = period === 'today' ? today : daysAgoCT(PERIOD_DAYS[period] - 1)

  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('date,fiber,sodium,sugar_added,saturated_fat,micronutrients')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = logs ?? []
  const loggedDays = new Set(rows.map(r => r.date)).size

  const plusTotals = { fiber: 0, sodium: 0, sugar_added: 0, saturated_fat: 0 }
  for (const row of rows) {
    for (const key of NUTRITION_PLUS_KEYS) plusTotals[key] += Number(row[key]) || 0
  }

  const divisor = period === 'today' ? 1 : loggedDays
  const nutritionPlus = loggedDays > 0
    ? Object.fromEntries(NUTRITION_PLUS_KEYS.map(key => [key, Math.round(plusTotals[key] / divisor)])) as Record<(typeof NUTRITION_PLUS_KEYS)[number], number>
    : null

  const micronutrientTotals = sumMicronutrients(rows.map(r => (r.micronutrients ?? {}) as Micronutrients))
  const micronutrients = loggedDays > 0 ? averageMicronutrients(micronutrientTotals, divisor) : null

  return NextResponse.json({ period, loggedDays, nutritionPlus, micronutrients })
}
