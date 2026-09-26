import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'

// GET /api/steps/token — returns the current user's webhook token, generating one on first call
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('webhook_token').eq('user_id', user.id).single()
  if (profile?.webhook_token) return NextResponse.json({ token: profile.webhook_token })

  const token = randomBytes(24).toString('hex')
  const { error } = await supabase.from('user_profiles').update({ webhook_token: token }).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token })
}
