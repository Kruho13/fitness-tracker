'use client'

interface MacroCardProps {
  label: string
  current: number
  goal: number
  unit?: string
  accentClass: string
  featured?: boolean
}

const ACCENT: Record<string, { stroke: string; glow: string; text: string }> = {
  'text-emerald-600': { stroke: '#059669', glow: 'rgba(5,150,105,0.25)',  text: '#059669' },
  'text-blue-600':    { stroke: '#2563EB', glow: 'rgba(37,99,235,0.22)',  text: '#2563EB' },
  'text-orange-500':  { stroke: '#F97316', glow: 'rgba(249,115,22,0.22)', text: '#F97316' },
  'text-yellow-500':  { stroke: '#CA8A04', glow: 'rgba(202,138,4,0.22)',  text: '#CA8A04' },
}

export default function MacroCard({ label, current, goal, unit = 'g', accentClass }: MacroCardProps) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0
  const colors = ACCENT[accentClass] ?? ACCENT['text-emerald-600']

  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  const overBudget = goal > 0 && current > goal

  return (
    <div className="bg-white rounded-3xl p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em] mb-3">{label}</p>

      <div className="flex items-center gap-3">
        {/* Arc ring */}
        <div className="relative shrink-0" style={{ width: 68, height: 68 }}>
          <svg viewBox="0 0 80 80" width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx="40" cy="40" r={r} fill="none" stroke="#F1F1EF" strokeWidth="7" />
            {/* Fill */}
            <circle
              cx="40" cy="40" r={r} fill="none"
              stroke={overBudget ? '#EF4444' : colors.stroke}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={offset}
              style={{
                transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)',
                filter: `drop-shadow(0 0 5px ${overBudget ? 'rgba(239,68,68,0.4)' : colors.glow})`,
              }}
            />
          </svg>
          {/* Percentage inside ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color: overBudget ? '#EF4444' : colors.text }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>

        {/* Number */}
        <div className="min-w-0">
          <p
            className="leading-none font-bold text-neutral-900"
            style={{
              fontFamily: 'var(--font-bricolage)',
              fontSize: current.toLocaleString().length > 4 ? '1.6rem' : '2rem',
              color: overBudget ? '#EF4444' : undefined,
            }}
          >
            {current.toLocaleString()}
          </p>
          <p className="text-xs text-neutral-400 mt-1.5 truncate">
            / {goal.toLocaleString()} {unit}
          </p>
        </div>
      </div>
    </div>
  )
}
