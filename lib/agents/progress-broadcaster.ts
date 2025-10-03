/**
 * Progress Broadcaster
 * Broadcast real-time progress updates via Supabase Realtime
 */

import { createClient } from '@/lib/supabase/client'

export interface ProgressUpdate {
  stream_id: string
  completed: number
  total: number
  percentage: number
  quality_score?: number
  items_by_stage?: Record<string, number>
  last_updated?: string
}

export interface AgentActivity {
  stream_id: string
  agent_id: string
  agent_name: string
  agent_type: string
  activity_type: 'started' | 'progress' | 'completed' | 'failed'
  message: string
  data?: Record<string, any>
}

export class ProgressBroadcaster {
  private streamId: string
  private supabase: ReturnType<typeof createClient>
  private channelName: string

  constructor(streamId: string) {
    this.streamId = streamId
    this.supabase = createClient()
    this.channelName = `stream-progress:${streamId}`
  }

  /**
   * Broadcast progress update
   */
  async broadcastProgress(update: Omit<ProgressUpdate, 'stream_id' | 'last_updated'>): Promise<void> {
    try {
      const channel = this.supabase.channel(this.channelName)

      await channel.send({
        type: 'broadcast',
        event: 'progress-update',
        payload: {
          stream_id: this.streamId,
          ...update,
          last_updated: new Date().toISOString()
        }
      })

      // Unsubscribe after sending
      await channel.unsubscribe()
    } catch (error) {
      console.error('[ProgressBroadcaster] Error broadcasting progress:', error)
    }
  }

  /**
   * Broadcast agent activity
   */
  async broadcastActivity(activity: Omit<AgentActivity, 'stream_id'>): Promise<void> {
    try {
      const channel = this.supabase.channel(this.channelName)

      await channel.send({
        type: 'broadcast',
        event: 'agent-activity',
        payload: {
          id: crypto.randomUUID(),
          stream_id: this.streamId,
          timestamp: new Date().toISOString(),
          ...activity
        }
      })

      // Unsubscribe after sending
      await channel.unsubscribe()
    } catch (error) {
      console.error('[ProgressBroadcaster] Error broadcasting activity:', error)
    }
  }

  /**
   * Broadcast milestone achievement
   */
  async broadcastMilestone(milestone: {
    type: string
    title: string
    description: string
    data?: Record<string, any>
  }): Promise<void> {
    try {
      const channel = this.supabase.channel(this.channelName)

      await channel.send({
        type: 'broadcast',
        event: 'milestone',
        payload: {
          stream_id: this.streamId,
          timestamp: new Date().toISOString(),
          ...milestone
        }
      })

      // Unsubscribe after sending
      await channel.unsubscribe()
    } catch (error) {
      console.error('[ProgressBroadcaster] Error broadcasting milestone:', error)
    }
  }

  /**
   * Broadcast agent started
   */
  async broadcastAgentStarted(agentId: string, agentName: string, agentType: string): Promise<void> {
    await this.broadcastActivity({
      agent_id: agentId,
      agent_name: agentName,
      agent_type: agentType,
      activity_type: 'started',
      message: `${agentName} started working on this goal`
    })
  }

  /**
   * Broadcast agent progress
   */
  async broadcastAgentProgress(
    agentId: string,
    agentName: string,
    agentType: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.broadcastActivity({
      agent_id: agentId,
      agent_name: agentName,
      agent_type: agentType,
      activity_type: 'progress',
      message,
      data
    })
  }

  /**
   * Broadcast agent completed
   */
  async broadcastAgentCompleted(
    agentId: string,
    agentName: string,
    agentType: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.broadcastActivity({
      agent_id: agentId,
      agent_name: agentName,
      agent_type: agentType,
      activity_type: 'completed',
      message,
      data
    })
  }

  /**
   * Broadcast agent failed
   */
  async broadcastAgentFailed(
    agentId: string,
    agentName: string,
    agentType: string,
    error: string
  ): Promise<void> {
    await this.broadcastActivity({
      agent_id: agentId,
      agent_name: agentName,
      agent_type: agentType,
      activity_type: 'failed',
      message: `${agentName} encountered an error: ${error}`
    })
  }
}

/**
 * Create a progress broadcaster for a stream
 */
export function createProgressBroadcaster(streamId: string): ProgressBroadcaster {
  return new ProgressBroadcaster(streamId)
}
