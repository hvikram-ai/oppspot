/**
 * Alert Subscription Hook
 * Provides real-time updates for alerts using Supabase subscriptions
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAlertSubscription(onUpdate?: () => void) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to system_alerts table changes
    const channel = supabase
      .channel('system_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'system_alerts',
        },
        (payload) => {
          console.log('[Alert Subscription] Change received:', payload)

          // Trigger refresh callback
          if (onUpdate) {
            onUpdate()
          }
        }
      )
      .subscribe((status) => {
        console.log('[Alert Subscription] Status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      console.log('[Alert Subscription] Unsubscribing...')
      supabase.removeChannel(channel)
    }
  }, [onUpdate])

  return { isConnected }
}
