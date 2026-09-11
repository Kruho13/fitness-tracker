'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Salad, Sparkles, BarChart2, User } from 'lucide-react'

const SIDE_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/nutrition', label: 'Nutrition', icon: Salad },
]
const SIDE_ITEMS_RIGHT = [
  { href: '/reports', label: 'Progress', icon: BarChart2 },
  { href: '/goals', label: 'Profile', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const askPulseActive = pathname === '/ask-pulse'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {SIDE_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                active ? 'text-emerald-600' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}

        {/* Ask Pulse — center, visually raised: the future home of personalized AI interpretation */}
        <Link href="/ask-pulse" className="flex flex-col items-center gap-0.5 -mt-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{
              background: askPulseActive
                ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                : 'linear-gradient(135deg, #111110 0%, #1C1C1A 100%)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            }}
          >
            <Sparkles size={20} strokeWidth={2} className="text-white" />
          </div>
          <span className={`text-[10px] font-medium ${askPulseActive ? 'text-emerald-600' : 'text-neutral-400'}`}>
            Ask Pulse
          </span>
        </Link>

        {SIDE_ITEMS_RIGHT.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                active ? 'text-emerald-600' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
