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

  const logs = foodLogs ?? []
  const uniqueDays = new Set(logs.map(l => l.date)).size
  const avgCalories = uniqueDays > 0 ? Math.round(logs.reduce((s, l) => s + l.calories, 0) / uniqueDays) : null
  const avgCarbs = uniqueDays > 0 ? Math.round(logs.reduce((s, l) => s + l.carbs, 0) / uniqueDays) : null
  const avgProtein = uniqueDays > 0 ? Math.round(logs.reduce((s, l) => s + l.protein, 0) / uniqueDays) : null
  const avgFats = uniqueDays > 0 ? Math.round(logs.reduce((s, l) => s + l.fats, 0) / uniqueDays) : null

  const weightStart = weightLogs?.[0]?.weight_lbs ?? null
  const weightEnd = weightLogs?.[weightLogs.length - 1]?.weight_lbs ?? null

  // Build report prompt
  const strengthLabel = strength === 'up' ? 'increased' : strength === 'down' ? 'decreased' : 'stayed the same'
  const gymLabel = gym_consistency === 'consistent' ? 'was consistent at the gym' : gym_consistency === 'missed_some' ? 'missed some gym days' : "didn't really go to the gym"
  const sleepLabel = sleep === 'good' ? 'had good sleep' : sleep === 'alright' ? 'had alright sleep' : 'had poor sleep'
  const trackingLabel = tracking_quality === 'tracked_everything' ? 'tracked food every day' : tracking_quality === 'missed_some' ? 'missed some days of tracking' : 'mostly did not track food this week'

  const weightDelta = weightStart && weightEnd ? (weightEnd - weightStart).toFixed(1) : null

  const dataSection = [
    avgCalories !== null ? `- Average daily calories: ${avgCalories} kcal (goal: ${goals?.calories ?? 'N/A'} kcal)` : '- Calories: insufficient data',
    avgProtein !== null ? `- Average daily protein: ${avgProtein}g (goal: ${goals?.protein ?? 'N/A'}g)` : '- Protein: insufficient data',
    avgCarbs !== null ? `- Average daily carbs: ${avgCarbs}g` : '',
    avgFats !== null ? `- Average daily fats: ${avgFats}g` : '',
    weightStart ? `- Weight at start of week: ${weightStart} lbs` : '',
    weightEnd ? `- Weight at end of week: ${weightEnd} lbs` : '',
    weightDelta ? `- Weight change: ${Number(weightDelta) > 0 ? '+' : ''}${weightDelta} lbs` : '',
    `- Days with food logged: ${uniqueDays} of 7`,
  ].filter(Boolean).join('\n')

  const systemPrompt = `You are a no-nonsense fitness coach writing a concise weekly report for an intermediate lifter.

Your tone is direct, honest, and specific. No fluff. No excessive encouragement. Just signal.

Write EXACTLY 3 short paragraphs with these bold headers:
**What happened**
**Why**
**What to change**

Rules:
- Reference actual numbers from the data
- Connect the check-in answers to the outcomes
- "What to change" should give ONE clear, specific action — not a list
- If data is sparse, say so and focus on what's clear
- Keep each paragraph to 2-4 sentences
- Do not use bullet points in the report`

  const userMessage = `Week: ${weekStart} to ${weekEnd}
Goal mode: ${goals?.mode ?? 'maintain'}

Weekly data:
${dataSection}

User check-in:
- Strength this week: ${strengthLabel}
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
      max_tokens: 400,
      temperature: 0.5,
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
