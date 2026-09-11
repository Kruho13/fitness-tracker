import { Sparkles } from 'lucide-react'

export default function AskPulsePage() {
  return (
    <div>
      <div
        className="px-5 pt-8 pb-6"
        style={{ background: 'linear-gradient(160deg, #111110 0%, #1C1C1A 100%)' }}
      >
        <p className="text-neutral-500 text-xs font-semibold uppercase tracking-widest mb-1">Coming soon</p>
        <p className="text-white font-bold text-2xl leading-tight" style={{ fontFamily: 'var(--font-bricolage)' }}>
          Ask Pulse
        </p>
        <p className="text-neutral-500 text-sm mt-1">Personalized answers about your own logged data</p>
      </div>

      <div className="px-4 pt-10 pb-6 flex flex-col items-center text-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}
        >
          <Sparkles size={26} className="text-white" />
        </div>
        <div className="max-w-xs">
          <p className="text-neutral-800 font-semibold text-base">Pulse is learning your patterns</p>
          <p className="text-neutral-400 text-sm mt-1.5 leading-relaxed">
            Ask Pulse will let you ask plain-English questions about your nutrition, weight trend, and progress — built on the data you&apos;re already logging. Landing in a future update.
          </p>
        </div>
      </div>
    </div>
  )
}
