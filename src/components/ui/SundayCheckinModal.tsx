'use client'

import { useState } from 'react'
import { X, ClipboardCheck } from 'lucide-react'

type Strength = 'up' | 'same' | 'down'
type GymConsistency = 'consistent' | 'missed_some' | 'didnt_go'
type Sleep = 'good' | 'alright' | 'poor'
type TrackingQuality = 'tracked_everything' | 'missed_some' | 'didnt_track'

export default function SundayCheckinModal({ show }: { show: boolean }) {
  const [open, setOpen] = useState(show)
  const [strength, setStrength] = useState<Strength>('same')
  const [gym, setGym] = useState<GymConsistency>('consistent')
  const [sleep, setSleep] = useState<Sleep>('good')
  const [tracking, setTracking] = useState<TrackingQuality>('tracked_everything')
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [adjustment, setAdjustment] = useState<{
    weight_was: number; weight_now: number
    old_tdee: number | null; new_tdee: number
    old_calories: number; new_calories: number
  } | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strength, gym_consistency: gym, sleep, tracking_quality: tracking }),
      })
      const data = await res.json()
      if (data.report?.report_text) setReport(data.report.report_text)
      if (data.adjustment) setAdjustment(data.adjustment)
    } finally {
      setGenerating(false)
    }
  }

  function renderReport(text: string) {
    return text.split('\n\n').map((para, i) => {
      const html = para.replace(/\*\*(.+?)\*\*/g, '<strong class="text-neutral-900 font-semibold">$1</strong>')
      return <p key={i} className="text-neutral-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {report ? (
          <div className="p-6 space-y-5 overflow-y-auto">
            <div className="text-center space-y-2 pb-4 border-b border-neutral-100">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <ClipboardCheck size={22} className="text-emerald-600" />
              </div>
              <h2 className="text-neutral-900 font-bold text-xl">Your week is ready</h2>
              <p className="text-neutral-400 text-sm">Find it anytime in the Reports tab</p>
            </div>
            <div className="space-y-3">{renderReport(report)}</div>
            {adjustment && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-blue-800 font-semibold text-sm">Goals updated automatically</p>
                <p className="text-blue-600 text-xs mt-1">
                  You&apos;re {Math.abs(adjustment.weight_now - adjustment.weight_was).toFixed(1)} lbs {adjustment.weight_now < adjustment.weight_was ? 'lighter' : 'heavier'} than when you last set your goals.
                  {adjustment.old_tdee ? ` Your maintenance dropped from ${adjustment.old_tdee} → ${adjustment.new_tdee} kcal.` : ''}
                  {' '}New calorie target: <strong>{adjustment.new_calories} kcal/day</strong> (was {adjustment.old_calories}).
                </p>
              </div>
            )}
            <button onClick={() => setOpen(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors">
              Got it
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-5 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-neutral-900 font-bold text-lg">Weekly check-in</h2>
                <p className="text-neutral-400 text-xs mt-0.5">4 questions — generates your weekly report</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl hover:bg-neutral-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <CheckinQ label="How did your strength feel this week?" options={[
                { value: 'up', label: 'Went up' },
                { value: 'same', label: 'Stayed the same' },
                { value: 'down', label: 'Went down' },
              ]} value={strength} onChange={v => setStrength(v as Strength)} />
              <CheckinQ label="Gym consistency" options={[
                { value: 'consistent', label: 'Consistent — hit all sessions' },
                { value: 'missed_some', label: 'Missed some days' },
                { value: 'didnt_go', label: "Didn't really go" },
              ]} value={gym} onChange={v => setGym(v as GymConsistency)} />
              <CheckinQ label="Sleep quality" options={[
                { value: 'good', label: 'Good sleep' },
                { value: 'alright', label: 'Alright' },
                { value: 'poor', label: 'Poor sleep' },
              ]} value={sleep} onChange={v => setSleep(v as Sleep)} />
              <CheckinQ label="Tracking consistency" options={[
                { value: 'tracked_everything', label: 'Tracked everything' },
                { value: 'missed_some', label: 'Missed some days' },
                { value: 'didnt_track', label: "Didn't really track" },
              ]} value={tracking} onChange={v => setTracking(v as TrackingQuality)} />
              <button type="submit" disabled={generating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors">
                {generating ? 'Generating your report...' : 'Generate weekly report'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckinQ({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-neutral-700 text-sm font-semibold">{label}</p>
      <div className="space-y-1.5">
        {options.map(opt => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${value === opt.value
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
              : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
