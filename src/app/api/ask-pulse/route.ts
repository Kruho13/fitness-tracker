import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { daysAgoCT } from '@/lib/utils'
import { calculateMacros, type Gender, type ActivityLevel, type GoalMode } from '@/lib/calculations'
import { getNutritionAverages, getWeeklyBalance } from '@/lib/nutrition-data'
import {
  NUTRITION_PLUS_KEYS, NUTRITION_PLUS_REFERENCE, MICRONUTRIENT_REFERENCE,
  MINERAL_KEYS, VITAMIN_KEYS, nutrientContext, percentOfReference, type FoodLogItem,
} from '@/lib/nutrition'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Chat has no server-side persistence yet (appropriate for this stage) — the client
// resends recent turns each request, capped here so token usage can't grow unbounded.
const MAX_HISTORY_TURNS = 10

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'No message provided' }, { status: 400 })

  const [{ data: profile }, { data: goals }, { data: latestWeight }, { data: weightTrend }, { data: foodLogs }] = await Promise.all([
    supabase.from('user_profiles').select('gender,weight_lbs,height_cm,age,activity_level').eq('user_id', user.id).single(),
    supabase.from('goals').select('*').eq('user_id', user.id).single(),
    supabase.from('weight_logs').select('weight_lbs,date').eq('user_id', user.id).order('date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('weight_logs').select('date,weight_lbs').eq('user_id', user.id).gte('date', daysAgoCT(27)).order('date', { ascending: true }),
    supabase.from('food_logs').select('date,meal_name,raw_text,calories,protein,items').eq('user_id', user.id).gte('date', daysAgoCT(6)).order('date', { ascending: false }),
  ])

  const [nutritionAverages, balance] = await Promise.all([
    getNutritionAverages(supabase, user.id, 7),
    getWeeklyBalance(supabase, user.id),
  ])

  const currentWeight = latestWeight?.weight_lbs ?? profile?.weight_lbs ?? null
  const tdee = profile && currentWeight
    ? calculateMacros(profile.gender as Gender, currentWeight, profile.height_cm, profile.age, profile.activity_level as ActivityLevel, (goals?.mode ?? 'maintain') as GoalMode).tdee
    : null

  const weightTrendSummary = (weightTrend?.length ?? 0) >= 2
    ? `${weightTrend![0].weight_lbs} lbs (${weightTrend![0].date}) -> ${weightTrend![weightTrend!.length - 1].weight_lbs} lbs (${weightTrend![weightTrend!.length - 1].date})`
    : 'not enough weight logs for a trend'

  const foodLogLines = (foodLogs ?? []).map(log => {
    const items = Array.isArray(log.items) ? (log.items as FoodLogItem[]) : []
    const itemsList = items.length ? items.map(i => `${i.name} [${i.classification ?? 'uncertain'}]`).join(', ') : null
    return `  ${log.date} — ${log.meal_name ?? log.raw_text}: ${log.calories} kcal, ${log.protein}g protein${itemsList ? ` (${itemsList})` : ''}`
  }).join('\n') || '  Nothing logged'

  const nutritionPlusLines = nutritionAverages.nutritionPlus
    ? NUTRITION_PLUS_KEYS.map(key => {
        const value = nutritionAverages.nutritionPlus![key]
        const ref = NUTRITION_PLUS_REFERENCE[key]
        return `  ${ref.label}: ${value}${ref.unit}/day avg — ${nutrientContext(value, ref)}`
      }).join('\n')
    : '  Not enough logged days this week to average'

  const microLines = nutritionAverages.micronutrients
    ? [...MINERAL_KEYS, ...VITAMIN_KEYS].map(key => {
        const value = nutritionAverages.micronutrients?.[key]
        if (typeof value !== 'number') return null
        const ref = MICRONUTRIENT_REFERENCE[key]
        return `  ${ref.label}: ${Math.round(value * 10) / 10}${ref.unit}/day avg (${percentOfReference(value, ref)}% of target)`
      }).filter(Boolean).join('\n') || '  No micronutrient data yet'
    : '  Not enough logged days this week to average'

  const dataSection = `
Goals: ${goals?.mode ?? 'maintain'} mode, ${goals?.calories ?? 'N/A'} kcal/day target, ${goals?.protein ?? 'N/A'}g protein target
${tdee ? `Estimated maintenance (TDEE): ${tdee} kcal/day` : 'TDEE unavailable — profile incomplete'}
Current weight: ${currentWeight ?? 'not logged'} lbs
4-week weight trend: ${weightTrendSummary}

7-day Nutrition+ averages:
${nutritionPlusLines}

7-day micronutrient averages:
${microLines}

Weekly 80/20 balance (last 7 days): ${balance.hasData ? `${balance.everydayPct}% everyday, ${balance.treatPct}% treats — ${balance.message}` : 'not enough classified data yet'}
${balance.topTreats.length ? `Top treat contributors: ${balance.topTreats.map(t => `${t.name} (${t.calories} kcal)`).join(', ')}` : ''}
${balance.topEveryday.length ? `Top everyday contributors: ${balance.topEveryday.map(t => `${t.name} (${t.calories} kcal)`).join(', ')}` : ''}

Food logged in the last 7 days:
${foodLogLines}
`.trim()

  const systemPrompt = `You are Ask Pulse, a data-grounded assistant inside the Pulse fitness app. You answer the user's questions about their OWN logged nutrition, weight, and progress — nothing else.

Rules:
- Answer using ONLY the data provided below. If it doesn't cover what's asked, say so plainly instead of guessing.
- Be direct and concise — a few sentences, not an essay. Only go longer if the question genuinely needs it.
- Never claim clinical or biological status: no "you are deficient in X", no claims about absorption, blood levels, or diagnosis. Say things like "your estimated vitamin D intake has been below the reference target recently" instead.
- All nutrition numbers are estimates from logged food, not lab measurements — reflect that uncertainty, don't state estimates as exact facts.
- Use "everyday" / "treat" / "balance" / "moderation" language for the 80/20 system — never "healthy/unhealthy" or "good/bad", and never frame a treat as a failure.
- If asked something unrelated to the user's own fitness/nutrition data, briefly redirect — you're scoped to their Pulse data, not general advice.

User's data:
${dataSection}`

  const trimmedHistory: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(history)
    ? history.slice(-MAX_HISTORY_TURNS).filter((m: unknown): m is { role: 'user' | 'assistant'; content: string } =>
        !!m && typeof m === 'object' && ('role' in m) && ('content' in m))
    : []

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...trimmedHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
      max_completion_tokens: 500,
      reasoning_effort: 'low',
    })

    const reply = response.choices[0].message.content ?? "I couldn't come up with an answer to that — try rephrasing?"
    return NextResponse.json({ reply })
  } catch (err) {
    const messageText = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: messageText }, { status: 500 })
  }
}
