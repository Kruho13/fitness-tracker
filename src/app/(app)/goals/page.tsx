'use client'

import { useState, useEffect } from 'react'
import { calculateMacros, ACTIVITY_LABELS, GOAL_LABELS, GOAL_DESCRIPTIONS, type GoalMode, type ActivityLevel, type Gender } from '@/lib/calculations'
import { Info, Bell, BellOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function GoalsPage() {


  // Profile state
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [age, setAge] = useState(25)
  const [weightLbs, setWeightLbs] = useState(175)
  const [heightCm, setHeightCm] = useState(178)
  const [activity, setActivity] = useState<ActivityLevel>('moderately_active')

  // Goal state
  const [mode, setMode] = useState<GoalMode>('cut')

  // Macro overrides (start with calculated values, user can edit)
  const [calories, setCalories] = useState(2200)
  const [protein, setProtein] = useState(180)
  const [carbs, setCarbs] = useState(220)
  const [fats, setFats] = useState(70)
  const [overridden, setOverridden] = useState(false)

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setNotifEnabled(Notification.permission === 'granted')
    }
  }, [])

  async function handleNotifToggle() {
    if (notifEnabled) {
      setNotifLoading(true)
      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setNotifEnabled(false)
      setNotifLoading(false)
    } else {
      if (Notification.permission === 'denied') return
      setNotifLoading(true)
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') { setNotifLoading(false); return }
        const reg = await navigator.serviceWorker.register('/sw.js')
        const existing = await reg.pushManager.getSubscription()
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        })
        setNotifEnabled(true)
      } catch { /* ignore */ }
      setNotifLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/goals').then(r => r.json()),
      fetch('/api/profile').then(r => r.json()),
    ]).then(([goalsData, profileData]) => {
      const savedGoals = goalsData.goals
      const p = profileData.profile

      if (savedGoals) {
        setMode(savedGoals.mode)
        setCalories(savedGoals.calories)
        setProtein(savedGoals.protein)
        setCarbs(savedGoals.carbs)
        setFats(savedGoals.fats)
      }
      if (p) {
        if (p.name) setName(p.name)
        setGender(p.gender)
        setAge(p.age)
        setWeightLbs(p.weight_lbs)
        setHeightCm(p.height_cm)
        setActivity(p.activity_level)

        // If saved macros differ from what calculation would produce, treat as overridden
        if (savedGoals) {
          const calc = calculateMacros(p.gender, p.weight_lbs, p.height_cm, p.age, p.activity_level, savedGoals.mode)
          if (calc.calories !== savedGoals.calories || calc.protein !== savedGoals.protein) {
            setOverridden(true)
          }
        }
      }
    }).finally(() => setFetching(false))
  }, [])

  // Recalculate whenever profile fields or mode changes, unless user has manually overridden
  useEffect(() => {
    if (overridden || fetching) return
    const m = calculateMacros(gender, weightLbs, heightCm, age, activity, mode)
    setCalories(m.calories)
    setProtein(m.protein)
    setCarbs(m.carbs)
    setFats(m.fats)
  }, [gender, age, weightLbs, heightCm, activity, mode, overridden, fetching])

  function handleMacroChange(setter: (v: number) => void, val: number) {
    setter(val)
    setOverridden(true)
  }

  function resetToCalculated() {
    setOverridden(false)
    const m = calculateMacros(gender, weightLbs, heightCm, age, activity, mode)
    setCalories(m.calories)
    setProtein(m.protein)
    setCarbs(m.carbs)
    setFats(m.fats)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await Promise.all([
        fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, calories, carbs, protein, fats }),
        }),
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, gender, age, weight_lbs: weightLbs, height_cm: heightCm, activity_level: activity }),
        }),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  const tdee = fetching ? null : calculateMacros(gender, weightLbs, heightCm, age, activity, mode).tdee

  if (fetching) return <div className="px-4 pt-8"><p className="text-neutral-400 text-sm">Loading...</p></div>

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Goals</h1>
        <p className="text-neutral-400 text-sm mt-0.5">Your macros are calculated from your stats</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Name */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Your name</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name"
            className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </section>

        {/* Goal mode */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Goal</p>
          <div className="space-y-2">
            {(Object.keys(GOAL_LABELS) as GoalMode[]).map(g => (
              <button key={g} type="button" onClick={() => { setMode(g); setOverridden(false) }}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all ${mode === g
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                <p className={`text-sm font-semibold ${mode === g ? 'text-emerald-700' : 'text-neutral-800'}`}>{GOAL_LABELS[g]}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{GOAL_DESCRIPTIONS[g]}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Activity level */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Activity level</p>
          <select value={activity} onChange={e => { setActivity(e.target.value as ActivityLevel); setOverridden(false) }}
            className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 focus:outline-none focus:border-emerald-500 transition-colors">
            {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {tdee && (
            <p className="text-xs text-neutral-400 flex items-center gap-1.5 pl-1">
              <Info size={12} />
              Estimated TDEE: <span className="font-semibold text-neutral-600">{tdee} kcal/day</span>
            </p>
          )}
        </section>

        {/* Macro targets */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Daily targets</p>
            {overridden && (
              <button type="button" onClick={resetToCalculated}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                Reset to calculated
              </button>
            )}
          </div>
          <div className="space-y-2">
            {[
              { label: 'Calories', value: calories, setter: (v: number) => handleMacroChange(setCalories, v), unit: 'kcal', color: 'text-emerald-600' },
              { label: 'Protein', value: protein, setter: (v: number) => handleMacroChange(setProtein, v), unit: 'g', color: 'text-blue-600' },
              { label: 'Carbs', value: carbs, setter: (v: number) => handleMacroChange(setCarbs, v), unit: 'g', color: 'text-orange-500' },
              { label: 'Fats', value: fats, setter: (v: number) => handleMacroChange(setFats, v), unit: 'g', color: 'text-yellow-500' },
            ].map(({ label, value, setter, unit, color }) => (
              <div key={label} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className={`text-sm font-semibold ${color}`}>{label}</p>
                  <p className="text-neutral-400 text-xs">{unit}/day</p>
                </div>
                <input type="number" value={value} onChange={e => setter(Number(e.target.value))}
                  min={1} max={9999}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 text-right font-bold w-24 text-base focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
            ))}
          </div>
        </section>

        {/* Notification toggle */}
        <p className="text-xs text-neutral-400 text-center">
          permission: {'Notification' in window ? Notification.permission : 'not supported'}
        </p>
        <section className="bg-white border border-neutral-200 rounded-2xl px-4 py-4">
          {'Notification' in window && Notification.permission === 'denied' ? (
            <div className="flex items-center gap-3">
              <BellOff size={18} className="text-neutral-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-neutral-700">Meal reminders blocked</p>
                <p className="text-xs text-neutral-400 mt-0.5">Enable notifications in your browser settings to turn this on</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {notifEnabled ? <Bell size={18} className="text-emerald-600 shrink-0" /> : <BellOff size={18} className="text-neutral-400 shrink-0" />}
                <div>
                  <p className="text-sm font-semibold text-neutral-700">Meal reminders</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{notifEnabled ? 'You\'ll be nudged when you haven\'t logged yet' : 'Get nudged around meal times'}</p>
                </div>
              </div>
              <button type="button" onClick={handleNotifToggle} disabled={notifLoading}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${notifEnabled ? 'bg-emerald-500' : 'bg-neutral-200'} disabled:opacity-50`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
        </section>

        <button type="submit" disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl transition-colors text-sm">
          {loading ? 'Saving...' : saved ? '✓ Goals saved' : 'Save goals'}
        </button>
      </form>

    </div>
  )
}
