import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { todayCT } from '@/lib/utils'

export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  // Protect cron endpoint
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = todayCT()
  const currentHourCT = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false })
  const hour = parseInt(currentHourCT)

  // Get subscriptions where notify_hour matches current CT hour
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .eq('notify_hour', hour)

  if (!subscriptions?.length) return NextResponse.json({ sent: 0 })

  // Get users who have already logged today
  const userIds = subscriptions.map(s => s.user_id)
  const { data: loggedToday } = await supabase
    .from('food_logs')
    .select('user_id')
    .eq('date', today)
    .in('user_id', userIds)

  const loggedSet = new Set((loggedToday ?? []).map(l => l.user_id))

  // Only notify users who haven't logged today
  const toNotify = subscriptions.filter(s => !loggedSet.has(s.user_id))

  let sent = 0
  const stale: string[] = []

  await Promise.all(toNotify.map(async (sub) => {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: 'Pulse',
          body: "Don't let your streak slip — log today's meals 🔥",
          url: '/log-food',
        })
      )
      sent++
    } catch (err: any) {
      // 410 Gone = subscription expired, clean it up
      if (err.statusCode === 410) stale.push(sub.user_id)
    }
  }))

  // Remove expired subscriptions
  if (stale.length) {
    await supabase.from('push_subscriptions').delete().in('user_id', stale)
  }

  return NextResponse.json({ sent, skipped: toNotify.length - sent })
}
