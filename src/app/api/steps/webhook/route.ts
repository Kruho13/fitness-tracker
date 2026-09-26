import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { logDateCT } from '@/lib/utils'

// POST /api/steps/webhook?token=... — called by an Apple Shortcuts automation, not a
// logged-in browser session, so it authenticates via a per-user token instead of cookies.
// Uses the service-role key (server-side only) since there's no Supabase session to
// satisfy the normal RLS policy for this request.
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  const { steps, date } = await req.json()
  if (typeof steps !== 'number' || steps < 0) return NextResponse.json({ error: 'Invalid steps value' }, { status: 400 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await supabase.from('user_profiles').select('user_id').eq('webhook_token', token).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const logDate = date ?? logDateCT()

  // Each automation reports the day's cumulative step count so far — take the max
  // seen for that day, in case a stale reading arrives out of order.
  const { data: existing } = await supabase.from('step_logs').select('steps').eq('user_id', profile.user_id).eq('date', logDate).maybeSingle()
  const finalSteps = existing ? Math.max(existing.steps, steps) : steps

  const { error } = await supabase.from('step_logs').upsert(
    { user_id: profile.user_id, date: logDate, steps: finalSteps, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,date' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, steps: finalSteps })
}
