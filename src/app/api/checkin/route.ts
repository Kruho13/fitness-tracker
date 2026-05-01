import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { currentWeekStartCT, currentWeekEndCT } from '@/lib/utils'
import { calculateMacros, type Gender, type ActivityLevel, type GoalMode } from '@/lib/calculations'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { strength, gym_consistency, sleep, tracking_quality } = await req.json()

  const weekStart = currentWeekStartCT()
  const weekEnd = currentWeekEndCT()

  // Save check-in
  await supabase.from('weekly_checkins').upsert(
    { user_id: user.id, week_start: weekStart, strength, gym_consistency, sleep, tracking_quality },
    { onConflict: 'user_id,week_start' }
  )

  // Aggregate this week's food data
  const { data: foodLogs } = await supabase
    .from('food_logs')
    .select('date,calories,carbs,protein,fats')
    .eq('user_id', user.id)
    .gte('date', weekStart)
    .lte('date', weekEnd)

  const [{ data: goals }, { data: profile }] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', user.id).single(),
    supabase.from('user_profiles').select('gender,weight_lbs,height_cm,age,activity_level').eq('user_id', user.id).single(),
  ])

  // Get weight at start and end of week
  const { data: weightLogs } = await supabase
    .from('weight_logs')
    .select('date,weight_lbs')
    .eq('user_id', user.id)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date', { ascending: true })

  // Get previous week's report for comparison context
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0]
  const { data: prevReport } = await supabase
    .from('weekly_reports')
    .select('avg_calories,avg_protein,weight_start,weight_end,days_logged')
    .eq('user_id', user.id)
    .eq('week_start', prevWeekStartStr)
    .maybeSingle()

  // Get 4-week weight trend
  const fourWeeksAgo = new Date(weekStart)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const { data: weightTrend } = await supabase
    .from('weight_logs')
    .select('date,weight_lbs')
    .eq('user_id', user.id)
    .gte('date', fourWeeksAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const logs = foodLogs ?? []
  const uniqueDays = new Set(logs.map(l => l.date)).size
  const avgCalories = uniqueDays > 0 ? Math.round(logs.reduce((s, l) => s + l.calories, 0) / uniqueDays) : null
  const avgCarbs = uniqueDays > 0 ? Math.round(logs.reduce((s, l) => s + l.carbs, 0) / uniqueDays) : null
  const avgProtein = uniqueDays > 0 ? Math.round(logs.reduce((s, l) => s + l.protein, 0) / uniqueDays) : null
  const avgFats = uniqueDays > 0 ? Math.round(logs.reduce((s, l) => s + l.fats, 0) / uniqueDays) : null

  const weightStart = weightLogs?.[0]?.weight_lbs ?? null
  const weightEnd = weightLogs?.[weightLogs.length - 1]?.weight_lbs ?? null
  const weightDelta = weightStart && weightEnd ? (weightEnd - weightStart).toFixed(1) : null

  // Per-day calorie breakdown to expose patterns
  const dayMap: Record<string, number> = {}
  for (const l of logs) {
    dayMap[l.date] = (dayMap[l.date] ?? 0) + l.calories
  }
  const perDayCalories = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cal]) => `  ${date}: ${cal} kcal`)
    .join('\n')

  // Calorie consistency stats
  const dayCalValues = Object.values(dayMap)
  const calMin = dayCalValues.length ? Math.min(...dayCalValues) : null
  const calMax = dayCalValues.length ? Math.max(...dayCalValues) : null

  // 4-week weight trend summary
  const trendWeights = weightTrend ?? []
  const weightTrendSummary = trendWeights.length >= 2
    ? `${trendWeights[0].weight_lbs} lbs (${trendWeights[0].date}) → ${trendWeights[trendWeights.length - 1].weight_lbs} lbs (${trendWeights[trendWeights.length - 1].date})`
    : null

  // Previous week comparison
  const prevSection = prevReport ? [
    prevReport.avg_calories !== null ? `- Previous week avg calories: ${prevReport.avg_calories} kcal` : '',
    prevReport.avg_protein !== null ? `- Previous week avg protein: ${prevReport.avg_protein}g` : '',
    prevReport.days_logged !== null ? `- Previous week days logged: ${prevReport.days_logged}` : '',
    prevReport.weight_end !== null ? `- Previous week ending weight: ${prevReport.weight_end} lbs` : '',
  ].filter(Boolean).join('\n') : null

  // TDEE and actual deficit/surplus
  let tdee: number | null = null
  if (profile) {
    tdee = calculateMacros(
      profile.gender as Gender,
      profile.weight_lbs,
      profile.height_cm,
      profile.age,
      profile.activity_level as ActivityLevel,
      (goals?.mode ?? 'maintain') as GoalMode
    ).tdee
  }
  const actualDeficitSurplus = tdee && avgCalories !== null ? tdee - avgCalories : null

  // Stall detection: compare first-half vs second-half of 4-week weight trend
  let stallNote = ''
  if (goals?.mode && goals.mode !== 'maintain' && trendWeights.length >= 4 && uniqueDays >= 3) {
    const mid = Math.floor(trendWeights.length / 2)
    const firstAvg = trendWeights.slice(0, mid).reduce((s, w) => s + w.weight_lbs, 0) / mid
    const secondAvg = trendWeights.slice(mid).reduce((s, w) => s + w.weight_lbs, 0) / (trendWeights.length - mid)
    const trendDelta = secondAvg - firstAvg
    if ((goals.mode === 'cut' || goals.mode === 'cut_aggressive') && trendDelta > -0.3) {
      stallNote = 'weight trend is flat or rising despite being in a cut — user may be stalling'
    } else if (goals.mode === 'lean_bulk' && trendDelta < 0.2) {
      stallNote = 'weight trend is flat or dropping despite being in a bulk — user may be stalling'
    }
  }

  const strengthLabel = strength === 'up' ? 'increased' : strength === 'down' ? 'decreased' : 'stayed the same'
  const gymLabel = gym_consistency === 'consistent' ? 'consistent' : gym_consistency === 'missed_some' ? 'missed some days' : 'mostly skipped'
  const sleepLabel = sleep === 'good' ? 'good' : sleep === 'alright' ? 'alright' : 'poor'
  const trackingLabel = tracking_quality === 'tracked_everything' ? 'every day' : tracking_quality === 'missed_some' ? 'most days' : 'sporadic'

  const dataSection = [
    `- Goal mode: ${goals?.mode ?? 'maintain'}`,
    tdee ? `- Maintenance calories (TDEE): ${tdee} kcal/day` : '',
    `- Calorie goal: ${goals?.calories ?? 'N/A'} kcal/day`,
    `- Protein goal: ${goals?.protein ?? 'N/A'}g/day`,
    avgCalories !== null ? `- Avg daily calories this week: ${avgCalories} kcal` : '- Calories: insufficient data',
    actualDeficitSurplus !== null ? `- Actual deficit/surplus vs maintenance: ${actualDeficitSurplus > 0 ? '-' : '+'}${Math.abs(actualDeficitSurplus)} kcal/day (${actualDeficitSurplus > 0 ? 'deficit' : 'surplus'})` : '',
    stallNote ? `- STALL ALERT: ${stallNote}` : '',
    calMin !== null && calMax !== null ? `- Calorie range this week: ${calMin}–${calMax} kcal (shows consistency or volatility)` : '',
    avgProtein !== null ? `- Avg daily protein: ${avgProtein}g` : '',
    avgCarbs !== null ? `- Avg daily carbs: ${avgCarbs}g` : '',
    avgFats !== null ? `- Avg daily fats: ${avgFats}g` : '',
    `- Days with food logged: ${uniqueDays} of 7`,
    perDayCalories ? `- Per-day calorie breakdown:\n${perDayCalories}` : '',
    weightStart ? `- Weight this week: ${weightStart} lbs → ${weightEnd ?? weightStart} lbs (${Number(weightDelta) > 0 ? '+' : ''}${weightDelta ?? 0} lbs)` : '- No weight data this week',
    weightTrendSummary ? `- 4-week weight trend: ${weightTrendSummary}` : '',
  ].filter(Boolean).join('\n')

  const systemPrompt = `You are a direct, no-fluff fitness coach. Write a weekly report for an intermediate lifter. Use bold headers for 3 short sections.

**What happened**
2 sentences max. Use exact numbers — avg calories logged, actual deficit or surplus vs maintenance (TDEE), and weight change. Compare calories to TDEE, not just the calorie goal.

**Why**
2 sentences max. Connect the check-in responses (strength, gym, sleep, tracking) directly to the outcome. If a STALL ALERT is present, name the likely cause plainly — don't soften it.

**Adjust next week**
1–2 sentences. Be specific and numeric. If a STALL ALERT is present: suggest a concrete change — e.g. reduce daily calories by 150–200 kcal, shift carbs around training, or add a deficit day. If on track: "hold the approach" is valid. Never give more than one adjustment. If tracking days < 4, make that the priority before any macro change.

Rules: no bullet points, no praise padding. Use exact figures from the data. Do not reference the STALL ALERT label directly in your output — just act on it.`

  const userMessage = `Week: ${weekStart} to ${weekEnd}

This week's data:
${dataSection}
${prevSection ? `\nPrevious week for comparison:\n${prevSection}` : ''}

Check-in:
- Strength: ${strengthLabel}
- Gym: ${gymLabel}
- Sleep: ${sleepLabel}
- Tracking: ${trackingLabel}

Write the weekly report.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
      temperature: 0.7,
    })

    const reportText = response.choices[0].message.content ?? 'Unable to generate report.'

    const { data: report, error } = await supabase
      .from('weekly_reports')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
        report_text: reportText,
        avg_calories: avgCalories,
        avg_carbs: avgCarbs,
        avg_protein: avgProtein,
        avg_fats: avgFats,
        weight_start: weightStart,
        weight_end: weightEnd,
        days_logged: uniqueDays,
        goal_calories: goals?.calories ?? null,
        goal_protein: goals?.protein ?? null,
        goal_carbs: goals?.carbs ?? null,
        goal_fats: goals?.fats ?? null,
        goal_mode: goals?.mode ?? null,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
