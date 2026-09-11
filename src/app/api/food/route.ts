import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { todayCT, logDateCT } from '@/lib/utils'

function cacheKey(text: string): string {
  return createHash('sha256').update(text.toLowerCase().trim().replace(/\s+/g, ' ')).digest('hex')
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/food?mode=estimate  → returns breakdown WITHOUT saving (for confirm popup)
// POST /api/food?mode=save      → saves to DB
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mode = req.nextUrl.searchParams.get('mode') ?? 'save'
  const { text, date, macros, image, clarificationAnswers } = await req.json()

  // Mode: save — directly store pre-estimated macros (from confirm popup)
  if (mode === 'save' && macros) {
    const logDate = date ?? logDateCT()
    const { data, error } = await supabase.from('food_logs').insert({
      user_id: user.id,
      date: logDate,
      raw_text: text,
      calories: macros.total.calories,
      carbs: macros.total.carbs,
      protein: macros.total.protein,
      fats: macros.total.fats,
      meal_name: macros.meal_name ?? null,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Check save suggestion
    const mealName = macros.meal_name
    let suggestSave = false
    if (mealName) {
      const { count } = await supabase.from('food_logs').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('meal_name', mealName)
      const { data: alreadySaved } = await supabase.from('saved_meals').select('id')
        .eq('user_id', user.id).eq('name', mealName).maybeSingle()
      suggestSave = (count ?? 0) >= 3 && !alreadySaved
    }

    return NextResponse.json({ log: data, suggestSave, mealName })
  }

  // Mode: label — extract nutrition facts from a label image
  if (mode === 'label') {
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Read the nutrition label in this image. Return ONLY this JSON:
{
  "name": "product name (be specific)",
  "serving_size": "serving size as written on label e.g. '3/4 cup (170g)'",
  "calories": calories per serving as number,
  "protein": protein grams per serving as number,
  "carbs": total carbohydrate grams per serving as number,
  "fats": total fat grams per serving as number
}
Read values exactly as printed. Always return all fields.`,
            },
            { type: 'image_url', image_url: { url: image } },
          ],
        }],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0,
      })
      const parsed = JSON.parse(response.choices[0].message.content || '{}')
      return NextResponse.json({ label: parsed })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // Mode: estimate — call OpenAI, return breakdown without saving
  if (!text?.trim() && !image) return NextResponse.json({ error: 'No food text provided' }, { status: 400 })

  const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id).single()

  // clarificationAnswers is present (even as []) once the user has been through a clarification
  // round — that must stop the model from asking again, regardless of whether they answered.
  const clarificationProvided = Array.isArray(clarificationAnswers)
  const hasAnswers = clarificationProvided && clarificationAnswers.length > 0

  const clarificationInstruction = !clarificationProvided
    ? `Decide whether any missing detail would materially change the calorie/macro estimate — things like cooking method (grilled vs fried), sauce/dressing on a variable dish, or a completely unspecified portion size for a food that varies a lot by serving. Only ask about details that would meaningfully move the numbers; never ask about something that barely matters (e.g. don't ask about a single banana's ripeness, or the exact type of plain yogurt). Examples: "1 banana" or "170g plain Greek yogurt" need no questions. "Chicken sandwich" is worth asking whether the chicken is grilled or fried. "Pasta" is worth asking about the sauce if it isn't stated. "Chicken pulao" only needs a question if portion or preparation is genuinely unclear and would change the numbers. Ask 0 questions when the input is already clear, 1 when there's exactly one major uncertainty, and 2 only when two separate uncertainties each materially affect the estimate — never more than 2. For each question, generate the two most likely answers for this specific food (not generic placeholders), and a one-sentence "impact" explaining why it changes the estimate.`
    : hasAnswers
      ? `The user has already answered clarifying questions — see "Clarifying answers" below. Use them to refine your estimate. Set "clarification_needed" to false and "clarification_questions" to an empty array — do not ask anything further.`
      : `The user was asked clarifying questions but chose not to answer (skipped/unsure). Do not ask again — use sensible default assumptions, and set "clarification_needed" to false and "clarification_questions" to an empty array.`

  const systemPrompt = `You are a nutrition estimation assistant. Convert a food description into a structured macro breakdown.

User daily goals: ${goals?.calories ?? 2200} kcal, ${goals?.protein ?? 180}g protein.

Rules:
- Break the input into individual food items
- Use your nutritional knowledge for realistic calorie estimates — apply real-world calorie densities per 100g, not a 1:1 gram-to-calorie conversion
- Use weights/measurements if given; otherwise use realistic common portions
- If the user provides calories or protein numbers for a specific item, use those exact values
- Round all numbers to whole numbers
- meal_name: a short clean label for the whole meal (e.g. "Chicken & Rice Bowl")
- Never refuse — always return your best estimate, using sensible default assumptions for anything uncertain (even while clarification_needed is true)
- reasoning: 2–4 sentences explaining (1) which calorie density or reference you applied per item, (2) how you estimated portion size if not given, (3) any meaningful sources of uncertainty
- uncertainty: "low", "medium", or "high" — your overall confidence in this estimate
- ${clarificationInstruction}

Respond ONLY in this exact JSON format:
{
  "meal_name": "string",
  "reasoning": "string",
  "uncertainty": "low" | "medium" | "high",
  "clarification_needed": boolean,
  "clarification_questions": [
    { "question": "string", "likely_answers": ["string", "string"], "impact": "string" }
  ],
  "items": [
    { "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number }
  ],
  "total": { "calories": number, "protein": number, "carbs": number, "fats": number }
}`

  const clarificationContext = hasAnswers
    ? `\n\nClarifying answers:\n${clarificationAnswers.map((a: { question: string; answer: string }) => `- ${a.question}: ${a.answer}`).join('\n')}`
    : clarificationProvided
      ? `\n\n(No clarification details provided — use your best-guess defaults.)`
      : ''

  try {
    // Cache check — text only (images always re-estimate); a clarification round makes the input distinct
    const cacheableText = clarificationProvided ? `${text}||${JSON.stringify(clarificationAnswers)}` : text
    if (!image) {
      const key = cacheKey(cacheableText)
      const { data: cached } = await supabase
        .from('food_estimate_cache')
        .select('result')
        .eq('text_hash', key)
        .maybeSingle()
      if (cached) return NextResponse.json({ breakdown: cached.result })
    }

    const userContent = image
      ? [
          { type: 'text' as const, text: (text?.trim() ? text : 'What food is in this image? Estimate the macros.') + clarificationContext },
          { type: 'image_url' as const, image_url: { url: image } },
        ]
      : text + clarificationContext

    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 700,
      temperature: 0,
      seed: 42,
    })

    const parsed = JSON.parse(response.choices[0].message.content || '{}')

    // Store in cache for future identical inputs
    if (!image) {
      await supabase.from('food_estimate_cache').upsert({
        text_hash: cacheKey(cacheableText),
        result: parsed,
      })
    }

    return NextResponse.json({ breakdown: parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = req.nextUrl.searchParams.get('date') ?? logDateCT()
  const { data, error } = await supabase.from('food_logs').select('*')
    .eq('user_id', user.id).eq('date', date).order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, rawText, calories, protein, carbs, fats, meal_name } = await req.json()
  const updates: Record<string, unknown> = { calories, protein, carbs, fats, meal_name }
  if (rawText !== undefined) updates.raw_text = rawText
  const { data, error } = await supabase.from('food_logs')
    .update(updates)
    .eq('id', id).eq('user_id', user.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabase.from('food_logs').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
