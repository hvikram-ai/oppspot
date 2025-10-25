/**
 * React Hooks for Real-time Subscriptions
 *
 * Provides easy-to-use hooks for subscribing to real-time updates
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getRealtimeService, type SubscriptionStatus } from '@/lib/realtime/realtime-service'
import type {
  StreamProgressUpdate,
  ScanProgressUpdate,
  SignalAlert,
  AgentExecution,
  NotificationUpdate
} from '@/lib/realtime/realtime-service'

/**
 * Hook for subscribing to stream progress updates
 */
export function useStreamProgress(streamId: string | null) {
  const [progress, setProgress] = useState<StreamProgressUpdate | null>(null)
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!streamId) return

    const service = getRealtimeService()

    try {
      const subscription = service.subscribeToStreamProgress(
        streamId,
        (update) => {
          setProgress(update)
          setError(null)
        },
        (newStatus) => {
          setStatus(newStatus)
          if (newStatus === 'error') {
            setError(new Error('Failed to connect to real-time updates'))
          }
        }
      )

      return () => {
        subscription.unsubscribe()
        setStatus('disconnected')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setStatus('error')
    }
  }, [streamId])

  return { progress, status, error, isConnected: status === 'connected' }
}

/**
 * Hook for subscribing to all streams in an organization
 */
export function useAllStreamsProgress(orgId: string | null) {
  const [updates, setUpdates] = useState<Map<string, StreamProgressUpdate>>(new Map())
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)

  const updateStream = useCallback((update: StreamProgressUpdate) => {
    setUpdates((prev) => {
      const next = new Map(prev)
      next.set(update.id, update)
      return next
    })
  }, [])

  useEffect(() => {
    if (!orgId) return

    const service = getRealtimeService()

    try {
      const subscription = service.subscribeToAllStreams(
        orgId,
        updateStream,
        (newStatus) => {
          setStatus(newStatus)
          if (newStatus === 'error') {
            setError(new Error('Failed to connect to real-time updates'))
          }
        }
      )

      return () => {
        subscription.unsubscribe()
        setStatus('disconnected')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setStatus('error')
    }
  }, [orgId, updateStream])

  return {
    updates: Array.from(updates.values()),
    status,
    error,
    isConnected: status === 'connected'
  }
}

/**
 * Hook for subscribing to scan progress
 */
export function useScanProgress(scanId: string | null) {
  const [progress, setProgress] = useState<ScanProgressUpdate | null>(null)
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!scanId) return

    const service = getRealtimeService()

    try {
      const subscription = service.subscribeToScanProgress(
        scanId,
        (update) => {
          setProgress(update)
          setError(null)
        },
        (newStatus) => {
          setStatus(newStatus)
          if (newStatus === 'error') {
            setError(new Error('Failed to connect to scan updates'))
          }
        }
      )

      return () => {
        subscription.unsubscribe()
        setStatus('disconnected')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setStatus('error')
    }
  }, [scanId])

  return { progress, status, error, isConnected: status === 'connected' }
}

/**
 * Hook for subscribing to signal alerts
 */
export function useSignalAlerts(userId: string | null) {
  const [alerts, setAlerts] = useState<SignalAlert[]>([])
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const addAlert = useCallback((alert: SignalAlert) => {
    setAlerts((prev) => [alert, ...prev])
    setUnreadCount((prev) => prev + 1)
  }, [])

  const markAsRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    if (!userId) return

    const service = getRealtimeService()

    try {
      const subscription = service.subscribeToSignalAlerts(
        userId,
        addAlert,
        (newStatus) => {
          setStatus(newStatus)
          if (newStatus === 'error') {
            setError(new Error('Failed to connect to signal alerts'))
          }
        }
      )

      return () => {
        subscription.unsubscribe()
        setStatus('disconnected')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setStatus('error')
    }
  }, [userId, addAlert])

  return {
    alerts,
    unreadCount,
    markAsRead,
    status,
    error,
    isConnected: status === 'connected'
  }
}

/**
 * Hook for subscribing to agent executions
 */
export function useAgentExecutions(streamId: string | null) {
  const [executions, setExecutions] = useState<Map<string, AgentExecution>>(new Map())
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)

  const updateExecution = useCallback((execution: AgentExecution) => {
    setExecutions((prev) => {
      const next = new Map(prev)
      next.set(execution.id, execution)
      return next
    })
  }, [])

  useEffect(() => {
    if (!streamId) return

    const service = getRealtimeService()

    try {
      const subscription = service.subscribeToAgentExecutions(
        streamId,
        updateExecution,
        (newStatus) => {
          setStatus(newStatus)
          if (newStatus === 'error') {
            setError(new Error('Failed to connect to agent updates'))
          }
        }
      )

      return () => {
        subscription.unsubscribe()
        setStatus('disconnected')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setStatus('error')
    }
  }, [streamId, updateExecution])

  const runningAgents = Array.from(executions.values()).filter(
    (e) => e.status === 'running'
  )

  return {
    executions: Array.from(executions.values()),
    runningAgents,
    status,
    error,
    isConnected: status === 'connected'
  }
}

/**
 * Hook for subscribing to notifications
 */
export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationUpdate[]>([])
  const [status, setStatus] = useState<SubscriptionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const addNotification = useCallback((notification: NotificationUpdate) => {
    setNotifications((prev) => [notification, ...prev])
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1)
    }
  }, [])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  useEffect(() => {
    if (!userId) return

    const service = getRealtimeService()

    try {
      const subscription = service.subscribeToNotifications(
        userId,
        addNotification,
        (newStatus) => {
          setStatus(newStatus)
          if (newStatus === 'error') {
            setError(new Error('Failed to connect to notifications'))
          }
        }
      )

      return () => {
        subscription.unsubscribe()
        setStatus('disconnected')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setStatus('error')
    }
  }, [userId, addNotification])

  return {
    notifications,
    unreadCount,
    markAsRead,
    status,
    error,
    isConnected: status === 'connected'
  }
}

/**
 * Hook for connection heartbeat monitoring
 */
export function useConnectionHeartbeat(interval: number = 30000) {
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>(new Date())
  const [isHealthy, setIsHealthy] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = new Date()
      const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime()

      if (timeSinceLastHeartbeat > interval * 2) {
        setIsHealthy(false)
      } else {
        setIsHealthy(true)
        setLastHeartbeat(now)
      }
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [interval, lastHeartbeat])

  return { isHealthy, lastHeartbeat }
}
