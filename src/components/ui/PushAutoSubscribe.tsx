'use client'

import { useEffect } from 'react'

export default function PushAutoSubscribe() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission !== 'granted') return

    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return

      const key = JSON.stringify(sub)
      if (sessionStorage.getItem('push_sub') === key) return
      sessionStorage.setItem('push_sub', key)

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      })
    }).catch(() => {})
  }, [])
  return null
}
