import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient as createServerClient } from '@supabase/supabase-js'

const MEAL_VARIANTS: Record<string, string[]> = {
  breakfast: [
    "Morning {name}— breakfast won't log itself",
    "Day starts now. Get breakfast logged.",
    "{name}fuel up. Log breakfast.",
  ],
  lunch: [
    "Halfway through. Log lunch before you forget what you had",
    "{name}lunch break = log break",
    "Midday check-in — what did you eat?",
  ],
  dinner: [
    "Almost done. Log dinner and close the day",
    "{name}one more entry and you're done for the day",
    "End of day. Log dinner and call it a day.",
  ],
}

type Meal = keyof typeof MEAL_VARIANTS

function getMealBody(meal: Meal, name: string | null): string {
  const variants = MEAL_VARIANTS[meal]
  const template = variants[Math.floor(Math.random() * variants.length)]
  const prefix = name ? `${name}, ` : ''
  return template.replace('{name}', prefix)
}

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
  if (!meal || !MEAL_VARIANTS[meal]) {
    return NextResponse.json({ error: 'Invalid meal param' }, { status: 400 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (!subscriptions?.length) return NextResponse.json({ sent: 0, skipped: 0 })

  const userIds = subscriptions.map(s => s.user_id)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, name')
    .in('user_id', userIds)

  const nameMap: Record<string, string | null> = {}
  profiles?.forEach(p => { nameMap[p.user_id] = p.name ?? null })

  let sent = 0
  const stale: string[] = []

  await Promise.all(subscriptions.map(async (sub) => {
    const name = nameMap[sub.user_id] ?? null
    const body = getMealBody(meal, name)
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: 'Pulse',
          body,
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

  return NextResponse.json({ sent, skipped: subscriptions.length - sent })
}
