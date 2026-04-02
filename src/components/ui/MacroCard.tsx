interface MacroCardProps {
  label: string
  current: number
  goal: number
  unit?: string
  accentClass: string   // e.g. 'text-emerald-600' — drives number + bar color
  featured?: boolean    // larger card for cal + protein
}

const BAR_COLOR: Record<string, string> = {
  'text-emerald-600': 'bg-emerald-600',
  'text-blue-600': 'bg-blue-600',
  'text-orange-500': 'bg-orange-500',
  'text-yellow-500': 'bg-yellow-500',
}

export default function MacroCard({ label, current, goal, unit = 'g', accentClass, featured }: MacroCardProps) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  const barColor = BAR_COLOR[accentClass] ?? 'bg-neutral-400'

  if (featured) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <span className="text-neutral-500 text-xs font-medium uppercase tracking-wide">{label}</span>
          <span className="text-xs text-neutral-400 font-medium">{pct}%</span>
        </div>
        <div className="flex items-end gap-1">
          <span className={`text-4xl font-bold tracking-tight ${accentClass}`}>{current.toLocaleString()}</span>
          <span className="text-neutral-400 text-sm mb-1">/ {goal.toLocaleString()} {unit}</span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between">
        <span className="text-neutral-500 text-xs font-medium">{label}</span>
        <span className="text-xs text-neutral-400">{pct}%</span>
      </div>
      <div>
        <span className={`text-2xl font-bold ${accentClass}`}>{current}</span>
        <span className="text-neutral-400 text-xs ml-1">/ {goal}{unit}</span>
      </div>
      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
