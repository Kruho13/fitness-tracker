import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient as createServerClient } from '@supabase/supabase-js'

const MEAL_CONFIG = {
  breakfast: { body: "Morning — log breakfast to start your day on track." },
  lunch:     { body: "Lunch time — log what you ate to stay on track." },
  dinner:    { body: "Dinner time — log your last meal and close out your day." },
} as const

type Meal = keyof typeof MEAL_CONFIG

export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const meal = req.nextUrl.searchParams.get('meal') as Meal | null
  if (!meal || !MEAL_CONFIG[meal]) {
    return NextResponse.json({ error: 'Invalid meal param' }, { status: 400 })
  }

  const config = MEAL_CONFIG[meal]

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (!subscriptions?.length) return NextResponse.json({ sent: 0, skipped: 0 })

  const toNotify = subscriptions

  let sent = 0
  const stale: string[] = []

  await Promise.all(toNotify.map(async (sub) => {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: 'Pulse',
          body: config.body,
          url: '/log-food',
        })
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 410) stale.push(sub.user_id)
    }
  }))

  if (stale.length) {
    await supabase.from('push_subscriptions').delete().in('user_id', stale)
  }

  return NextResponse.json({ sent, skipped: toNotify.length - sent })
}
