import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/home')

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #111110 0%, #181816 60%, #0F0F0E 100%)' }}
    >
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-2xl mx-auto w-full">
        <span
          className="text-white font-bold text-xl tracking-tight"
          style={{ fontFamily: 'var(--font-bricolage)' }}
        >
          Pulse
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto w-full gap-10 py-12">

        <div className="space-y-5">
          <div
            className="inline-block text-xs font-semibold px-3.5 py-1.5 rounded-full"
            style={{
              background: 'rgba(52,211,153,0.1)',
              color: '#34D399',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
          >
            AI body composition coach
          </div>

          <h1
            className="text-white leading-[1.05] tracking-tight"
            style={{
              fontFamily: 'var(--font-bricolage)',
              fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
              fontWeight: 800,
            }}
          >
            Track less.<br />
            <span style={{ color: '#34D399' }}>Learn more.</span>
          </h1>

          <p className="text-neutral-400 text-base leading-relaxed max-w-sm mx-auto">
            Describe what you ate in plain English. Pulse estimates your macros,
            tracks your weight trend, and sends you a weekly report with one clear action.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/signup"
            className="py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              boxShadow: '0 4px 24px rgba(5,150,105,0.4)',
            }}
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#A1A1AA',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Sign in
          </Link>
        </div>

        {/* Value props — editorial numbered list */}
        <div className="w-full space-y-2.5">
          {[
            {
              n: '01',
              label: 'Log in plain text',
              detail: 'No barcodes or calorie counting — just describe your meal and the AI handles the rest.',
            },
            {
              n: '02',
              label: 'See your trend',
              detail: 'Weight and calorie averages week over week. Daily noise filtered out.',
            },
            {
              n: '03',
              label: 'Weekly report',
              detail: 'Sunday check-in takes 30 seconds. You get one specific action to take next week.',
            },
          ].map(({ n, label, detail }) => (
            <div
              key={n}
              className="flex items-start gap-4 text-left px-4 py-4 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                className="text-xs font-bold shrink-0 mt-0.5 tabular-nums"
                style={{ color: '#34D399', fontFamily: 'var(--font-bricolage)' }}
              >
                {n}
              </span>
              <div>
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-neutral-500 text-xs mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-neutral-600">
        Built for people who want visibility, not a second job.
      </footer>
    </div>
  )
}
