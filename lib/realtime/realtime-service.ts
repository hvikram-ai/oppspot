/**
 * Real-time WebSocket Service
 *
 * Provides live monitoring capabilities using Supabase Realtime (WebSocket-based)
 * Supports:
 * - Stream progress updates
 * - Acquisition scan monitoring
 * - Signal alerts
 * - Agent execution status
 * - Notification feed
 * - Dashboard metrics
 */

import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type SubscriptionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface RealtimeSubscription {
  channel: RealtimeChannel
  unsubscribe: () => void
}

export interface StreamProgressUpdate {
  id: string
  current_progress: {
    completed: number
    total: number
    percentage: number
    last_updated: string
  }
  goal_status?: string
  updated_at: string
}

export interface ScanProgressUpdate {
  id: string
  status: string
  current_step: string
  progress_percentage: number
  targets_identified?: number
  targets_analyzed?: number
  updated_at: string
}

export interface SignalAlert {
  id: string
  signal_id: string
  business_id: string
  business_name: string
  signal_type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
}

export interface AgentExecution {
  id: string
  agent_id: string
  stream_id?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  duration_ms?: number
}

export interface NotificationUpdate {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

/**
 * Real-time Service for managing WebSocket subscriptions
 */
export class RealtimeService {
  private supabase = createClient()
  private subscriptions = new Map<string, RealtimeChannel>()
  private statusCallbacks = new Map<string, (status: SubscriptionStatus) => void>()

  /**
   * Subscribe to stream progress updates
   */
  subscribeToStreamProgress(
    streamId: string,
    callback: (update: StreamProgressUpdate) => void,
    onStatus?: (status: SubscriptionStatus) => void
  ): RealtimeSubscription {
    const channelName = `stream:${streamId}:progress`

    if (onStatus) {
      this.statusCallbacks.set(channelName, onStatus)
      onStatus('connecting')
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${streamId}`
        },
        (payload: RealtimePostgresChangesPayload<StreamProgressUpdate>) => {
          if (payload.new) {
            callback(payload.new as StreamProgressUpdate)
          }
        }
      )
      .subscribe((status) => {
        const statusCallback = this.statusCallbacks.get(channelName)
        if (statusCallback) {
          statusCallback(status as unknown as SubscriptionStatus)
        }
      })

    this.subscriptions.set(channelName, channel)

    return {
      channel,
      unsubscribe: () => this.unsubscribe(channelName)
    }
  }

  /**
   * Subscribe to all streams for a user/organization
   */
  subscribeToAllStreams(
    orgId: string,
    callback: (update: StreamProgressUpdate) => void,
    onStatus?: (status: SubscriptionStatus) => void
  ): RealtimeSubscription {
    const channelName = `org:${orgId}:streams`

    if (onStatus) {
      this.statusCallbacks.set(channelName, onStatus)
      onStatus('connecting')
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `org_id=eq.${orgId}`
        },
        (payload: RealtimePostgresChangesPayload<StreamProgressUpdate>) => {
          if (payload.new) {
            callback(payload.new as StreamProgressUpdate)
          }
        }
      )
      .subscribe((status) => {
        const statusCallback = this.statusCallbacks.get(channelName)
        if (statusCallback) {
          statusCallback(status as unknown as SubscriptionStatus)
        }
      })

    this.subscriptions.set(channelName, channel)

    return {
      channel,
      unsubscribe: () => this.unsubscribe(channelName)
    }
  }

  /**
   * Subscribe to acquisition scan progress
   */
  subscribeToScanProgress(
    scanId: string,
    callback: (update: ScanProgressUpdate) => void,
    onStatus?: (status: SubscriptionStatus) => void
  ): RealtimeSubscription {
    const channelName = `scan:${scanId}:progress`

    if (onStatus) {
      this.statusCallbacks.set(channelName, onStatus)
      onStatus('connecting')
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'acquisition_scans',
          filter: `id=eq.${scanId}`
        },
        (payload: RealtimePostgresChangesPayload<ScanProgressUpdate>) => {
          if (payload.new) {
            callback(payload.new as ScanProgressUpdate)
          }
        }
      )
      .subscribe((status) => {
        const statusCallback = this.statusCallbacks.get(channelName)
        if (statusCallback) {
          statusCallback(status as unknown as SubscriptionStatus)
        }
      })

    this.subscriptions.set(channelName, channel)

    return {
      channel,
      unsubscribe: () => this.unsubscribe(channelName)
    }
  }

  /**
   * Subscribe to signal alerts for a user
   */
  subscribeToSignalAlerts(
    userId: string,
    callback: (alert: SignalAlert) => void,
    onStatus?: (status: SubscriptionStatus) => void
  ): RealtimeSubscription {
    const channelName = `user:${userId}:signals`

    if (onStatus) {
      this.statusCallbacks.set(channelName, onStatus)
      onStatus('connecting')
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_alerts',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<SignalAlert>) => {
          if (payload.new) {
            callback(payload.new as SignalAlert)
          }
        }
      )
      .subscribe((status) => {
        const statusCallback = this.statusCallbacks.get(channelName)
        if (statusCallback) {
          statusCallback(status as unknown as SubscriptionStatus)
        }
      })

    this.subscriptions.set(channelName, channel)

    return {
      channel,
      unsubscribe: () => this.unsubscribe(channelName)
    }
  }

  /**
   * Subscribe to agent execution updates
   */
  subscribeToAgentExecutions(
    streamId: string,
    callback: (execution: AgentExecution) => void,
    onStatus?: (status: SubscriptionStatus) => void
  ): RealtimeSubscription {
    const channelName = `stream:${streamId}:agents`

    if (onStatus) {
      this.statusCallbacks.set(channelName, onStatus)
      onStatus('connecting')
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_executions',
          filter: `stream_id=eq.${streamId}`
        },
        (payload: RealtimePostgresChangesPayload<AgentExecution>) => {
          if (payload.new) {
            callback(payload.new as AgentExecution)
          }
        }
      )
      .subscribe((status) => {
        const statusCallback = this.statusCallbacks.get(channelName)
        if (statusCallback) {
          statusCallback(status as unknown as SubscriptionStatus)
        }
      })

    this.subscriptions.set(channelName, channel)

    return {
      channel,
      unsubscribe: () => this.unsubscribe(channelName)
    }
  }

  /**
   * Subscribe to notifications
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: NotificationUpdate) => void,
    onStatus?: (status: SubscriptionStatus) => void
  ): RealtimeSubscription {
    const channelName = `user:${userId}:notifications`

    if (onStatus) {
      this.statusCallbacks.set(channelName, onStatus)
      onStatus('connecting')
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<NotificationUpdate>) => {
          if (payload.new) {
            callback(payload.new as NotificationUpdate)
          }
        }
      )
      .subscribe((status) => {
        const statusCallback = this.statusCallbacks.get(channelName)
        if (statusCallback) {
          statusCallback(status as unknown as SubscriptionStatus)
        }
      })

    this.subscriptions.set(channelName, channel)

    return {
      channel,
      unsubscribe: () => this.unsubscribe(channelName)
    }
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(channelName: string): void {
    const channel = this.subscriptions.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.subscriptions.delete(channelName)
      this.statusCallbacks.delete(channelName)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((_, channelName) => {
      this.unsubscribe(channelName)
    })
  }

  /**
   * Get connection status for a channel
   */
  getChannelStatus(channelName: string): string | undefined {
    const channel = this.subscriptions.get(channelName)
    return channel?.state
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys())
  }
}

// Singleton instance
let realtimeService: RealtimeService | null = null

export function getRealtimeService(): RealtimeService {
  if (!realtimeService) {
    realtimeService = new RealtimeService()
  }
  return realtimeService
}
