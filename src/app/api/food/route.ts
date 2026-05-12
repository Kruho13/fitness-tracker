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
  const { text, date, macros, image } = await req.json()

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

  // Mode: estimate — call OpenAI, return breakdown without saving
  if (!text?.trim() && !image) return NextResponse.json({ error: 'No food text provided' }, { status: 400 })

  const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id).single()

  const systemPrompt = `You are a nutrition estimation assistant. Convert a food description into a structured macro breakdown.

User daily goals: ${goals?.calories ?? 2200} kcal, ${goals?.protein ?? 180}g protein.

Rules:
- Break the input into individual food items
- Use weights/measurements if given; otherwise use realistic common portions
- If the user provides calories or protein numbers for a specific item, use those exact values
- Round all numbers to whole numbers
- meal_name: a short clean label for the whole meal (e.g. "Chicken & Rice Bowl")
- Never refuse — always return your best estimate
- reasoning: one plain-English sentence explaining what assumptions you made (e.g. portion sizes assumed, cooking method, variable ingredients). Be specific and honest about uncertainty. Keep it under 20 words.

Respond ONLY in this exact JSON format:
{
  "meal_name": "string",
  "reasoning": "string",
  "items": [
    { "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number }
  ],
  "total": { "calories": number, "protein": number, "carbs": number, "fats": number }
}`

  try {
    // Cache check — text only (images always re-estimate)
    if (!image) {
      const key = cacheKey(text)
      const { data: cached } = await supabase
        .from('food_estimate_cache')
        .select('result')
        .eq('text_hash', key)
        .maybeSingle()
      if (cached) return NextResponse.json({ breakdown: cached.result })
    }

    const userContent = image
      ? [
          { type: 'text' as const, text: text?.trim() ? text : 'What food is in this image? Estimate the macros.' },
          { type: 'image_url' as const, image_url: { url: image } },
        ]
      : text

    const response = await openai.chat.completions.create({
      model: image ? 'gpt-4o' : 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0,
      seed: 42,
    })

    const parsed = JSON.parse(response.choices[0].message.content || '{}')

    // Store in cache for future identical inputs
    if (!image) {
      await supabase.from('food_estimate_cache').upsert({
        text_hash: cacheKey(text),
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
