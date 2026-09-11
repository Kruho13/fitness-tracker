'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import PeriodSelector, { type Period } from '@/components/ui/PeriodSelector'
import NutrientCard from '@/components/ui/NutrientCard'
import { NUTRITION_PLUS_REFERENCE, NUTRITION_DISCLAIMER, nutrientContext, type NutritionPlusKey } from '@/lib/nutrition'

interface NutritionPlusData { fiber: number; sodium: number; sugar_added: number; saturated_fat: number }
interface BalanceData { hasData: boolean; everydayPct: number | null; treatPct: number | null; message: string | null }

const PLUS_KEYS = Object.keys(NUTRITION_PLUS_REFERENCE) as NutritionPlusKey[]

export default function NutritionPage() {
  const [period, setPeriod] = useState<Period>('today')
  const [loading, setLoading] = useState(true)
  const [nutritionPlus, setNutritionPlus] = useState<NutritionPlusData | null>(null)
  const [loggedDays, setLoggedDays] = useState(0)
  const [balance, setBalance] = useState<BalanceData | null>(null)

  useEffect(() => {
    fetch(`/api/nutrition?period=${period}`).then(r => r.json()).then(d => {
      setNutritionPlus(d.nutritionPlus)
      setLoggedDays(d.loggedDays ?? 0)
    }).finally(() => setLoading(false))
  }, [period])

  useEffect(() => {
    fetch('/api/nutrition/balance').then(r => r.json()).then(setBalance)
  }, [])

  return (
    <div>
      <div className="px-5 pt-8 pb-6" style={{ background: 'linear-gradient(160deg, #111110 0%, #1C1C1A 100%)' }}>
        <p className="text-neutral-500 text-xs font-semibold uppercase tracking-widest mb-1">Nutrition</p>
        <p className="text-white font-bold text-2xl leading-tight" style={{ fontFamily: 'var(--font-bricolage)' }}>
          Beyond calories
        </p>
        <p className="text-neutral-500 text-sm mt-1">A deeper look at what your food is providing</p>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-5">
        <PeriodSelector value={period} onChange={setPeriod} />

        {/* Nutrition+ — immediately visible, no drill-down required */}
        <section className="space-y-2.5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Nutrition+</p>
          {!loading && loggedDays === 0 && (
            <p className="text-neutral-400 text-xs">No food logged {period === 'today' ? 'today' : 'in this period'} yet</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {PLUS_KEYS.map(key => {
              const ref = NUTRITION_PLUS_REFERENCE[key]
              const value = nutritionPlus?.[key] ?? 0
              return <NutrientCard key={key} label={ref.label} value={value} unit={ref.unit} context={nutrientContext(value, ref)} />
            })}
          </div>
        </section>

        {/* Weekly Balance — concise preview, full experience is one tap away */}
        <Link
          href="/nutrition/balance"
          className="block bg-white rounded-2xl p-4 transition-all active:scale-[0.98]"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Weekly Balance</p>
            <ChevronRight size={16} className="text-neutral-300" />
          </div>
          {balance?.hasData ? (
            <>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl font-bold text-neutral-900" style={{ fontFamily: 'var(--font-bricolage)' }}>{balance.everydayPct}%</span>
                <span className="text-xs text-neutral-400 mr-2">Everyday</span>
                <span className="text-2xl font-bold text-neutral-900" style={{ fontFamily: 'var(--font-bricolage)' }}>{balance.treatPct}%</span>
                <span className="text-xs text-neutral-400">Treats</span>
              </div>
              <p className="text-neutral-500 text-xs mt-1.5">{balance.message}</p>
            </>
          ) : (
            <p className="text-neutral-400 text-sm">Log a few more meals to see your balance</p>
          )}
        </Link>

        {/* Micronutrients — summary card, not a wall of values */}
        <Link
          href={`/nutrition/micronutrients?period=${period}`}
          className="flex items-center justify-between bg-white rounded-2xl p-4 transition-all active:scale-[0.98]"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Micronutrients</p>
            <p className="text-neutral-800 text-sm font-semibold">Vitamins & Minerals</p>
          </div>
          <ChevronRight size={16} className="text-neutral-300" />
        </Link>

        <p className="text-neutral-400 text-[11px] leading-relaxed text-center px-2">{NUTRITION_DISCLAIMER}</p>
      </div>
    </div>
  )
}
