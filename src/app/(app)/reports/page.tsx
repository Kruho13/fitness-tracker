'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import { formatWeekRange } from '@/lib/utils'

interface WeeklyReport {
  id: string; week_start: string; week_end: string; report_text: string
  avg_calories: number | null; avg_protein: number | null; avg_carbs: number | null; avg_fats: number | null
  weight_start: number | null; weight_end: number | null; days_logged: number
}

type Strength = 'up' | 'same' | 'down'
type GymConsistency = 'consistent' | 'missed_some' | 'didnt_go'
type Sleep = 'good' | 'alright' | 'poor'
type TrackingQuality = 'tracked_everything' | 'missed_some' | 'didnt_track'

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCheckin, setShowCheckin] = useState(searchParams.get('checkin') === '1')
  const [generating, setGenerating] = useState(false)
  const [newReportId, setNewReportId] = useState<string | null>(null)
  const [goals, setGoals] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null)

  const [strength, setStrength] = useState<Strength>('same')
  const [gym, setGym] = useState<GymConsistency>('consistent')
  const [sleep, setSleep] = useState<Sleep>('good')
  const [tracking, setTracking] = useState<TrackingQuality>('tracked_everything')

  useEffect(() => {
    fetchReports()
    fetch('/api/goals').then(r => r.json()).then(d => { if (d.goals) setGoals(d.goals) })
  }, [])

  async function fetchReports() {
    const res = await fetch('/api/reports')
    const data = await res.json()
    if (data.reports) {
      setReports(data.reports)
      if (data.reports.length > 0) setExpanded(data.reports[0].id)
    }
  }

  async function handleCheckinSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strength, gym_consistency: gym, sleep, tracking_quality: tracking }),
      })
      const data = await res.json()
      if (data.report) {
        setNewReportId(data.report.id)
        setShowCheckin(false)
        await fetchReports()
        setExpanded(data.report.id)
        router.replace('/reports')
      }
    } finally { setGenerating(false) }
  }

  function renderReport(text: string) {
    return text.split('\n\n').map((para, i) => {
      const html = para.replace(/\*\*(.+?)\*\*/g, '<strong class="text-neutral-900 font-semibold">$1</strong>')
      return <p key={i} className="text-neutral-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
    })
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
          <p className="text-neutral-400 text-sm mt-0.5">Weekly insights</p>
        </div>
        <button onClick={() => setShowCheckin(v => !v)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3.5 py-2.5 rounded-xl transition-colors">
          <ClipboardCheck size={15} />
          Check-in
        </button>
      </div>

      {newReportId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-emerald-800 font-semibold text-sm">✓ Weekly report generated</p>
          <p className="text-emerald-600 text-xs mt-0.5">Your new report is at the top below.</p>
        </div>
      )}

      {/* Check-in form */}
      {showCheckin && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-5">
          <div>
            <h2 className="text-neutral-900 font-bold">Weekly check-in</h2>
            <p className="text-neutral-400 text-xs mt-1">4 questions — generates your personalized report</p>
          </div>
          <form onSubmit={handleCheckinSubmit} className="space-y-5">
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors">
              {generating ? 'Generating report...' : 'Generate weekly report'}
            </button>
          </form>
        </div>
      )}

      {reports.length === 0 && !showCheckin && (
        <p className="text-center text-neutral-400 text-sm py-10">No reports yet. Complete your first weekly check-in to generate one.</p>
      )}

      <div className="space-y-3">
        {reports.map(report => {
          const isExpanded = expanded === report.id
          const weightDelta = report.weight_start && report.weight_end ? (report.weight_end - report.weight_start).toFixed(1) : null
          const deltaNum = weightDelta ? Number(weightDelta) : null
          const isNew = report.id === newReportId

          return (
            <div key={report.id} className={`bg-white rounded-2xl overflow-hidden border ${isNew ? 'border-emerald-300' : 'border-neutral-200'}`}>
              <button onClick={() => setExpanded(isExpanded ? null : report.id)}
                className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-neutral-50 transition-colors">
                <div>
                  <p className="text-neutral-900 font-semibold text-sm">{formatWeekRange(report.week_start, report.week_end)}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {report.avg_calories && <span className="text-neutral-400 text-xs">{report.avg_calories}{goals?.calories ? `/${goals.calories}` : ''} kcal</span>}
                    {report.avg_protein && <span className="text-neutral-400 text-xs">{report.avg_protein}{goals?.protein ? `/${goals.protein}` : ''}g pro</span>}
                    {deltaNum !== null && (
                      <span className={`text-xs font-semibold ${deltaNum < 0 ? 'text-emerald-600' : deltaNum > 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                        {deltaNum > 0 ? '+' : ''}{weightDelta} lbs
                      </span>
                    )}
                    <span className="text-neutral-300 text-xs">{report.days_logged}/7 days</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-neutral-400 shrink-0" /> : <ChevronDown size={16} className="text-neutral-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-5 border-t border-neutral-100 pt-4 space-y-4">
                  {/* Stats vs goals */}
                  {(report.avg_calories || report.avg_protein) && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Calories', avg: report.avg_calories, goal: goals?.calories, unit: 'kcal', color: 'text-emerald-600' },
                        { label: 'Protein', avg: report.avg_protein, goal: goals?.protein, unit: 'g', color: 'text-blue-600' },
                        { label: 'Carbs', avg: report.avg_carbs, goal: goals?.carbs, unit: 'g', color: 'text-orange-500' },
                        { label: 'Fats', avg: report.avg_fats, goal: goals?.fats, unit: 'g', color: 'text-yellow-500' },
                      ].map(m => {
                        const pct = m.avg && m.goal ? Math.round((m.avg / m.goal) * 100) : null
                        return (
                          <div key={m.label} className="bg-neutral-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-neutral-500 text-xs font-medium">{m.label}</p>
                              {pct !== null && <p className="text-neutral-400 text-xs">{pct}%</p>}
                            </div>
                            <p className={`text-sm font-bold ${m.color}`}>
                              {m.avg ?? '—'}{m.avg ? m.unit === 'kcal' ? '' : m.unit : ''}
                              {m.goal && <span className="text-neutral-400 font-normal text-xs"> / {m.goal}{m.unit === 'kcal' ? '' : m.unit}</span>}
                            </p>
                            {m.unit === 'kcal' && m.avg && <p className="text-neutral-400 text-xs">kcal avg</p>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {/* Report text */}
                  <div className="space-y-3">{renderReport(report.report_text)}</div>
                </div>
              )}
            </div>
          )
        })}
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
