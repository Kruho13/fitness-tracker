'use client'

import { useEffect } from 'react'

export default function PushAutoSubscribe() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission === 'granted') {
      navigator.serviceWorker.register('/sw.js').then(async reg => {
        const existing = await reg.pushManager.getSubscription()
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        })
      }).catch(() => {})
    }
  }, [])
  return null
}
