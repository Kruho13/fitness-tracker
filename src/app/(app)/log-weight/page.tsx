'use client'

import { useState, useEffect } from 'react'
import { Scale, Info } from 'lucide-react'
import { todayCT, formatDate } from '@/lib/utils'
import { format } from 'date-fns'

interface WeightLog { date: string; weight_lbs: number }

export default function LogWeightPage() {
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [todayLog, setTodayLog] = useState<number | null>(null)
  const [recentLogs, setRecentLogs] = useState<WeightLog[]>([])
  const today = todayCT()

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fourWeeksAgo = (() => {
      const d = new Date(); d.setDate(d.getDate() - 28); return d.toISOString().split('T')[0]
    })()

    const { data } = await supabase
      .from('weight_logs')
      .select('date,weight_lbs')
      .eq('user_id', user.id)
      .gte('date', fourWeeksAgo)
      .order('date', { ascending: false })

    if (data) {
      setRecentLogs(data)
      const todayEntry = data.find(d => d.date === today)
      if (todayEntry) { setTodayLog(todayEntry.weight_lbs); setWeight(String(todayEntry.weight_lbs)) }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(weight)
    if (!val || val <= 0 || val > 999) { setError('Enter a valid weight in lbs'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_lbs: val, date: today }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setTodayLog(val); setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      // Update local list
      setRecentLogs(prev => {
        const filtered = prev.filter(l => l.date !== today)
        return [{ date: today, weight_lbs: val }, ...filtered]
      })
    } catch { setError('Failed to save. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Log Weight</h1>
        <p className="text-neutral-400 text-sm mt-0.5">{formatDate(today)}</p>
      </div>

      <div className="flex gap-2.5 bg-white border border-neutral-200 rounded-xl p-3">
        <Info size={14} className="text-neutral-400 shrink-0 mt-0.5" />
        <p className="text-neutral-500 text-xs leading-relaxed">
          Weigh yourself at the same time each day — ideally first thing in the morning after using the bathroom.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Today&apos;s weight (lbs)</label>
          <div className="relative">
            <input type="number" step="0.1" min="50" max="999" value={weight}
              onChange={e => setWeight(e.target.value)} placeholder="e.g. 182.4"
              className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-5 text-neutral-900 text-3xl font-bold placeholder-neutral-300 focus:outline-none focus:border-emerald-500 transition-colors pr-16" />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">lbs</span>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading || !weight}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm">
          <Scale size={17} />
          {loading ? 'Saving...' : saved ? '✓ Saved!' : todayLog ? 'Update weight' : 'Log weight'}
        </button>
      </form>

      {recentLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Recent logs</p>
          <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100">
            {recentLogs.map(log => (
              <div key={log.date} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-neutral-500">
                  {log.date === today
                    ? <span className="text-emerald-600 font-semibold">Today</span>
                    : format(new Date(log.date + 'T12:00:00'), 'EEE, MMM d')}
                </p>
                <p className="text-sm font-bold text-neutral-900">{log.weight_lbs} lbs</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
