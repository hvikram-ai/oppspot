/**
 * Real-time Stream Progress Hook
 * Subscribe to real-time progress updates from Supabase
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ProgressUpdate {
  stream_id: string
  completed: number
  total: number
  percentage: number
  last_updated: string
  quality_score?: number
  items_by_stage?: Record<string, number>
}

export interface AgentActivity {
  id: string
  stream_id: string
  agent_id: string
  agent_name: string
  agent_type: string
  activity_type: 'started' | 'progress' | 'completed' | 'failed'
  message: string
  data?: Record<string, any>
  timestamp: string
}

export interface StreamProgressState {
  progress: ProgressUpdate | null
  activities: AgentActivity[]
  isConnected: boolean
  activeAgents: Set<string>
}

export function useStreamProgress(streamId: string) {
  const [state, setState] = useState<StreamProgressState>({
    progress: null,
    activities: [],
    isConnected: false,
    activeAgents: new Set()
  })

  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Fetch initial progress
  const fetchInitialProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/progress`)
      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          progress: data.progress
        }))
      }
    } catch (error) {
      console.error('[useStreamProgress] Error fetching initial progress:', error)
    }
  }, [streamId])

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient()

    // Fetch initial progress
    fetchInitialProgress()

    // Create channel for this stream
    const progressChannel = supabase.channel(`stream-progress:${streamId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: streamId }
      }
    })

    // Subscribe to progress updates
    progressChannel
      .on('broadcast', { event: 'progress-update' }, (payload) => {
        const update = payload.payload as ProgressUpdate

        setState(prev => ({
          ...prev,
          progress: update
        }))
      })
      .on('broadcast', { event: 'agent-activity' }, (payload) => {
        const activity = payload.payload as AgentActivity

        setState(prev => {
          // Add activity to feed
          const newActivities = [activity, ...prev.activities].slice(0, 50) // Keep last 50

          // Update active agents
          const newActiveAgents = new Set(prev.activeAgents)
          if (activity.activity_type === 'started') {
            newActiveAgents.add(activity.agent_id)
          } else if (activity.activity_type === 'completed' || activity.activity_type === 'failed') {
            newActiveAgents.delete(activity.agent_id)
          }

          return {
            ...prev,
            activities: newActivities,
            activeAgents: newActiveAgents
          }
        })
      })
      .on('broadcast', { event: 'milestone' }, (payload) => {
        // Handle milestone achievements
        console.log('[useStreamProgress] Milestone achieved:', payload)
      })
      .subscribe((status) => {
        console.log('[useStreamProgress] Subscription status:', status)
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED'
        }))
      })

    setChannel(progressChannel)

    // Cleanup
    return () => {
      console.log('[useStreamProgress] Cleaning up subscription')
      progressChannel.unsubscribe()
    }
  }, [streamId, fetchInitialProgress])

  // Subscribe to database changes
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to stream updates
    const streamSubscription = supabase
      .channel(`stream-updates:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `id=eq.${streamId}`
        },
        (payload) => {
          const newStream = payload.new as any
          if (newStream.current_progress) {
            setState(prev => ({
              ...prev,
              progress: newStream.current_progress
            }))
          }
        }
      )
      .subscribe()

    // Subscribe to stream items (new companies added)
    const itemsSubscription = supabase
      .channel(`stream-items:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_items',
          filter: `stream_id=eq.${streamId}`
        },
        () => {
          // Refetch progress when new items are added
          fetchInitialProgress()
        }
      )
      .subscribe()

    return () => {
      streamSubscription.unsubscribe()
      itemsSubscription.unsubscribe()
    }
  }, [streamId, fetchInitialProgress])

  // Broadcast progress update
  const broadcastProgress = useCallback(async (update: Partial<ProgressUpdate>) => {
    if (!channel) return

    await channel.send({
      type: 'broadcast',
      event: 'progress-update',
      payload: {
        stream_id: streamId,
        ...update,
        last_updated: new Date().toISOString()
      }
    })
  }, [channel, streamId])

  // Broadcast agent activity
  const broadcastActivity = useCallback(async (activity: Omit<AgentActivity, 'id' | 'stream_id' | 'timestamp'>) => {
    if (!channel) return

    await channel.send({
      type: 'broadcast',
      event: 'agent-activity',
      payload: {
        id: crypto.randomUUID(),
        stream_id: streamId,
        timestamp: new Date().toISOString(),
        ...activity
      }
    })
  }, [channel, streamId])

  return {
    ...state,
    broadcastProgress,
    broadcastActivity,
    refresh: fetchInitialProgress
  }
}
