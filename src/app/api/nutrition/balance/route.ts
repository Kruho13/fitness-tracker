import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayCT, daysAgoCT } from '@/lib/utils'
import { balanceMessage, type FoodClassification, type FoodLogItem } from '@/lib/nutrition'

// GET /api/nutrition/balance — always a rolling last-7-days window, independent of the
// Nutrition page's Today/7D/30D selector (this is specifically the "Weekly" Balance).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = todayCT()
  const startDate = daysAgoCT(6)

  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('items')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

  return NextResponse.json({
    hasData,
    everydayCalories: Math.round(everydayCalories),
    treatCalories: Math.round(treatCalories),
    everydayPct,
    treatPct,
    message: hasData ? balanceMessage(everydayPct!) : null,
    topEveryday: topContributors('everyday'),
    topTreats: topContributors('treat'),
  })
}
