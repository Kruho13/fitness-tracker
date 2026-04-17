'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button onClick={handleSignOut}
      className="w-full flex items-center justify-center gap-2 py-3 text-sm text-neutral-400 hover:text-red-500 transition-colors border border-neutral-200 rounded-2xl hover:border-red-200">
      <LogOut size={15} />
      Sign out
    </button>
  )
}
