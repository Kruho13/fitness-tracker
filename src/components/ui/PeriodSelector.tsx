'use client'

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D Avg' },
  { value: '30d', label: '30D Avg' },
] as const

export type Period = (typeof PERIODS)[number]['value']

export default function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
      {PERIODS.map(p => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
            value === p.value ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
