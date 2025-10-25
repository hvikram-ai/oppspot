/**
 * Team Notifications Service
 * Broadcast important events to entire sales team
 */

import { createClient } from '@/lib/supabase/client'

export interface TeamNotification {
  type: 'research_complete' | 'signal_detected' | 'hot_lead' | 'deal_stage_change' | 'agent_complete'
  title: string
  description: string
  companyId?: string
  companyName?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  action_url?: string
  metadata?: Record<string, unknown>
}

export class TeamNotificationService {
  private orgId: string
  private supabase: ReturnType<typeof createClient>

  constructor(orgId: string) {
    this.orgId = orgId
    this.supabase = createClient()
  }

  /**
   * Broadcast notification to team
   */
  async broadcast(notification: TeamNotification): Promise<void> {
    try {
      const channelName = `team-notifications:${this.orgId}`
      const channel = this.supabase.channel(channelName)

      await channel.send({
        type: 'broadcast',
        event: 'team-notification',
        payload: {
          id: crypto.randomUUID(),
          org_id: this.orgId,
          timestamp: new Date().toISOString(),
          ...notification
        }
      })

      // Also create database notification for each team member
      await this.createNotificationsForTeam(notification)

      // Unsubscribe after sending
      await channel.unsubscribe()

      console.log('[TeamNotificationService] Broadcast notification:', notification.type)
    } catch (error) {
      console.error('[TeamNotificationService] Error broadcasting:', error)
    }
  }

  /**
   * Notify team that research completed
   */
  async notifyResearchComplete(
    companyId: string,
    companyName: string,
    reportId: string
  ): Promise<void> {
    await this.broadcast({
      type: 'research_complete',
      title: `New research available for ${companyName}`,
      description: `ResearchGPT has completed analysis`,
      companyId,
      companyName,
      priority: 'medium',
      action_url: `/business/${companyId}?tab=research&report=${reportId}`,
      metadata: { report_id: reportId }
    })
  }

  /**
   * Notify team that buying signal detected
   */
  async notifyBuyingSignal(
    companyId: string,
    companyName: string,
    signalType: string,
    signalDescription: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'high'
  ): Promise<void> {
    await this.broadcast({
      type: 'signal_detected',
      title: `🔥 Buying signal detected: ${companyName}`,
      description: signalDescription,
      companyId,
      companyName,
      priority,
      action_url: `/business/${companyId}`,
      metadata: { signal_type: signalType }
    })
  }

  /**
   * Notify team of hot lead (high score)
   */
  async notifyHotLead(
    companyId: string,
    companyName: string,
    score: number
  ): Promise<void> {
    await this.broadcast({
      type: 'hot_lead',
      title: `⭐ High-value lead discovered`,
      description: `${companyName} scored ${score}/100`,
      companyId,
      companyName,
      priority: 'urgent',
      action_url: `/business/${companyId}`,
      metadata: { score }
    })
  }

  /**
   * Notify team of agent completion
   */
  async notifyAgentComplete(
    agentName: string,
    itemsCreated: number,
    streamId?: string
  ): Promise<void> {
    await this.broadcast({
      type: 'agent_complete',
      title: `✅ ${agentName} completed`,
      description: `Found ${itemsCreated} new companies`,
      priority: 'low',
      action_url: streamId ? `/streams/${streamId}` : undefined,
      metadata: { items_created: itemsCreated }
    })
  }

  /**
   * Create database notifications for all team members
   */
  private async createNotificationsForTeam(notification: TeamNotification): Promise<void> {
    try {
      // Get all users in this org
      const { data: users } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('org_id', this.orgId)
        .returns<{ id: string }[]>()

      if (!users || users.length === 0) return

      // Create notification for each user
      const notifications = users.map(user => ({
        user_id: user.id,
        type: notification.type as unknown,
        title: notification.title,
        body: notification.description,
        priority: notification.priority as unknown,
        action_url: notification.action_url,
        data: notification.metadata || {}
      }))

      await this.supabase
        .from('notifications')
        .insert(notifications as unknown)

    } catch (error) {
      console.error('[TeamNotificationService] Error creating notifications:', error)
    }
  }
}

/**
 * Create team notification service for current user's org
 */
export async function createTeamNotificationService(): Promise<TeamNotificationService | null> {
  try {
    const supabase = createClient()

    // Get current user's org
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single<{ org_id: string | null }>()

    if (!profile?.org_id) return null

    return new TeamNotificationService(profile.org_id)
  } catch (error) {
    console.error('[createTeamNotificationService] Error:', error)
    return null
  }
}
