import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/home')

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <span className="text-lg font-bold text-neutral-900">Pulse</span>
        <Link href="/login" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto w-full gap-8">
        <div className="space-y-4">
          <div className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            AI body composition coach
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 leading-tight tracking-tight">
            Track less.<br />Learn more.
          </h1>
          <p className="text-neutral-500 text-base leading-relaxed max-w-sm mx-auto">
            Describe what you ate in plain English. Pulse estimates your macros, tracks your weight trend, and gives you a weekly report with one clear action to take.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/signup"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors text-center">
            Get started — it&apos;s free
          </Link>
          <Link href="/login"
            className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium py-3.5 rounded-2xl text-sm transition-colors text-center">
            Sign in
          </Link>
        </div>

        {/* 3 value props */}
        <div className="grid grid-cols-3 gap-4 w-full pt-2">
          {[
            { icon: '✍️', label: 'Log in plain text', detail: 'No barcodes. Just describe your meal.' },
            { icon: '📈', label: 'See your trend', detail: 'Weight and calories, week over week.' },
            { icon: '📋', label: 'Weekly report', detail: 'One action to take next week.' },
          ].map(({ icon, label, detail }) => (
            <div key={label} className="bg-white border border-neutral-200 rounded-2xl p-4 text-center space-y-1.5">
              <p className="text-2xl">{icon}</p>
              <p className="text-xs font-semibold text-neutral-800 leading-tight">{label}</p>
              <p className="text-xs text-neutral-400 leading-snug">{detail}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-neutral-400">
        Built for people who want visibility, not a second job.
      </footer>
    </div>
  )
}
