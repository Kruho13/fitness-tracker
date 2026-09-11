'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import PeriodSelector, { type Period } from '@/components/ui/PeriodSelector'
import { MINERAL_KEYS, VITAMIN_KEYS, MICRONUTRIENT_REFERENCE, NUTRITION_DISCLAIMER, percentOfReference, type Micronutrients } from '@/lib/nutrition'

function isPeriod(v: string | null): v is Period {
  return v === 'today' || v === '7d' || v === '30d'
}

function MicronutrientRow({ nutrientKey, value }: { nutrientKey: keyof Micronutrients; value: number }) {
  const ref = MICRONUTRIENT_REFERENCE[nutrientKey]
  const pct = percentOfReference(value, ref)
  return (
    <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ boxShadow: 'var(--card-shadow-sm)' }}>
      <div className="min-w-0">
        <p className="text-neutral-800 text-sm font-medium">{ref.label}</p>
        <p className="text-neutral-400 text-xs mt-0.5">
          {Math.round(value * 10) / 10}{ref.unit} of {ref.value}{ref.unit} target
        </p>
      </div>
      <p className="text-sm font-bold text-emerald-600 shrink-0">{pct}%</p>
    </div>
  )
}

function MicronutrientsContent() {
  // Carry over the period the user was already viewing on the Nutrition page, if any
  const searchParams = useSearchParams()
  const urlPeriod = searchParams.get('period')
  const [period, setPeriod] = useState<Period>(isPeriod(urlPeriod) ? urlPeriod : 'today')
  const [loading, setLoading] = useState(true)
  const [micronutrients, setMicronutrients] = useState<Micronutrients | null>(null)
  const [loggedDays, setLoggedDays] = useState(0)

  useEffect(() => {
    fetch(`/api/nutrition?period=${period}`).then(r => r.json()).then(d => {
      setMicronutrients(d.micronutrients)
      setLoggedDays(d.loggedDays ?? 0)
    }).finally(() => setLoading(false))
  }, [period])

  return (
    <div>
      <div className="px-5 pt-8 pb-6" style={{ background: 'linear-gradient(160deg, #111110 0%, #1C1C1A 100%)' }}>
        <Link href="/nutrition" className="inline-flex items-center gap-1 text-neutral-400 text-xs font-medium mb-3 hover:text-neutral-300 transition-colors">
          <ChevronLeft size={14} /> Nutrition
        </Link>
        <p className="text-neutral-500 text-xs font-semibold uppercase tracking-widest mb-1">Micronutrients</p>
        <p className="text-white font-bold text-2xl leading-tight" style={{ fontFamily: 'var(--font-bricolage)' }}>
          Vitamins & Minerals
        </p>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-5">
        <PeriodSelector value={period} onChange={setPeriod} />

        {!loading && loggedDays === 0 && (
          <p className="text-neutral-400 text-xs">No food logged {period === 'today' ? 'today' : 'in this period'} yet</p>
        )}

        <section className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Minerals</p>
          <div className="space-y-1.5">
            {MINERAL_KEYS.map(key => (
              <MicronutrientRow key={key} nutrientKey={key} value={micronutrients?.[key] ?? 0} />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Vitamins</p>
          <div className="space-y-1.5">
            {VITAMIN_KEYS.map(key => (
              <MicronutrientRow key={key} nutrientKey={key} value={micronutrients?.[key] ?? 0} />
            ))}
          </div>
        </section>

        <p className="text-neutral-400 text-[11px] leading-relaxed text-center px-2">{NUTRITION_DISCLAIMER}</p>
      </div>
    </div>
  )
}

export default function MicronutrientsPage() {
  return (
    <Suspense fallback={null}>
      <MicronutrientsContent />
    </Suspense>
  )
}
