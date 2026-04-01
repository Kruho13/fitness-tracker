import { createClient } from '@/lib/supabase/server'
import { todayCT, isSundayCT, formatDate, currentWeekStartCT } from '@/lib/utils'
import { GOAL_LABELS } from '@/lib/calculations'
import MacroCard from '@/components/ui/MacroCard'
import WeightChart from '@/components/ui/WeightChart'
import Link from 'next/link'
import { Utensils, Scale, Target, BarChart2, Flame } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = todayCT()
  const firstName = user.user_metadata?.full_name?.split(' ')[0] ?? 'there'

  const [goalsRes, foodRes, weightRes, checkinRes, streakRes] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', user.id).single(),
    supabase.from('food_logs').select('calories,protein').eq('user_id', user.id).eq('date', today),
    supabase.from('weight_logs').select('date,weight_lbs').eq('user_id', user.id).gte('date', getFourWeeksAgo()).order('date', { ascending: true }),
    supabase.from('weekly_checkins').select('id').eq('user_id', user.id).eq('week_start', currentWeekStartCT()).maybeSingle(),
    supabase.from('food_logs').select('date').eq('user_id', user.id).gte('date', getThirtyDaysAgo()).order('date', { ascending: false }),
  ])

  const goals = goalsRes.data ?? { calories: 2200, protein: 180, mode: 'maintain' }
  const foodLogs = foodRes.data ?? []
  const totals = foodLogs.reduce(
    (acc, l) => ({ calories: acc.calories + l.calories, protein: acc.protein + l.protein }),
    { calories: 0, protein: 0 }
  )

  const weightData = weightRes.data ?? []
  const showCheckinPrompt = isSundayCT() && !checkinRes.data
  const streak = calculateStreak(streakRes.data ?? [], today)

  // @ts-ignore
  const goalLabel = GOAL_LABELS[goals.mode] ?? 'Active'

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-neutral-400 text-xs font-medium uppercase tracking-wide">{firstName}&apos;s Fitness Tracker</p>
          <p className="text-neutral-900 font-bold text-lg mt-0.5">{formatDate(today)}</p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100">
            {goalLabel}
          </span>
          {streak > 0 && (
            <div className="flex items-center justify-end gap-1 mt-1.5">
              <Flame size={13} className="text-orange-400" />
              <span className="text-xs font-semibold text-neutral-600">{streak} day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* Sunday check-in prompt */}
      {showCheckinPrompt && (
        <Link href="/reports?checkin=1" className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <div>
            <p className="text-emerald-800 font-semibold text-sm">Weekly check-in ready</p>
            <p className="text-emerald-600 text-xs mt-0.5">Complete it to generate your weekly report</p>
          </div>
          <span className="text-emerald-600 text-lg">→</span>
        </Link>
      )}

      {/* Quick actions — full width Log Food, then 3 secondary */}
      <div className="space-y-2.5">
        <Link href="/log-food"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-5 flex items-center gap-3 transition-colors">
          <Utensils size={22} strokeWidth={2} />
          <span className="font-bold text-lg">Log Food</span>
        </Link>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { href: '/log-weight', label: 'Log Weight', icon: Scale },
            { href: '/goals', label: 'Update Goals', icon: Target },
            { href: '/reports', label: 'Reports', icon: BarChart2 },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="bg-white border border-neutral-200 text-neutral-700 rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors hover:bg-neutral-50">
              <Icon size={22} strokeWidth={1.8} className="text-neutral-500" />
              <span className="text-xs font-semibold text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Calories + Protein cards */}
      <div className="grid grid-cols-2 gap-3">
        <MacroCard label="Calories" current={totals.calories} goal={goals.calories} unit="kcal" accentClass="text-emerald-600" featured />
        <MacroCard label="Protein" current={totals.protein} goal={goals.protein} unit="g" accentClass="text-blue-600" featured />
      </div>

      {/* Weight chart */}
      <WeightChart data={weightData} />
    </div>
  )
}

function getFourWeeksAgo(): string {
  const d = new Date(); d.setDate(d.getDate() - 28); return d.toISOString().split('T')[0]
}
function getThirtyDaysAgo(): string {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
}

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
