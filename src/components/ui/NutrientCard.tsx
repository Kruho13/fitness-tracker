'use client'

export default function NutrientCard({
  label, value, unit, context,
}: { label: string; value: number; unit: string; context: string }) {
  return (
    <div className="bg-white rounded-2xl p-4" style={{ boxShadow: 'var(--card-shadow)' }}>
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em] mb-2">{label}</p>
      <p className="text-neutral-900 font-bold leading-none" style={{ fontFamily: 'var(--font-bricolage)', fontSize: '1.6rem' }}>
        {value.toLocaleString()}
        <span className="text-sm font-semibold text-neutral-400 ml-1">{unit}</span>
      </p>
      <p className="text-neutral-400 text-xs mt-2">{context}</p>
    </div>
  )
}
