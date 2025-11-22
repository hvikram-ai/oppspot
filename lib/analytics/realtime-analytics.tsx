'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface MarketSignal {
  id: string
  signal_type: string
  category: string
  location_id?: string
  signal_strength: number
  impact_score: number
  data: Record<string, unknown>
  detected_at: string
}

interface AnalyticsUpdate {
  type: 'market_signal' | 'anomaly' | 'opportunity' | 'metric_update'
  data: Record<string, unknown>
  timestamp: string
}

interface RealtimeAnalyticsContextType {
  signals: MarketSignal[]
  updates: AnalyticsUpdate[]
  isConnected: boolean
  subscribeToCategory: (category: string) => void
  unsubscribeFromCategory: (category: string) => void
}

const RealtimeAnalyticsContext = createContext<RealtimeAnalyticsContextType>({
  signals: [],
  updates: [],
  isConnected: false,
  subscribeToCategory: () => {},
  unsubscribeFromCategory: () => {}
})

export function RealtimeAnalyticsProvider({ children }: { children: ReactNode }) {
  const [signals, setSignals] = useState<MarketSignal[]>([])
  const [updates, setUpdates] = useState<AnalyticsUpdate[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(new Map())
  const supabase = createClient()

  const subscribeToCategory = (category: string) => {
    if (channels.has(category)) return

    const channel = supabase
      .channel(`analytics:${category}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_signals',
          filter: `category=eq.${category}`
        },
        (payload) => {
          const signal = payload.new as MarketSignal
          setSignals(prev => [signal, ...prev].slice(0, 50)) // Keep last 50 signals
          
          // Add to updates
          setUpdates(prev => [{
            type: 'market_signal',
            data: signal,
            timestamp: signal.detected_at
          }, ...prev].slice(0, 100))
          
          // Show notification for high-impact signals
          if (signal.impact_score > 0.7) {
            showSignalNotification(signal)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anomalies',
          filter: `entity_type=eq.category`
        },
        (payload) => {
          const anomaly = payload.new
          if (anomaly.entity_id === category) {
            setUpdates(prev => [{
              type: 'anomaly',
              data: anomaly,
              timestamp: anomaly.detected_at
            }, ...prev].slice(0, 100))
            
            // Show notification for critical anomalies
            if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
              showAnomalyNotification(anomaly)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'opportunities',
          filter: `category=eq.${category}`
        },
        (payload) => {
          const opportunity = payload.new
          setUpdates(prev => [{
            type: 'opportunity',
            data: opportunity,
            timestamp: opportunity.created_at
          }, ...prev].slice(0, 100))
          
          // Show notification for high-score opportunities
          if (opportunity.opportunity_score > 0.8) {
            showOpportunityNotification(opportunity)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          channels.set(category, channel)
        }
      })
  }

  const unsubscribeFromCategory = (category: string) => {
    const channel = channels.get(category)
    if (channel) {
      supabase.removeChannel(channel)
      channels.delete(category)
      
      if (channels.size === 0) {
        setIsConnected(false)
      }
    }
  }

  const showSignalNotification = (signal: MarketSignal) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Market Signal Detected', {
        body: `${signal.signal_type.replace(/_/g, ' ')} in ${signal.category}`,
        icon: '/icon-192.png',
        tag: `signal-${signal.id}`,
        requireInteraction: false
      })
      
      notification.onclick = () => {
        window.focus()
        // Navigate to analytics page
        window.location.href = `/analytics?category=${signal.category}`
      }
    }
  }

  const showAnomalyNotification = (anomaly: { id: string; anomaly_type: string; metric_name: string; severity: string }) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Anomaly Detected', {
        body: `${anomaly.anomaly_type} in ${anomaly.metric_name}`,
        icon: '/icon-192.png',
        tag: `anomaly-${anomaly.id}`,
        requireInteraction: anomaly.severity === 'critical'
      })

      notification.onclick = () => {
        window.focus()
      }
    }
  }

  const showOpportunityNotification = (opportunity: { id: string; description: string }) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('New Opportunity', {
        body: opportunity.description,
        icon: '/icon-192.png',
        tag: `opportunity-${opportunity.id}`,
        requireInteraction: false
      })

      notification.onclick = () => {
        window.focus()
        window.location.href = `/analytics?tab=opportunities`
      }
    }
  }

  // Don't request notification permission automatically - it must be user-initiated
  // Remove automatic permission request to avoid browser errors

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel)
      })
    }
  }, [channels, supabase])

  return (
    <RealtimeAnalyticsContext.Provider
      value={{
        signals,
        updates,
        isConnected,
        subscribeToCategory,
        unsubscribeFromCategory
      }}
    >
      {children}
    </RealtimeAnalyticsContext.Provider>
  )
}

export const useRealtimeAnalytics = () => {
  const context = useContext(RealtimeAnalyticsContext)
  if (!context) {
    throw new Error('useRealtimeAnalytics must be used within RealtimeAnalyticsProvider')
  }
  return context
}