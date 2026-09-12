import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNutritionAverages } from '@/lib/nutrition-data'

export type NutritionPeriod = 'today' | '7d' | '30d'

const PERIOD_DAYS: Record<NutritionPeriod, number> = { today: 1, '7d': 7, '30d': 30 }

// GET /api/nutrition?period=today|7d|30d
// Returns deterministic per-day averages (sum over logged days / logged days) for
// Nutrition+ and micronutrients — all computed in getNutritionAverages, never asked of the model.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const periodParam = req.nextUrl.searchParams.get('period') ?? 'today'
  const period: NutritionPeriod = periodParam === '7d' || periodParam === '30d' ? periodParam : 'today'

  const { loggedDays, nutritionPlus, micronutrients } = await getNutritionAverages(supabase, user.id, PERIOD_DAYS[period])

  return NextResponse.json({ period, loggedDays, nutritionPlus, micronutrients })
}
