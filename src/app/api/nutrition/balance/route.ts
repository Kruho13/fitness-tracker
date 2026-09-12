import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWeeklyBalance } from '@/lib/nutrition-data'

// GET /api/nutrition/balance — always a rolling last-7-days window, independent of the
// Nutrition page's Today/7D/30D selector (this is specifically the "Weekly" Balance).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const balance = await getWeeklyBalance(supabase, user.id)
  return NextResponse.json(balance)
}
