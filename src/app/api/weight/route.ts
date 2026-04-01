import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayCT } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weight_lbs, date } = await req.json()
  if (!weight_lbs || weight_lbs <= 0) return NextResponse.json({ error: 'Invalid weight' }, { status: 400 })

  const logDate = date ?? todayCT()

  const { data, error } = await supabase
    .from('weight_logs')
    .upsert({ user_id: user.id, date: logDate, weight_lbs }, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
