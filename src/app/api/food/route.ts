import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { todayCT, logDateCT } from '@/lib/utils'
import { CLASSIFIER_VERSION, NUTRITION_PLUS_KEYS, type FoodClassification } from '@/lib/nutrition'

function cacheKey(text: string): string {
  return createHash('sha256').update(text.toLowerCase().trim().replace(/\s+/g, ' ')).digest('hex')
}

const VALID_CLASSIFICATIONS: FoodClassification[] = ['everyday', 'treat', 'neutral', 'uncertain']

type EstimateItemLike = Record<string, unknown>
interface MacrosLike {
  total?: Record<string, unknown>
  items?: EstimateItemLike[]
  micronutrients?: unknown
  meal_name?: string
}

// Nutrition+ totals are summed from the per-item breakdown when present (the estimate flow),
// falling back to a flat total (label scans, which have no items) — never asked of the model
// directly, so there's one deterministic source of truth instead of two numbers that can drift.
function nutrientTotal(macros: MacrosLike, key: (typeof NUTRITION_PLUS_KEYS)[number]): number {
  if (Array.isArray(macros.items) && macros.items.length) {
    return Math.round(macros.items.reduce((s, i) => s + (Number(i[key]) || 0), 0))
  }
  return Math.round(Number(macros.total?.[key]) || 0)
}

// Stamps each item with the classifier version and normalizes the classification field,
// so historical logs carry a fixed record of which classifier produced them.
function stampItems(items: EstimateItemLike[]): EstimateItemLike[] {
  return items.map(item => {
    const classification = typeof item.classification === 'string' && (VALID_CLASSIFICATIONS as string[]).includes(item.classification)
      ? (item.classification as FoodClassification)
      : 'uncertain'
    return {
      ...item,
      classification,
      classification_confidence: typeof item.classification_confidence === 'number' ? item.classification_confidence : null,
      classifier_version: CLASSIFIER_VERSION,
    }
  })
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
      fiber: nutrientTotal(macros, 'fiber'),
      sodium: nutrientTotal(macros, 'sodium'),
      sugar_added: nutrientTotal(macros, 'sugar_added'),
      saturated_fat: nutrientTotal(macros, 'saturated_fat'),
      micronutrients: macros.micronutrients ?? {},
      items: Array.isArray(macros.items) ? stampItems(macros.items) : [],
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
  "fats": total fat grams per serving as number,
  "fiber": dietary fiber grams per serving as number (0 if not listed),
  "sodium": sodium mg per serving as number (0 if not listed),
  "sugar_added": "Added Sugars" grams per serving as number if the label lists it separately, else 0,
  "saturated_fat": saturated fat grams per serving as number (0 if not listed)
}
Read values exactly as printed. Always return all fields.`,
            },
            { type: 'image_url', image_url: { url: image } },
          ],
        }],
        response_format: { type: 'json_object' },
        max_tokens: 400,
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

  const systemPrompt = `You are a nutrition estimation assistant. Convert a food description into a structured macro and nutrient breakdown, and classify each item for an 80/20 "everyday vs. treat" moderation tracker.

User daily goals: ${goals?.calories ?? 2200} kcal, ${goals?.protein ?? 180}g protein.

Rules:
- Break the input into individual food items
- Use your nutritional knowledge for realistic calorie estimates — apply real-world calorie densities per 100g, not a 1:1 gram-to-calorie conversion
- Use weights/measurements if given; otherwise use realistic common portions
- If the user provides calories or protein numbers for a specific item, use those exact values
- Round all numbers to whole numbers
- fiber, sodium, saturated_fat: your best estimate per item (grams, grams, mg respectively)
- sugar_added: your best estimate of ADDED sugar per item, in grams — sugar from things like soda, candy, desserts, or sweetened drinks, not sugar naturally occurring in fruit or plain dairy. Estimate 0 for items with no added sugar
- meal_name: a short clean label for the whole meal (e.g. "Chicken & Rice Bowl")
- Never refuse — always return your best estimate, using sensible default assumptions for anything uncertain (even while clarification_needed is true)
- reasoning: 2–4 sentences explaining (1) which calorie density or reference you applied per item, (2) how you estimated portion size if not given, (3) any meaningful sources of uncertainty
- uncertainty: "low", "medium", or "high" — your overall confidence in this estimate
- ${clarificationInstruction}

Classification (80/20 Weekly Balance) — classify each item as "everyday", "treat", "neutral", or "uncertain":
- Ask: "Is this a normal food/meal that could reasonably form part of someone's everyday diet, or is it primarily a discretionary treat/indulgence?" That is the ONLY question — do not classify something as a treat just because it's processed, packaged, fast food, high calorie, high carb, or high fat.
- everyday: forms a normal foundation of someone's diet — e.g. chicken, beef, fish, eggs, rice, potatoes, oats, bread, pasta, fruit, vegetables, Greek yogurt, milk, beans, lentils, nuts, peanut butter, protein shakes, sandwiches, wraps, chicken pulao, burrito bowls, a normal burger, a normal mixed meal. A food does NOT need to be minimally processed, low-calorie, or homemade to count as everyday — a McDonald's hamburger is everyday.
- treat: primarily a discretionary indulgence — e.g. cookies, cake, donuts, candy, ice cream, chips, pastries, sugary soda, milkshakes, desserts, fries and similarly indulgent sides. This is not a judgment — treats are a normal, allowed part of the system.
- neutral: doesn't meaningfully belong in either bucket (e.g. diet soda, black coffee, water, spices/condiments in small amounts).
- uncertain: you genuinely can't tell from the description.
- When a meal has clearly separable components, classify each one individually instead of labeling the whole meal — e.g. "burger, fries, and a coke" is burger=everyday, fries=treat, coke=treat. Don't let one indulgent component drag the whole meal to "treat".
- classification_confidence: your confidence in that item's classification, 0 to 1.

Micronutrients — estimate your best guess for the WHOLE meal (not per item), in these exact units. Always give a number, never null:
- potassium_mg, calcium_mg, iron_mg, magnesium_mg, zinc_mg (all mg)
- vitamin_a_mcg, vitamin_d_mcg, vitamin_k_mcg, vitamin_b12_mcg (all mcg)
- vitamin_c_mg, vitamin_e_mg (both mg)

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
    {
      "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number,
      "fiber": number, "sodium": number, "saturated_fat": number, "sugar_added": number,
      "classification": "everyday" | "treat" | "neutral" | "uncertain", "classification_confidence": number
    }
  ],
  "total": { "calories": number, "protein": number, "carbs": number, "fats": number },
  "micronutrients": {
    "potassium_mg": number, "calcium_mg": number, "iron_mg": number, "magnesium_mg": number, "zinc_mg": number,
    "vitamin_a_mcg": number, "vitamin_b12_mcg": number, "vitamin_c_mg": number, "vitamin_d_mcg": number, "vitamin_e_mg": number, "vitamin_k_mcg": number
  }
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
      max_completion_tokens: 1200,
      reasoning_effort: 'low',
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
