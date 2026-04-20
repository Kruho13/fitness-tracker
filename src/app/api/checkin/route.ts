import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { currentWeekStartCT, currentWeekEndCT } from '@/lib/utils'

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

  const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id).single()

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

  const strengthLabel = strength === 'up' ? 'increased' : strength === 'down' ? 'decreased' : 'stayed the same'
  const gymLabel = gym_consistency === 'consistent' ? 'consistent' : gym_consistency === 'missed_some' ? 'missed some days' : 'mostly skipped'
  const sleepLabel = sleep === 'good' ? 'good' : sleep === 'alright' ? 'alright' : 'poor'
  const trackingLabel = tracking_quality === 'tracked_everything' ? 'every day' : tracking_quality === 'missed_some' ? 'most days' : 'sporadic'

  const dataSection = [
    `- Goal mode: ${goals?.mode ?? 'maintain'}`,
    `- Calorie goal: ${goals?.calories ?? 'N/A'} kcal/day`,
    `- Protein goal: ${goals?.protein ?? 'N/A'}g/day`,
    avgCalories !== null ? `- Avg daily calories this week: ${avgCalories} kcal` : '- Calories: insufficient data',
    calMin !== null && calMax !== null ? `- Calorie range this week: ${calMin}–${calMax} kcal (shows consistency or volatility)` : '',
    avgProtein !== null ? `- Avg daily protein: ${avgProtein}g` : '',
    avgCarbs !== null ? `- Avg daily carbs: ${avgCarbs}g` : '',
    avgFats !== null ? `- Avg daily fats: ${avgFats}g` : '',
    `- Days with food logged: ${uniqueDays} of 7`,
    perDayCalories ? `- Per-day calorie breakdown:\n${perDayCalories}` : '',
    weightStart ? `- Weight this week: ${weightStart} lbs → ${weightEnd ?? weightStart} lbs (${Number(weightDelta) > 0 ? '+' : ''}${weightDelta ?? 0} lbs)` : '- No weight data this week',
    weightTrendSummary ? `- 4-week weight trend: ${weightTrendSummary}` : '',
  ].filter(Boolean).join('\n')

  const systemPrompt = `You are a sharp, direct fitness coach writing a weekly report for an intermediate lifter. Your job is to find signal in the data — even when things look good on the surface.

Tone: specific, honest, coach-to-athlete. No cheerleading, no padding, no generic advice.

Write EXACTLY 3 short paragraphs with these bold headers:
**What happened**
**Why**
**Do this next week**

Critical rules:
- Every claim must reference a specific number from the data
- Compare this week to last week if previous data is available — trends matter more than single-week snapshots
- Look at the per-day calorie breakdown for patterns: weekend spikes, low days mid-week, inconsistency. Call them out by name
- If check-ins are all positive but weight moved the wrong direction, that's the story — dig into it
- If check-ins are all positive AND weight is moving correctly AND calories are on target: acknowledge it briefly, then find the next optimization — is protein consistently hitting? Is there a high-variance day that could derail a good streak? Is the calorie target potentially too conservative given the weight trend?
- "Do this next week" = one single specific action, not a general principle. Bad: "eat more protein." Good: "add 30g protein on your training days — you're hitting goal on rest days but dropping to ${avgProtein ?? 'X'}g on gym days"
- Never write "great job" or "keep it up" — these are filler
- 2-3 sentences per paragraph max
- No bullet points`

  const userMessage = `Week: ${weekStart} to ${weekEnd}

This week's data:
${dataSection}
${prevSection ? `\nPrevious week for comparison:\n${prevSection}` : ''}

Check-in:
- Strength: ${strengthLabel}
- Gym: ${gymLabel}
- Sleep: ${sleepLabel}
- Tracking: ${trackingLabel}

Write the weekly report. Find the real story in the numbers.`

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
