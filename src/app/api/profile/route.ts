import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
  if (error) return NextResponse.json({ profile: null })
  return NextResponse.json({ profile: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { gender, age, weight_lbs, height_cm, activity_level } = body

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: user.id, gender, age, weight_lbs, height_cm, activity_level, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
