'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Check, X, Plus, BookOpen, Flame, Camera, Mic, Utensils, Bell, Barcode } from 'lucide-react'
import { logDateCT, formatDate } from '@/lib/utils'

interface FoodItem { name: string; calories: number; protein: number; carbs: number; fats: number }
interface Breakdown { meal_name: string; reasoning?: string; items: FoodItem[]; total: FoodItem }
interface FoodLog { id: string; raw_text: string; meal_name: string | null; calories: number; protein: number; carbs: number; fats: number }
interface SavedMeal { id: string; name: string; calories: number; protein: number; carbs: number; fats: number }
interface SavedLabel { id: string; name: string; serving_size: string | null; calories: number; protein: number; carbs: number; fats: number }
type LabelScanState = { name: string; serving_size: string; calories: number; protein: number; carbs: number; fats: number } | null
type LogEditState = { id: string; rawText: string; calories: number; protein: number; carbs: number; fats: number; meal_name: string } | null
type MealEditState = { id: string; name: string; portion: string; calories: number; protein: number; carbs: number; fats: number } | null


const THINKING_MESSAGES = [
  'Reading your meal...',
  'Estimating portions...',
  'Calculating macros...',
  'Checking the numbers...',
  'Almost there...',
]

export default function LogFoodPage() {
  const [input, setInput] = useState('')
  const [estimating, setEstimating] = useState(false)
  const [thinkingIdx, setThinkingIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [correctionHint, setCorrectionHint] = useState('')
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([])
  const [error, setError] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [logEdit, setLogEdit] = useState<LogEditState>(null)
  const [mealEdit, setMealEdit] = useState<MealEditState>(null)
  const [savingMealFor, setSavingMealFor] = useState<string | null>(null)
  const [mealEditEstimating, setMealEditEstimating] = useState(false)
  const [mealEditMode, setMealEditMode] = useState<'portion' | 'manual'>('portion')
  const [logEditMode, setLogEditMode] = useState<'portion' | 'manual'>('portion')
  const [logEditEstimating, setLogEditEstimating] = useState(false)
  const [popupText, setPopupText] = useState('')
  const [reestimating, setReestimating] = useState(false)
  const [calorieGoal, setCalorieGoal] = useState<number | null>(null)
  const [proteinGoal, setProteinGoal] = useState<number | null>(null)
  const [carbGoal, setCarbGoal] = useState<number | null>(null)
  const [fatGoal, setFatGoal] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushError, setPushError] = useState(false)

  const PUSH_KEY = 'push_prompt_v2'
  function getPushPromptCount() { return parseInt(localStorage.getItem(PUSH_KEY) ?? '0') }
  function shouldShowPushPrompt(currentStreak: number) {
    if (pushEnabled) return false
    if (Notification.permission === 'granted') return false
    if (Notification.permission === 'denied') return false
    const count = getPushPromptCount()
    if (count <= 2) return true
    if (count === 3 && currentStreak >= 3) return true
    if (count === 4 && currentStreak >= 7) return true
    return false
  }
  function dismissPushPrompt() {
    localStorage.setItem(PUSH_KEY, String(getPushPromptCount() + 1))
    setShowPushPrompt(false)
  }
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [labelScan, setLabelScan] = useState<LabelScanState>(null)
  const [labelQuantity, setLabelQuantity] = useState('1')
  const [labelScanning, setLabelScanning] = useState(false)
  const [labelSaved, setLabelSaved] = useState(false)
  const [savedLabels, setSavedLabels] = useState<SavedLabel[]>([])
  const [showLabels, setShowLabels] = useState(false)
  const [labelAddId, setLabelAddId] = useState<string | null>(null)
  const [labelAddServings, setLabelAddServings] = useState('1')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const labelFileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const today = logDateCT()
  const [viewDate, setViewDate] = useState(today)

  function getYesterday(date: string): string {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }

  useEffect(() => {
    fetchSavedMeals()
    fetchSavedLabels()
    fetch('/api/summary').then(r => r.json()).then(d => {
      if (d.calorieGoal) setCalorieGoal(d.calorieGoal)
      if (d.proteinGoal) setProteinGoal(d.proteinGoal)
      if (d.carbGoal) setCarbGoal(d.carbGoal)
      if (d.fatGoal) setFatGoal(d.fatGoal)
      if (d.streak) setStreak(d.streak)
    })
  }, [])

  useEffect(() => { fetchLogs() }, [viewDate])

  useEffect(() => {
    if (!estimating) { setThinkingIdx(0); return }
    const id = setInterval(() => setThinkingIdx(i => (i + 1) % THINKING_MESSAGES.length), 1400)
    return () => clearInterval(id)
  }, [estimating])

  async function fetchLogs() {
    const res = await fetch(`/api/food?date=${viewDate}`)
    const data = await res.json()
    if (data.logs) setLogs(data.logs)
  }
  async function fetchSavedMeals() {
    const res = await fetch('/api/food/save-meal')
    const data = await res.json()
    if (data.meals) setSavedMeals(data.meals)
  }

  async function fetchSavedLabels() {
    const res = await fetch('/api/labels')
    const data = await res.json()
    if (data.labels) setSavedLabels(data.labels)
  }

  function handleLabelPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1024
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      URL.revokeObjectURL(objectUrl)
      handleScanLabel(dataUrl)
    }
    img.src = objectUrl
    e.target.value = ''
  }

  async function handleScanLabel(dataUrl: string) {
    setLabelScanning(true); setError(''); setLabelSaved(false)
    try {
      const res = await fetch('/api/food?mode=label', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setLabelScan(data.label)
      setLabelQuantity('1')
    } catch { setError('Failed to read label. Try again.') }
    finally { setLabelScanning(false) }
  }

  async function handleLogFromLabel() {
    if (!labelScan) return
    const qty = parseFloat(labelQuantity)
    if (!qty || qty <= 0) return
    setSaving(true)
    try {
      const macros = {
        total: {
          calories: Math.round(labelScan.calories * qty),
          protein: Math.round(labelScan.protein * qty),
          carbs: Math.round(labelScan.carbs * qty),
          fats: Math.round(labelScan.fats * qty),
        },
        meal_name: labelScan.name,
      }
      const res = await fetch('/api/food?mode=save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${labelScan.name} (${qty} ${qty === 1 ? 'serving' : 'servings'})`, date: viewDate, macros }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setLogs(prev => [{ id: data.log.id, raw_text: data.log.raw_text, meal_name: data.log.meal_name, calories: data.log.calories, protein: data.log.protein, carbs: data.log.carbs, fats: data.log.fats }, ...prev])
      setLabelScan(null); setLabelQuantity('1'); setLabelSaved(false)
    } catch { setError('Failed to log. Try again.') }
    finally { setSaving(false) }
  }

  async function handleSaveLabel() {
    if (!labelScan) return
    const res = await fetch('/api/labels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labelScan),
    })
    const data = await res.json()
    if (data.label) {
      setSavedLabels(prev => [data.label, ...prev])
      setLabelSaved(true)
    }
  }

  async function handleLogFromSavedLabel(label: SavedLabel) {
    const qty = parseFloat(labelAddServings)
    if (!qty || qty <= 0) return
    setSaving(true)
    try {
      const macros = {
        total: {
          calories: Math.round(label.calories * qty),
          protein: Math.round(label.protein * qty),
          carbs: Math.round(label.carbs * qty),
          fats: Math.round(label.fats * qty),
        },
        meal_name: label.name,
      }
      const res = await fetch('/api/food?mode=save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${label.name} (${qty} ${qty === 1 ? 'serving' : 'servings'})`, date: viewDate, macros }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setLogs(prev => [{ id: data.log.id, raw_text: data.log.raw_text, meal_name: data.log.meal_name, calories: data.log.calories, protein: data.log.protein, carbs: data.log.carbs, fats: data.log.fats }, ...prev])
      setLabelAddId(null); setLabelAddServings('1')
    } catch { setError('Failed to log. Try again.') }
    finally { setSaving(false) }
  }

  async function handleDeleteSavedLabel(id: string) {
    await fetch('/api/labels', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setSavedLabels(prev => prev.filter(l => l.id !== id))
  }

  async function registerPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setShowPushPrompt(false)
    setPushError(false)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      const reg = await navigator.serviceWorker.register('/sw.js')
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      })
      if (res.ok) {
        setPushEnabled(true)
        localStorage.setItem(PUSH_KEY, '5') // max out counter so no more prompts
      } else throw new Error('Subscribe API failed')
    } catch (err) {
      console.error('Push registration failed:', err)
      setPushError(true)
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1024
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      URL.revokeObjectURL(objectUrl)
      setPhotoPreview(dataUrl)
      handleEstimateFromImage(dataUrl)
    }
    img.src = objectUrl
    e.target.value = ''
  }

  async function handleEstimateFromImage(dataUrl: string) {
    setEstimating(true); setError('')
    try {
      const res = await fetch('/api/food?mode=estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setBreakdown(data.breakdown)
      setShowReasoning(false)
      setCorrectionHint('')
      setPopupText('Photo')
    } catch { setError('Failed to estimate. Try again.') }
    finally { setEstimating(false) }
  }

  function handleMic() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setError('Voice not supported on this browser'); return }

    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition

    const baseText = input
    let finalTranscript = ''

    recognition.onstart = () => setListening(true)
    recognition.onend = () => { setListening(false); recognitionRef.current = null }
    recognition.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      const voiceText = (finalTranscript + interim).trim()
      setInput(baseText ? baseText + ' ' + voiceText : voiceText)
    }
    recognition.onerror = () => { setListening(false); recognitionRef.current = null }
    recognition.start()
  }

  async function handleEstimate(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setEstimating(true); setError('')
    try {
      const res = await fetch('/api/food?mode=estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setBreakdown(data.breakdown)
      setShowReasoning(false)
      setCorrectionHint('')
      setPopupText(input)
    } catch { setError('Failed to estimate. Try again.') }
    finally { setEstimating(false) }
  }

  async function handleConfirm() {
    if (!breakdown) return
    setSaving(true)
    try {
      const res = await fetch('/api/food?mode=save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: popupText, date: viewDate, macros: breakdown }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setLogs(prev => [data.log, ...prev])
      setInput(''); setBreakdown(null)
      navigator.vibrate?.(50)
    } catch { setError('Failed to save.') }
    finally { setSaving(false) }
  }

  async function handleReestimate() {
    setReestimating(true)
    try {
      const isPhoto = popupText === 'Photo'
      const res = await fetch('/api/food?mode=estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPhoto
          ? { image: photoPreview, text: correctionHint.trim() || undefined }
          : { text: popupText }
        ),
      })
      const data = await res.json()
      if (data.breakdown) { setBreakdown(data.breakdown); setShowReasoning(false) }
    } catch { /* keep existing breakdown */ }
    finally { setReestimating(false) }
  }

  async function handleDeleteLog(id: string) {
    await fetch('/api/food', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setLogs(prev => prev.filter(l => l.id !== id))
    navigator.vibrate?.(50)
  }

  async function handleLogReestimate() {
    if (!logEdit || !logEdit.rawText.trim()) return
    setLogEditEstimating(true)
    try {
      const res = await fetch('/api/food?mode=estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: logEdit.rawText }),
      })
      const data = await res.json()
      if (data.breakdown?.total) {
        const t = data.breakdown.total
        setLogEdit(s => s && { ...s, calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats, meal_name: data.breakdown.meal_name ?? s.meal_name })
      }
    } catch { /* keep existing values */ }
    finally { setLogEditEstimating(false) }
  }

  async function handleSaveLogEdit() {
    if (!logEdit) return
    try {
      const res = await fetch('/api/food', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEdit),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setLogs(prev => prev.map(l => l.id === logEdit.id
        ? { ...l, raw_text: logEdit.rawText, meal_name: logEdit.meal_name, calories: logEdit.calories, protein: logEdit.protein, carbs: logEdit.carbs, fats: logEdit.fats }
        : l))
      setLogEdit(null)
      setLogEditMode('portion')
      navigator.vibrate?.(50)
    } catch { setError('Failed to save changes.') }
  }

  async function handleSaveMeal(log: FoodLog) {
    setSavingMealFor(log.id)
    await fetch('/api/food/save-meal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: log.meal_name ?? log.raw_text, calories: log.calories, carbs: log.carbs, protein: log.protein, fats: log.fats }),
    })
    setSavingMealFor(null)
    fetchSavedMeals()
  }

  async function handleMealRecalculate() {
    if (!mealEdit || !mealEdit.portion.trim()) return
    setMealEditEstimating(true)
    try {
      const res = await fetch('/api/food?mode=estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${mealEdit.name} - ${mealEdit.portion}` }),
      })
      const data = await res.json()
      if (data.breakdown?.total) {
        const t = data.breakdown.total
        setMealEdit(s => s && { ...s, calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats })
      }
    } catch { /* keep existing values */ }
    finally { setMealEditEstimating(false) }
  }

  async function handleSaveMealEdit() {
    if (!mealEdit) return
    await fetch('/api/food/save-meal', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mealEdit.id, name: mealEdit.name, calories: mealEdit.calories, protein: mealEdit.protein, carbs: mealEdit.carbs, fats: mealEdit.fats }),
    })
    setSavedMeals(prev => prev.map(m => m.id === mealEdit.id ? { ...m, name: mealEdit.name, calories: mealEdit.calories, protein: mealEdit.protein, carbs: mealEdit.carbs, fats: mealEdit.fats } : m))
    setMealEdit(null)
  }

  async function handleDeleteSavedMeal(id: string) {
    await fetch('/api/food/save-meal', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setSavedMeals(prev => prev.filter(m => m.id !== id))
  }

  async function handleLogSavedMeal(meal: SavedMeal) {
    setSaving(true)
    try {
      const res = await fetch('/api/food?mode=save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: meal.name, date: viewDate,
          macros: { meal_name: meal.name, total: { calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fats: meal.fats } },
        }),
      })
      const data = await res.json()
      if (!data.error) setLogs(prev => [data.log, ...prev])
    } finally { setSaving(false) }
  }

  const totals = logs.reduce(
    (acc, l) => ({ calories: acc.calories + l.calories, protein: acc.protein + l.protein, carbs: acc.carbs + l.carbs, fats: acc.fats + l.fats }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  )
  const isSaved = (log: FoodLog) => savedMeals.some(m => m.name === (log.meal_name ?? log.raw_text))

  const caloriesLogged = totals.calories
  const caloriesRemaining = calorieGoal !== null ? calorieGoal - caloriesLogged : null
  const overBudget = caloriesRemaining !== null && caloriesRemaining < 0
  const proteinRemaining = proteinGoal !== null ? Math.max(0, proteinGoal - totals.protein) : null

  return (
    <div>
      <div
        className="px-5 pt-8 pb-6"
        style={{ background: 'linear-gradient(160deg, #111110 0%, #1C1C1A 100%)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <button onClick={() => setViewDate(getYesterday(today))} disabled={viewDate !== today}
                className="p-0.5 text-neutral-600 disabled:opacity-30 transition-colors">
                <ChevronLeft size={13} />
              </button>
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-widest">
                {viewDate === today ? 'Today' : 'Yesterday'}
              </p>
              <button onClick={() => setViewDate(today)} disabled={viewDate === today}
                className="p-0.5 text-neutral-600 disabled:opacity-30 transition-colors">
                <ChevronRight size={13} />
              </button>
            </div>
            <p className="text-white font-bold text-2xl leading-tight" style={{ fontFamily: 'var(--font-bricolage)' }}>
              {formatDate(viewDate)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 mt-0.5">
            {caloriesRemaining !== null && (
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: overBudget ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                  color: overBudget ? '#F87171' : '#34D399',
                  border: `1px solid ${overBudget ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.2)'}`,
                }}
              >
                {overBudget ? `${Math.abs(caloriesRemaining)} kcal over` : `${caloriesRemaining} kcal left`}
              </span>
            )}
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

      <div className="px-4 pt-4 pb-4 space-y-4">

      {viewDate !== today && (
        <button onClick={() => setViewDate(today)}
          className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700 text-xs font-semibold text-center hover:bg-amber-100 transition-colors">
          Viewing yesterday — tap to return to today
        </button>
      )}

      {showPushPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-7 space-y-5 animate-slide-up">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <Bell size={24} className="text-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-neutral-900 font-bold text-xl">Never miss a log</h2>
                <p className="text-neutral-500 text-sm leading-relaxed">Get a nudge around meal times on days you forget to log. No spam — only when you haven&apos;t tracked yet.</p>
              </div>
            </div>
            {pushError && <p className="text-red-500 text-xs text-center">Couldn&apos;t set up notifications — check your browser settings and try again.</p>}
            <div className="flex flex-col gap-2">
              <button onClick={registerPush}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors">
                Turn on reminders
              </button>
              <button onClick={dismissPushPrompt}
                className="w-full py-2.5 text-sm text-neutral-400 font-medium">
                Not now
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Saved meals */}
      {savedMeals.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
          <button onClick={() => setShowSaved(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
            <span className="flex items-center gap-2">
              <BookOpen size={15} className="text-emerald-600" />
              Saved meals
              <span className="bg-neutral-100 text-neutral-500 text-xs px-1.5 py-0.5 rounded-full">{savedMeals.length}</span>
            </span>
            {showSaved ? <ChevronUp size={15} className="text-neutral-400" /> : <ChevronDown size={15} className="text-neutral-400" />}
          </button>

          {showSaved && (
            <div className="divide-y divide-neutral-100">
              {savedMeals.map(meal => {
                const isEditing = mealEdit?.id === meal.id
                return (
                  <div key={meal.id} className="px-4 py-3">
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <input value={mealEdit.name} onChange={e => setMealEdit(s => s && { ...s, name: e.target.value })}
                          className="w-full text-sm font-semibold text-neutral-900 border-b border-neutral-200 pb-1 focus:outline-none focus:border-emerald-500" />
                        {/* Mode toggle */}
                        <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
                          {(['portion', 'manual'] as const).map(m => (
                            <button key={m} type="button" onClick={() => setMealEditMode(m)}
                              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${mealEditMode === m ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400'}`}>
                              {m === 'portion' ? 'Adjust portion' : 'Edit manually'}
                            </button>
                          ))}
                        </div>

                        {mealEditMode === 'portion' ? (
                          <div className="flex gap-2">
                            <input value={mealEdit.portion} onChange={e => setMealEdit(s => s && { ...s, portion: e.target.value })}
                              placeholder="e.g. 300g, 1.5 cups, 2 scoops"
                              className="flex-1 text-sm bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder-neutral-400" />
                            <button onClick={handleMealRecalculate} disabled={mealEditEstimating || !mealEdit.portion.trim()}
                              className="text-xs font-semibold text-white bg-emerald-600 px-3 rounded-xl disabled:opacity-40 shrink-0">
                              {mealEditEstimating ? '...' : 'Recalculate'}
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {([['calories','Cal','text-emerald-600'],['protein','Pro','text-blue-600'],['carbs','Carb','text-orange-500'],['fats','Fat','text-yellow-500']] as const).map(([key, label, color]) => (
                              <div key={key} className="text-center">
                                <p className={`text-xs font-medium ${color} mb-1`}>{label}</p>
                                <input type="number" value={mealEdit[key as 'calories'|'protein'|'carbs'|'fats']}
                                  onChange={e => setMealEdit(s => s && { ...s, [key]: Number(e.target.value) })}
                                  className="w-full text-center text-xs font-bold bg-neutral-50 border border-neutral-200 rounded-lg py-1 focus:outline-none focus:border-emerald-500" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-2 text-center bg-neutral-50 rounded-xl p-2.5">
                          {([['calories','Cal','text-emerald-600'],['protein','Pro','text-blue-600'],['carbs','Carb','text-orange-500'],['fats','Fat','text-yellow-500']] as const).map(([key, label, color]) => (
                            <div key={key}>
                              <p className={`text-sm font-bold ${color}`}>{mealEdit[key as 'calories'|'protein'|'carbs'|'fats']}{key !== 'calories' ? 'g' : ''}</p>
                              <p className="text-neutral-400 text-xs">{label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setMealEdit(null); setMealEditMode('portion') }} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-neutral-500 border border-neutral-200 rounded-lg">
                            <X size={12} /> Cancel
                          </button>
                          <button onClick={handleSaveMealEdit} disabled={mealEditEstimating}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-white bg-emerald-600 rounded-lg font-semibold disabled:opacity-40">
                            <Check size={12} /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-neutral-800 text-sm font-medium truncate">{meal.name}</p>
                          <p className="text-neutral-400 text-xs mt-0.5">{meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fats}g F</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setMealEdit({ id: meal.id, name: meal.name, portion: '', calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fats: meal.fats })}
                            className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDeleteSavedMeal(meal.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors">
                            <Trash2 size={13} />
                          </button>
                          <button onClick={() => handleLogSavedMeal(meal)} disabled={saving}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                            <Plus size={12} /> Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Saved labels */}
      {savedLabels.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
          <button onClick={() => setShowLabels(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
            <span className="flex items-center gap-2">
              <Barcode size={15} className="text-emerald-600" />
              My labels
              <span className="bg-neutral-100 text-neutral-500 text-xs px-1.5 py-0.5 rounded-full">{savedLabels.length}</span>
            </span>
            {showLabels ? <ChevronUp size={15} className="text-neutral-400" /> : <ChevronDown size={15} className="text-neutral-400" />}
          </button>
          {showLabels && (
            <div className="divide-y divide-neutral-100">
              {savedLabels.map(label => {
                const isAdding = labelAddId === label.id
                const qty = parseFloat(labelAddServings) || 1
                return (
                  <div key={label.id} className="px-4 py-3">
                    {isAdding ? (
                      <div className="space-y-2.5">
                        <p className="text-sm font-semibold text-neutral-800">{label.name}</p>
                        <p className="text-xs text-neutral-400">Per serving: {label.calories} kcal · {label.protein}g P · {label.carbs}g C · {label.fats}g F</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-xs text-neutral-500 mb-1">Servings{label.serving_size ? ` (1 serving = ${label.serving_size})` : ''}</p>
                            <input type="number" value={labelAddServings} onChange={e => setLabelAddServings(e.target.value)}
                              step="0.5" min="0.5" placeholder="1"
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm font-bold text-neutral-900 focus:outline-none focus:border-emerald-500" />
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-neutral-400">Total</p>
                            <p className="text-sm font-bold text-emerald-600">{Math.round(label.calories * qty)} kcal</p>
                            <p className="text-xs text-neutral-400">{Math.round(label.protein * qty)}g P</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setLabelAddId(null); setLabelAddServings('1') }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-neutral-500 border border-neutral-200 rounded-lg">
                            <X size={12} /> Cancel
                          </button>
                          <button onClick={() => handleLogFromSavedLabel(label)} disabled={saving}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-white bg-emerald-600 rounded-lg font-semibold disabled:opacity-40">
                            <Plus size={12} /> Log
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-neutral-800 text-sm font-medium truncate">{label.name}</p>
                          <p className="text-neutral-400 text-xs mt-0.5">
                            {label.calories} kcal · {label.protein}g P{label.serving_size ? ` · per ${label.serving_size}` : ' · per serving'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleDeleteSavedLabel(label.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors">
                            <Trash2 size={13} />
                          </button>
                          <button onClick={() => { setLabelAddId(label.id); setLabelAddServings('1') }} disabled={saving}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                            <Plus size={12} /> Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Label scan result */}
      {labelScanning && (
        <div className="bg-white rounded-2xl p-4 flex items-center gap-3" style={{ boxShadow: 'var(--card-shadow)' }}>
          <Barcode size={18} className="text-emerald-500 shrink-0" />
          <p className="text-sm text-neutral-500">Reading nutrition label...</p>
        </div>
      )}
      {labelScan && !labelScanning && (
        <div className="bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">Label scanned</p>
              <input value={labelScan.name} onChange={e => setLabelScan(s => s && { ...s, name: e.target.value })}
                className="text-neutral-900 font-semibold text-sm w-full focus:outline-none border-b border-transparent focus:border-neutral-300 pb-0.5 bg-transparent" />
            </div>
            <button onClick={() => { setLabelScan(null); setLabelSaved(false) }} className="text-neutral-400 hover:text-neutral-600 shrink-0 mt-1">
              <X size={15} />
            </button>
          </div>

          <div>
            {labelScan.serving_size && <p className="text-xs text-neutral-400 mb-1.5">Per serving ({labelScan.serving_size})</p>}
            <div className="grid grid-cols-4 gap-2 text-center bg-neutral-50 rounded-xl p-2.5">
              {([['calories','Cal','text-emerald-600'],['protein','Pro','text-blue-600'],['carbs','Carb','text-orange-500'],['fats','Fat','text-yellow-500']] as const).map(([key, label, color]) => (
                <div key={key}>
                  <p className={`text-sm font-bold ${color}`}>{labelScan[key as 'calories'|'protein'|'carbs'|'fats']}{key !== 'calories' ? 'g' : ''}</p>
                  <p className="text-neutral-400 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-neutral-500 mb-1">Servings</p>
              <input type="number" value={labelQuantity} onChange={e => setLabelQuantity(e.target.value)}
                step="0.5" min="0.5" placeholder="1"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-base font-bold text-neutral-900 focus:outline-none focus:border-emerald-500" />
            </div>
            {labelQuantity && parseFloat(labelQuantity) > 0 && (
              <div className="text-right">
                <p className="text-xs text-neutral-400">Total</p>
                <p className="text-sm font-bold text-emerald-600">{Math.round(labelScan.calories * parseFloat(labelQuantity))} kcal</p>
                <p className="text-xs text-neutral-400">{Math.round(labelScan.protein * parseFloat(labelQuantity))}g protein</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSaveLabel} disabled={labelSaved}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-colors ${labelSaved ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
              {labelSaved ? '✓ Saved' : 'Save label'}
            </button>
            <button onClick={handleLogFromLabel} disabled={saving || !labelQuantity || parseFloat(labelQuantity) <= 0}
              className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-40 transition-colors">
              Log
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleEstimate} className="space-y-3">
        <div className="relative">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEstimate(e) } }}
            placeholder="e.g. 200g grilled chicken, 1 cup white rice, side of broccoli"
            className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3.5 pr-20 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-500 transition-colors resize-none text-sm"
            rows={3} />
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors" title="Log from photo">
              <Camera size={16} />
            </button>
            <button type="button" onClick={() => labelFileInputRef.current?.click()}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors" title="Scan nutrition label">
              <Barcode size={16} />
            </button>
            <button type="button" onClick={handleMic}
              className={`p-2 rounded-xl transition-colors ${listening ? 'bg-red-100 text-red-500' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500'}`} title="Speak your meal">
              <Mic size={16} />
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
        <input ref={labelFileInputRef} type="file" accept="image/*" capture="environment" onChange={handleLabelPhotoSelect} className="hidden" />


        {photoPreview && (
          <div className="relative">
            <img src={photoPreview} alt="Food photo" className="w-full h-32 object-cover rounded-xl" />
            <button type="button" onClick={() => setPhotoPreview(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
              <X size={12} />
            </button>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={estimating || (!input.trim() && !photoPreview)}
          className={`w-full text-white font-semibold py-3.5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 ${estimating ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40'}`}>
          {estimating ? (
            <>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-[bounce_1s_ease-in-out_0s_infinite]" />
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
              </span>
              <span key={thinkingIdx} className="animate-[fadeIn_0.4s_ease-in]">{THINKING_MESSAGES[thinkingIdx]}</span>
            </>
          ) : 'Estimate macros'}
        </button>
      </form>

      {/* CONFIRM POPUP */}
      {breakdown && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4" onClick={() => setBreakdown(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-neutral-900 font-bold text-lg">{breakdown.meal_name}</h2>
              <p className="text-neutral-400 text-xs mt-0.5">
                {popupText === 'Photo' ? 'Got it wrong? Give us a pointer' : 'Edit your description to adjust portions, then re-estimate'}
              </p>
            </div>

            {/* Editable description + re-estimate */}
            <div className="px-5 space-y-2">
              {popupText === 'Photo' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={correctionHint}
                    onChange={e => setCorrectionHint(e.target.value)}
                    placeholder='e.g. "wrong protein" or "add a side of rice"'
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:border-emerald-500"
                  />
                  <button onClick={handleReestimate} disabled={reestimating}
                    className="self-stretch px-3 text-xs font-semibold text-white bg-emerald-600 rounded-xl disabled:opacity-40 shrink-0">
                    {reestimating ? '...' : 'Re-estimate'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <textarea
                    value={popupText}
                    onChange={e => setPopupText(e.target.value)}
                    rows={2}
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <button onClick={handleReestimate} disabled={reestimating || !popupText.trim()}
                    className="self-stretch px-3 text-xs font-semibold text-white bg-emerald-600 rounded-xl disabled:opacity-40 shrink-0">
                    {reestimating ? '...' : 'Re-estimate'}
                  </button>
                </div>
              )}
            </div>

            {/* AI reasoning — expandable */}
            {breakdown.reasoning && (
              <div className="px-5 mt-2">
                <button
                  onClick={() => setShowReasoning(s => !s)}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  💡 How we calculated this
                  <span className="ml-0.5 text-[10px]">{showReasoning ? '▲' : '▼'}</span>
                </button>
                {showReasoning && (
                  <p className="mt-1.5 text-neutral-500 text-xs leading-relaxed bg-neutral-50 rounded-xl p-3">
                    {breakdown.reasoning}
                  </p>
                )}
              </div>
            )}

            {/* Read-only per-item breakdown */}
            <div className="px-5 mt-3 space-y-1.5 max-h-48 overflow-y-auto">
              {breakdown.items.map((item, i) => (
                <div key={i} className="bg-neutral-50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-neutral-700 text-sm font-medium truncate flex-1">{item.name}</p>
                  <div className="flex gap-3 shrink-0 text-right">
                    {([['calories','Cal','text-emerald-600'],['protein','Pro','text-blue-600'],['carbs','Carb','text-orange-500'],['fats','Fat','text-yellow-500']] as const).map(([key, label, color]) => (
                      <div key={key} className="text-center w-8">
                        <p className={`text-xs font-bold ${color}`}>{item[key as keyof FoodItem]}</p>
                        <p className="text-neutral-400 text-[10px]">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mx-5 mt-3 bg-neutral-900 rounded-2xl p-4">
              <p className="text-neutral-400 text-xs font-medium mb-2">Total</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Cal', value: breakdown.total.calories, color: 'text-emerald-400' },
                  { label: 'Pro', value: `${breakdown.total.protein}g`, color: 'text-blue-400' },
                  { label: 'Carb', value: `${breakdown.total.carbs}g`, color: 'text-orange-400' },
                  { label: 'Fat', value: `${breakdown.total.fats}g`, color: 'text-yellow-400' },
                ].map(m => (
                  <div key={m.label}>
                    <p className={`font-bold text-lg ${m.color}`}>{m.value}</p>
                    <p className="text-neutral-500 text-xs">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 p-5">
              <button onClick={() => setBreakdown(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold py-3 rounded-xl text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={saving || reestimating}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                {saving ? 'Saving...' : 'Confirm & log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's macro progress */}
      {logs.length > 0 && calorieGoal && (
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Today&apos;s intake</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Calories', current: totals.calories, goal: calorieGoal, unit: 'kcal', color: 'text-emerald-600', bar: 'bg-emerald-600' },
              { label: 'Protein', current: totals.protein, goal: proteinGoal, unit: 'g', color: 'text-blue-600', bar: 'bg-blue-600' },
              { label: 'Carbs', current: totals.carbs, goal: carbGoal, unit: 'g', color: 'text-orange-500', bar: 'bg-orange-500' },
              { label: 'Fats', current: totals.fats, goal: fatGoal, unit: 'g', color: 'text-yellow-500', bar: 'bg-yellow-500' },
            ].map(({ label, current, goal, unit, color, bar }) => {
              const pct = goal && goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
              return (
                <div key={label} className="bg-neutral-50 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-neutral-500 font-medium">{label}</p>
                    <p className="text-xs text-neutral-400">{pct}%</p>
                  </div>
                  <p className={`text-sm font-bold ${color}`}>
                    {current}
                    {goal && <span className="text-neutral-400 font-normal text-xs"> / {goal}{unit === 'kcal' ? ' kcal' : unit}</span>}
                  </p>
                  <div className="h-1 bg-neutral-200 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Log entries */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Logged today</p>
          {logs.map(log => {
            const isEditing = logEdit?.id === log.id
            const alreadySaved = isSaved(log)
            return (
              <div key={log.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
                {isEditing ? (
                  <div className="space-y-2.5">
                    <input value={logEdit.meal_name} onChange={e => setLogEdit(s => s && { ...s, meal_name: e.target.value })}
                      className="w-full text-sm font-semibold text-neutral-900 border-b border-neutral-200 pb-1 focus:outline-none focus:border-emerald-500" />
                    {/* Mode toggle */}
                    <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
                      {(['portion', 'manual'] as const).map(m => (
                        <button key={m} type="button" onClick={() => setLogEditMode(m)}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${logEditMode === m ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400'}`}>
                          {m === 'portion' ? 'Adjust portion' : 'Edit manually'}
                        </button>
                      ))}
                    </div>
                    {logEditMode === 'portion' ? (
                      <div className="flex gap-2">
                        <textarea value={logEdit.rawText} onChange={e => setLogEdit(s => s && { ...s, rawText: e.target.value })}
                          rows={2} placeholder="Describe the meal with portions..."
                          className="flex-1 text-sm bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 resize-none placeholder-neutral-400" />
                        <button onClick={handleLogReestimate} disabled={logEditEstimating || !logEdit.rawText.trim()}
                          className="self-stretch px-3 text-xs font-semibold text-white bg-emerald-600 rounded-xl disabled:opacity-40 shrink-0">
                          {logEditEstimating ? '...' : 'Re-estimate'}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {([['calories','Cal','text-emerald-600'],['protein','Pro','text-blue-600'],['carbs','Carb','text-orange-500'],['fats','Fat','text-yellow-500']] as const).map(([key, label, color]) => (
                          <div key={key} className="text-center">
                            <p className={`text-xs font-medium ${color} mb-1`}>{label}</p>
                            <input type="number" value={logEdit[key as 'calories'|'protein'|'carbs'|'fats']}
                              onChange={e => setLogEdit(s => s && { ...s, [key]: Number(e.target.value) })}
                              className="w-full text-center text-sm font-bold bg-neutral-50 border border-neutral-200 rounded-lg py-1.5 focus:outline-none focus:border-emerald-500" />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Macro totals */}
                    <div className="grid grid-cols-4 gap-2 text-center bg-neutral-50 rounded-xl p-2.5">
                      {([['calories','Cal','text-emerald-600'],['protein','Pro','text-blue-600'],['carbs','Carb','text-orange-500'],['fats','Fat','text-yellow-500']] as const).map(([key, label, color]) => (
                        <div key={key}>
                          <p className={`text-sm font-bold ${color}`}>{logEdit[key as 'calories'|'protein'|'carbs'|'fats']}{key !== 'calories' ? 'g' : ''}</p>
                          <p className="text-neutral-400 text-xs">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setLogEdit(null); setLogEditMode('portion') }} className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-neutral-500 border border-neutral-200 rounded-xl hover:bg-neutral-50">
                        <X size={14} /> Cancel
                      </button>
                      <button onClick={handleSaveLogEdit} disabled={logEditEstimating} className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold disabled:opacity-40">
                        <Check size={14} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-neutral-800 text-sm font-semibold truncate">{log.meal_name ?? log.raw_text}</p>
                        {log.meal_name && <p className="text-neutral-400 text-xs truncate">{log.raw_text}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setLogEditMode('portion'); setLogEdit({ id: log.id, rawText: log.raw_text, calories: log.calories, protein: log.protein, carbs: log.carbs, fats: log.fats, meal_name: log.meal_name ?? log.raw_text }) }}
                          className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      {[
                        { label: 'Cal', value: log.calories, color: 'text-emerald-600' },
                        { label: 'Pro', value: `${log.protein}g`, color: 'text-blue-600' },
                        { label: 'Carb', value: `${log.carbs}g`, color: 'text-orange-500' },
                        { label: 'Fat', value: `${log.fats}g`, color: 'text-yellow-500' },
                      ].map(m => (
                        <div key={m.label}>
                          <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                          <p className="text-neutral-400 text-xs">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    {!alreadySaved ? (
                      <button onClick={() => handleSaveMeal(log)} disabled={savingMealFor === log.id}
                        className="mt-2.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                        <Plus size={12} />
                        {savingMealFor === log.id ? 'Saving...' : 'Save as meal'}
                      </button>
                    ) : (
                      <p className="mt-2 text-xs text-neutral-300 font-medium">✓ Saved to meals</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center">
            <Utensils size={24} className="text-neutral-300" />
          </div>
          <div className="text-center">
            <p className="text-neutral-600 text-sm font-semibold">Nothing logged yet</p>
            <p className="text-neutral-400 text-xs mt-1">Any description gets you started — even &ldquo;burger and fries&rdquo;</p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const out = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i)
  return out
}
