import { createClient } from '@/lib/supabase/server'
import { todayCT, isSundayCT, formatDate, currentWeekStartCT } from '@/lib/utils'
import { GOAL_LABELS } from '@/lib/calculations'
import MacroCard from '@/components/ui/MacroCard'
import WeightChart from '@/components/ui/WeightChart'
import SundayCheckinModal from '@/components/ui/SundayCheckinModal'
import Link from 'next/link'
import { Utensils, Scale, Target, BarChart2, Flame } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = todayCT()
  const firstName = user.user_metadata?.full_name?.split(' ')[0] ?? 'there'

  const [goalsRes, foodRes, weightRes, checkinRes, streakRes, tenDayFoodRes] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', user.id).single(),
    supabase.from('food_logs').select('calories,protein').eq('user_id', user.id).eq('date', today),
    supabase.from('weight_logs').select('date,weight_lbs').eq('user_id', user.id).gte('date', getFourWeeksAgo()).order('date', { ascending: true }),
    supabase.from('weekly_checkins').select('id').eq('user_id', user.id).eq('week_start', currentWeekStartCT()).maybeSingle(),
    supabase.from('food_logs').select('date').eq('user_id', user.id).gte('date', getThirtyDaysAgo()).order('date', { ascending: false }),
    supabase.from('food_logs').select('date,calories').eq('user_id', user.id).gte('date', getSevenDaysAgo()).order('date', { ascending: true }),
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

  const recentFoodLogs = tenDayFoodRes.data ?? []
  const recentDayMap: Record<string, number> = {}
  for (const l of recentFoodLogs) { recentDayMap[l.date] = (recentDayMap[l.date] ?? 0) + l.calories }
  const recentLoggedDays = Object.keys(recentDayMap)
  const avgCaloriesThisWeek = recentLoggedDays.length >= 3
    ? Math.round(Object.values(recentDayMap).reduce((s, v) => s + v, 0) / recentLoggedDays.length)
    : null

  const sevenDaysAgoStr = getSevenDaysAgo()
  const fourteenDaysAgoStr = getFourteenDaysAgo()
  const currentWeekWeights = weightData.filter(w => w.date >= sevenDaysAgoStr)
  const prevWeekWeights = weightData.filter(w => w.date >= fourteenDaysAgoStr && w.date < sevenDaysAgoStr)
  const currentWeekAvg = currentWeekWeights.length > 0
    ? currentWeekWeights.reduce((s, w) => s + w.weight_lbs, 0) / currentWeekWeights.length
    : null
  const prevWeekAvg = prevWeekWeights.length > 0
    ? prevWeekWeights.reduce((s, w) => s + w.weight_lbs, 0) / prevWeekWeights.length
    : null
  const weightSMADelta = currentWeekAvg !== null && prevWeekAvg !== null
    ? Number((currentWeekAvg - prevWeekAvg).toFixed(1))
    : null

  // @ts-ignore
  const goalLabel = GOAL_LABELS[goals.mode] ?? 'Active'

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <SundayCheckinModal show={showCheckinPrompt} />

      {/* ── Dark header ─────────────────────────────────── */}
      <div
        className="px-5 pt-8 pb-16"
        style={{
          background: 'linear-gradient(160deg, #111110 0%, #1C1C1A 100%)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-widest mb-1">
              {firstName}&rsquo;s Pulse
            </p>
            <p
              className="text-white font-bold text-2xl leading-tight font-display"
              style={{ fontFamily: 'var(--font-bricolage)' }}
            >
              {formatDate(today)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 mt-0.5">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(16,185,129,0.12)',
                color: '#34D399',
                border: '1px solid rgba(52,211,153,0.2)',
              }}
            >
              {goalLabel}
            </span>
            {streak > 0 && (
              <div className="flex items-center gap-1.5">
                <Flame size={13} className="text-orange-400" />
                <span className="text-sm font-bold text-orange-400">{streak}</span>
                <span className="text-xs text-neutral-500">day streak</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating macro cards ─────────────────────────── */}
      <div className="px-4 grid grid-cols-2 gap-3" style={{ marginTop: '-2.75rem' }}>
        <MacroCard label="Calories" current={totals.calories} goal={goals.calories} unit="kcal" accentClass="text-emerald-600" featured />
        <MacroCard label="Protein" current={totals.protein} goal={goals.protein} unit="g" accentClass="text-blue-600" featured />
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* Log Food — hero CTA */}
        <Link
          href="/log-food"
          className="flex items-center gap-3.5 px-5 py-4 rounded-3xl text-white transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            boxShadow: '0 4px 20px rgba(5,150,105,0.35)',
          }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Utensils size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">Log Food</p>
            <p className="text-emerald-200 text-xs mt-0.5">Describe your meal in plain text</p>
          </div>
        </Link>

        {/* Secondary actions */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { href: '/log-weight', label: 'Log Weight', icon: Scale },
            { href: '/goals',      label: 'Goals',      icon: Target },
            { href: '/reports',    label: 'Reports',    icon: BarChart2 },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-[0.97]"
              style={{ boxShadow: 'var(--card-shadow-sm)' }}
            >
              <Icon size={20} strokeWidth={1.8} className="text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-600 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>

        {/* Weight chart */}
        <WeightChart data={weightData} />

        {/* Weekly stats line */}
        {(avgCaloriesThisWeek !== null || weightSMADelta !== null) && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-2"
            style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-neutral-500 text-xs leading-relaxed">
              {avgCaloriesThisWeek !== null && `Averaging ${avgCaloriesThisWeek} kcal/day this week`}
              {avgCaloriesThisWeek !== null && weightSMADelta !== null && ' · '}
              {weightSMADelta !== null && `weight avg ${weightSMADelta < 0 ? 'down' : weightSMADelta > 0 ? 'up' : 'stable'}${Math.abs(weightSMADelta) > 0 ? ` ${Math.abs(weightSMADelta)} lbs` : ''} vs last week`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function getFourWeeksAgo(): string {
  const d = new Date(); d.setDate(d.getDate() - 28); return d.toISOString().split('T')[0]
}
function getThirtyDaysAgo(): string {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
}
function getSevenDaysAgo(): string {
  const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]
}
function getFourteenDaysAgo(): string {
  const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().split('T')[0]
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
