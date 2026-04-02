'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateMacros, heightToCm, ACTIVITY_LABELS, GOAL_LABELS, GOAL_DESCRIPTIONS, type GoalMode, type ActivityLevel, type Gender } from '@/lib/calculations'
import { ChevronLeft } from 'lucide-react'

type Step = 'body' | 'activity'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('body')

  const [gender, setGender] = useState<Gender>('male')
  const [age, setAge] = useState('')
  const [heightFt, setHeightFt] = useState('5')
  const [heightIn, setHeightIn] = useState('10')
  const [weight, setWeight] = useState('')
  const [activity, setActivity] = useState<ActivityLevel>('moderately_active')
  const [goal, setGoal] = useState<GoalMode>('cut')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function nextStep() {
    setError('')
    if (!age || !weight || !heightFt || !heightIn) { setError('Fill in all fields'); return }
    if (Number(age) < 13 || Number(age) > 100) { setError('Enter a valid age'); return }
    if (Number(weight) < 80 || Number(weight) > 600) { setError('Enter a valid weight in lbs'); return }
    setStep('activity')
  }

  async function handleFinish() {
    setLoading(true)
    setError('')

    const height_cm = heightToCm(Number(heightFt), Number(heightIn))
    const weight_lbs = Number(weight)
    const macros = calculateMacros(gender, weight_lbs, height_cm, Number(age), activity, goal)

    try {
      const [profileRes, goalsRes] = await Promise.all([
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gender, age: Number(age), weight_lbs, height_cm, activity_level: activity }),
        }),
        fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: goal, calories: macros.calories, carbs: macros.carbs, protein: macros.protein, fats: macros.fats }),
        }),
      ])

      if (!profileRes.ok) {
        const body = await profileRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Profile save failed (${profileRes.status})`)
      }
      if (!goalsRes.ok) {
        const body = await goalsRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Goals save failed (${goalsRes.status})`)
      }

      router.push('/welcome')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const previewMacros = step === 'activity' && age && weight
    ? calculateMacros(gender, Number(weight), heightToCm(Number(heightFt), Number(heightIn)), Number(age), activity, goal)
    : null

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 flex flex-col">
      <div className="max-w-sm mx-auto w-full flex-1">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className={`h-1.5 rounded-full transition-all ${step === 'body' ? 'bg-emerald-500 w-8' : 'bg-emerald-500 w-8'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step === 'activity' ? 'bg-emerald-500 w-8' : 'bg-neutral-200 w-4'}`} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {step === 'body' ? 'Your body stats' : 'Activity & goal'}
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            {step === 'body'
              ? 'Used to calculate your personalized calorie and macro targets'
              : 'Used to set the right calorie adjustment for your goal'}
          </p>
        </div>

        {/* Step 1 — Body stats */}
        {step === 'body' && (
          <div className="space-y-4">
            <Field label="Gender">
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as Gender[]).map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className={`py-3 rounded-xl border text-sm font-medium capitalize transition-all ${gender === g ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input type="number" value={age} onChange={e => setAge(e.target.value)}
                  placeholder="25" className="input" min={13} max={100} />
              </Field>
              <Field label="Weight (lbs)">
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                  placeholder="175" className="input" />
              </Field>
            </div>
            <Field label="Height">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)}
                    className="input pr-8" min={3} max={8} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">ft</span>
                </div>
                <div className="relative">
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)}
                    className="input pr-8" min={0} max={11} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">in</span>
                </div>
              </div>
            </Field>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={nextStep} className="btn-primary w-full">Continue</button>
          </div>
        )}

        {/* Step 2 — Activity & Goal */}
        {step === 'activity' && (
          <div className="space-y-4">
            <Field label="Activity level">
              <select value={activity} onChange={e => setActivity(e.target.value as ActivityLevel)}
                className="input">
                {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Current goal">
              <div className="space-y-2">
                {(Object.keys(GOAL_LABELS) as GoalMode[]).map(g => (
                  <button key={g} type="button" onClick={() => setGoal(g)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${goal === g ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                    <p className={`text-sm font-semibold ${goal === g ? 'text-emerald-700' : 'text-neutral-800'}`}>{GOAL_LABELS[g]}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{GOAL_DESCRIPTIONS[g]}</p>
                  </button>
                ))}
              </div>
            </Field>

            {previewMacros && (
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <p className="text-xs font-medium text-neutral-500 mb-3">Your calculated targets</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Cal', value: previewMacros.calories, color: 'text-emerald-600' },
                    { label: 'Pro', value: `${previewMacros.protein}g`, color: 'text-blue-600' },
                    { label: 'Carb', value: `${previewMacros.carbs}g`, color: 'text-orange-500' },
                    { label: 'Fat', value: `${previewMacros.fats}g`, color: 'text-yellow-500' },
                  ].map(m => (
                    <div key={m.label}>
                      <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-neutral-400 text-xs">{m.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-neutral-400 text-center mt-2">TDEE: {previewMacros.tdee} kcal/day</p>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep('body')} className="btn-ghost flex items-center gap-1">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={handleFinish} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Saving...' : 'Save & continue'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus { border-color: #10b981; }
        .input::placeholder { color: #9ca3af; }
        .btn-primary {
          background: #059669;
          color: white;
          font-weight: 600;
          padding: 0.875rem 1.5rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          transition: background 0.15s;
          width: 100%;
        }
        .btn-primary:hover:not(:disabled) { background: #047857; }
        .btn-primary:disabled { opacity: 0.5; }
        .btn-ghost {
          background: transparent;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          font-weight: 500;
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          transition: all 0.15s;
        }
        .btn-ghost:hover { border-color: #d1d5db; background: #f9fafb; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
