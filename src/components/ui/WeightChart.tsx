'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays } from 'date-fns'

interface WeightPoint { date: string; weight_lbs: number }
interface WeekAvg { label: string; weight: number }

function weeklyAverages(data: WeightPoint[]): WeekAvg[] {
  const today = new Date()
  const result: WeekAvg[] = []

  for (let w = 3; w >= 0; w--) {
    const end = subDays(today, w * 7)
    const start = subDays(end, 7)

    const inRange = data.filter(d => {
      const date = new Date(d.date + 'T12:00:00')
      return date > start && date <= end
    })

    if (inRange.length > 0) {
      const avg = inRange.reduce((sum, d) => sum + d.weight_lbs, 0) / inRange.length
      result.push({
        label: format(start, 'MMM d') + '–' + format(end, 'MMM d'),
        weight: Math.round(avg * 10) / 10,
      })
    }
  }

  return result
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm shadow-sm">
      <p className="text-neutral-500 text-xs mb-0.5">{label}</p>
      <p className="text-neutral-900 font-bold">{payload[0].value} lbs</p>
      <p className="text-neutral-400 text-xs">weekly avg</p>
    </div>
  )
}

export default function WeightChart({ data }: { data: WeightPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center justify-center h-40">
        <p className="text-neutral-400 text-sm">Log your weight to see your trend</p>
      </div>
    )
  }

  const chartData = weeklyAverages(data)

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center justify-center h-40">
        <p className="text-neutral-400 text-sm">Log your weight to see your trend</p>
      </div>
    )
  }

  const weights = chartData.map(d => d.weight)
  const minY = Math.floor(Math.min(...weights)) - 2
  const maxY = Math.ceil(Math.max(...weights)) + 2

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
      <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-4">Weight — 4-week avg</h3>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={[minY, maxY]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="weight" stroke="#059669" strokeWidth={2.5}
            dot={{ fill: '#059669', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#059669', strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
