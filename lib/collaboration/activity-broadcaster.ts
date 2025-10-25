/**
 * Activity Broadcaster
 * Broadcast team activities via Supabase Realtime
 * Extends the ProgressBroadcaster pattern for team collaboration
 */

import { createClient } from '@/lib/supabase/client'

export type ActivityType =
  | 'company_viewed'
  | 'company_saved'
  | 'company_shared'
  | 'research_generated'
  | 'signal_detected'
  | 'agent_created'
  | 'agent_run'
  | 'stream_created'
  | 'list_created'
  | 'deal_updated'
  | 'comment_added'
  | 'mention_added'
  | 'file_uploaded'
  | 'export_created'

export interface TeamActivity {
  activity_type: ActivityType
  entity_type: string
  entity_id: string
  entity_name: string
  metadata?: Record<string, unknown>
}

export interface BroadcastActivity extends TeamActivity {
  id: string
  user_id: string
  user_name: string
  org_id: string
  timestamp: string
}

export class ActivityBroadcaster {
  private orgId: string
  private userId: string
  private userName: string
  private supabase: ReturnType<typeof createClient>

  constructor(orgId: string, userId: string, userName: string) {
    this.orgId = orgId
    this.userId = userId
    this.userName = userName
    this.supabase = createClient()
  }

  /**
   * Broadcast activity to team
   */
  async broadcast(activity: TeamActivity): Promise<void> {
    try {
      const channelName = `team-activity:${this.orgId}`
      const channel = this.supabase.channel(channelName)

      const broadcastPayload: BroadcastActivity = {
        id: crypto.randomUUID(),
        user_id: this.userId,
        user_name: this.userName,
        org_id: this.orgId,
        timestamp: new Date().toISOString(),
        ...activity
      }

      // Broadcast to channel
      await channel.send({
        type: 'broadcast',
        event: 'team-activity',
        payload: broadcastPayload
      })

      // Store in database
      await this.supabase
        .from('team_activities')
        .insert({
          org_id: this.orgId,
          user_id: this.userId,
          activity_type: activity.activity_type,
          entity_type: activity.entity_type,
          entity_id: activity.entity_id,
          entity_name: activity.entity_name,
          metadata: activity.metadata || {}
        } as unknown)

      // Unsubscribe after sending
      await channel.unsubscribe()

      console.log('[ActivityBroadcaster] Broadcast activity:', activity.activity_type)
    } catch (error) {
      console.error('[ActivityBroadcaster] Error broadcasting activity:', error)
    }
  }

  /**
   * Broadcast company viewed
   */
  async companyViewed(companyId: string, companyName: string): Promise<void> {
    await this.broadcast({
      activity_type: 'company_viewed',
      entity_type: 'company',
      entity_id: companyId,
      entity_name: companyName
    })
  }

  /**
   * Broadcast company saved
   */
  async companySaved(companyId: string, companyName: string): Promise<void> {
    await this.broadcast({
      activity_type: 'company_saved',
      entity_type: 'company',
      entity_id: companyId,
      entity_name: companyName
    })
  }

  /**
   * Broadcast research generated
   */
  async researchGenerated(
    companyId: string,
    companyName: string,
    reportId: string
  ): Promise<void> {
    await this.broadcast({
      activity_type: 'research_generated',
      entity_type: 'company',
      entity_id: companyId,
      entity_name: companyName,
      metadata: { report_id: reportId }
    })
  }

  /**
   * Broadcast buying signal detected
   */
  async signalDetected(
    companyId: string,
    companyName: string,
    signalType: string,
    signalDescription: string
  ): Promise<void> {
    await this.broadcast({
      activity_type: 'signal_detected',
      entity_type: 'company',
      entity_id: companyId,
      entity_name: companyName,
      metadata: {
        signal_type: signalType,
        description: signalDescription
      }
    })
  }

  /**
   * Broadcast agent created
   */
  async agentCreated(agentId: string, agentName: string, agentType: string): Promise<void> {
    await this.broadcast({
      activity_type: 'agent_created',
      entity_type: 'agent',
      entity_id: agentId,
      entity_name: agentName,
      metadata: { agent_type: agentType }
    })
  }

  /**
   * Broadcast agent executed
   */
  async agentRun(
    agentId: string,
    agentName: string,
    itemsCreated: number
  ): Promise<void> {
    await this.broadcast({
      activity_type: 'agent_run',
      entity_type: 'agent',
      entity_id: agentId,
      entity_name: agentName,
      metadata: { items_created: itemsCreated }
    })
  }

  /**
   * Broadcast stream created
   */
  async streamCreated(streamId: string, streamName: string): Promise<void> {
    await this.broadcast({
      activity_type: 'stream_created',
      entity_type: 'stream',
      entity_id: streamId,
      entity_name: streamName
    })
  }

  /**
   * Broadcast list created
   */
  async listCreated(listId: string, listName: string): Promise<void> {
    await this.broadcast({
      activity_type: 'list_created',
      entity_type: 'list',
      entity_id: listId,
      entity_name: listName
    })
  }

  /**
   * Broadcast comment added
   */
  async commentAdded(
    entityType: string,
    entityId: string,
    entityName: string,
    commentId: string,
    mentions: string[] = []
  ): Promise<void> {
    await this.broadcast({
      activity_type: 'comment_added',
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      metadata: {
        comment_id: commentId,
        mentions
      }
    })
  }

  /**
   * Broadcast file uploaded
   */
  async fileUploaded(
    entityType: string,
    entityId: string,
    entityName: string,
    fileName: string
  ): Promise<void> {
    await this.broadcast({
      activity_type: 'file_uploaded',
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      metadata: { file_name: fileName }
    })
  }

  /**
   * Broadcast export created
   */
  async exportCreated(
    entityType: string,
    entityId: string,
    entityName: string,
    exportType: string
  ): Promise<void> {
    await this.broadcast({
      activity_type: 'export_created',
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      metadata: { export_type: exportType }
    })
  }
}

/**
 * Create an activity broadcaster
 */
export async function createActivityBroadcaster(): Promise<ActivityBroadcaster | null> {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get user profile with org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, full_name')
      .eq('id', user.id)
      .single<{ org_id: string | null; full_name: string | null }>()

    if (!profile?.org_id) return null

    return new ActivityBroadcaster(
      profile.org_id,
      user.id,
      profile.full_name || user.email || 'Unknown User'
    )
  } catch (error) {
    console.error('[createActivityBroadcaster] Error:', error)
    return null
  }
}
