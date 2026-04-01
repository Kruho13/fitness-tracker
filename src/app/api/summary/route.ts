import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayCT } from '@/lib/utils'

function calculateStreak(logs: { date: string }[], today: string): number {
  if (!logs.length) return 0
  const days = [...new Set(logs.map(l => l.date))].sort().reverse()
  let streak = 0
  let cursor = today
  for (const day of days) {
    if (day === cursor) {
      streak++
      const d = new Date(cursor + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().split('T')[0]
    } else if (day < cursor) break
  }
  return streak
}

function getThirtyDaysAgo(): string {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = todayCT()

  const [goalsRes, streakRes] = await Promise.all([
    supabase.from('goals').select('calories,protein').eq('user_id', user.id).single(),
    supabase.from('food_logs').select('date').eq('user_id', user.id).gte('date', getThirtyDaysAgo()).order('date', { ascending: false }),
  ])

  const streak = calculateStreak(streakRes.data ?? [], today)
  const calorieGoal = goalsRes.data?.calories ?? 2200
  const proteinGoal = goalsRes.data?.protein ?? 180

  return NextResponse.json({ streak, calorieGoal, proteinGoal })
}
