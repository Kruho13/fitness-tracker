'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Contributor { name: string; calories: number }
interface BalanceData {
  hasData: boolean
  everydayCalories: number
  treatCalories: number
  everydayPct: number | null
  treatPct: number | null
  message: string | null
  topEveryday: Contributor[]
  topTreats: Contributor[]
}

export default function WeeklyBalancePage() {
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nutrition/balance').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="px-5 pt-8 pb-6" style={{ background: 'linear-gradient(160deg, #111110 0%, #1C1C1A 100%)' }}>
        <Link href="/nutrition" className="inline-flex items-center gap-1 text-neutral-400 text-xs font-medium mb-3 hover:text-neutral-300 transition-colors">
          <ChevronLeft size={14} /> Nutrition
        </Link>
        <p className="text-neutral-500 text-xs font-semibold uppercase tracking-widest mb-1">Last 7 days</p>
        <p className="text-white font-bold text-2xl leading-tight" style={{ fontFamily: 'var(--font-bricolage)' }}>
          Weekly Balance
        </p>
        <p className="text-neutral-500 text-sm mt-1">Moderation, not a score — everyday foods vs. treats</p>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-5">
        {loading ? (
          <p className="text-neutral-400 text-sm">Loading...</p>
        ) : !data?.hasData ? (
          <div className="bg-white rounded-2xl p-6 text-center" style={{ boxShadow: 'var(--card-shadow)' }}>
            <p className="text-neutral-500 text-sm">Log a few more meals this week to see your balance</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
              <div className="flex items-baseline justify-center gap-8 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600" style={{ fontFamily: 'var(--font-bricolage)' }}>{data.everydayPct}%</p>
                  <p className="text-neutral-400 text-xs mt-0.5">Everyday</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-500" style={{ fontFamily: 'var(--font-bricolage)' }}>{data.treatPct}%</p>
                  <p className="text-neutral-400 text-xs mt-0.5">Treats</p>
                </div>
              </div>

              <div className="h-2.5 rounded-full overflow-hidden flex bg-neutral-100">
                <div className="h-full bg-emerald-500" style={{ width: `${data.everydayPct}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${data.treatPct}%` }} />
              </div>

              <p className="text-neutral-500 text-sm text-center mt-3 font-medium">{data.message}</p>
            </div>

            {data.topEveryday.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Everyday</p>
                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-neutral-100" style={{ boxShadow: 'var(--card-shadow)' }}>
                  {data.topEveryday.map(item => (
                    <div key={item.name} className="px-4 py-3 flex items-center justify-between gap-3">
                      <p className="text-neutral-700 text-sm truncate">{item.name}</p>
                      <p className="text-neutral-400 text-xs shrink-0">{item.calories.toLocaleString()} kcal</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.topTreats.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Treats</p>
                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-neutral-100" style={{ boxShadow: 'var(--card-shadow)' }}>
                  {data.topTreats.map(item => (
                    <div key={item.name} className="px-4 py-3 flex items-center justify-between gap-3">
                      <p className="text-neutral-700 text-sm truncate">{item.name}</p>
                      <p className="text-neutral-400 text-xs shrink-0">{item.calories.toLocaleString()} kcal</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
