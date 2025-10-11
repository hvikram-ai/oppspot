/**
 * TeamPlay Activity Tracker
 * Track team activities for real-time collaboration
 */

import { createClient } from '@/lib/supabase/client'
import type { Row } from '@/lib/supabase/helpers'

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

export interface TrackActivityParams {
  activityType: ActivityType
  entityType: string
  entityId: string
  entityName: string
  metadata?: Record<string, any>
}

export class ActivityTracker {
  /**
   * Track a team activity
   */
  static async track(params: TrackActivityParams) {
    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's org
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single() as { data: Row<'profiles'> | null; error: any }

      if (!profile?.org_id) return

      // Create activity
      // @ts-expect-error - Supabase type inference issue
      await supabase.from('team_activities').insert({
        org_id: profile.org_id,
        user_id: user.id,
        activity_type: params.activityType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_name: params.entityName,
        metadata: params.metadata || {}
      })

      console.log('[ActivityTracker] Tracked:', params.activityType, params.entityName)
    } catch (error) {
      console.error('[ActivityTracker] Error:', error)
      // Fail silently - don't break user experience
    }
  }

  /**
   * Get recent activities for organization
   */
  static async getRecentActivities(limit: number = 50) {
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single() as { data: Row<'profiles'> | null; error: any }

      if (!profile?.org_id) return []

      const { data: activities } = await supabase
        .from('team_activities')
        .select(`
          *,
          user:profiles!team_activities_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          ) as { data: Row<'team_activities'>[] | null; error: any }
        `)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(limit)

      return activities || []
    } catch (error) {
      console.error('[ActivityTracker] Error fetching activities:', error)
      return []
    }
  }

  /**
   * Get activities for a specific entity
   */
  static async getEntityActivities(entityType: string, entityId: string) {
    try {
      const supabase = createClient()

      const { data: activities } = await supabase
        .from('team_activities')
        .select(`
          *,
          user:profiles!team_activities_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          ) as { data: Row<'team_activities'>[] | null; error: any }
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(20)

      return activities || []
    } catch (error) {
      console.error('[ActivityTracker] Error fetching entity activities:', error)
      return []
    }
  }

  /**
   * Convenience methods for common activities
   */
  static trackCompanyView(companyId: string, companyName: string) {
    return this.track({
      activityType: 'company_viewed',
      entityType: 'company',
      entityId: companyId,
      entityName: companyName
    })
  }

  static trackCompanySave(companyId: string, companyName: string) {
    return this.track({
      activityType: 'company_saved',
      entityType: 'company',
      entityId: companyId,
      entityName: companyName
    })
  }

  static trackResearchGenerated(companyId: string, companyName: string, duration?: number) {
    return this.track({
      activityType: 'research_generated',
      entityType: 'company',
      entityId: companyId,
      entityName: companyName,
      metadata: { duration_seconds: duration }
    })
  }

  static trackAgentCreated(agentId: string, agentName: string, agentType: string) {
    return this.track({
      activityType: 'agent_created',
      entityType: 'agent',
      entityId: agentId,
      entityName: agentName,
      metadata: { agent_type: agentType }
    })
  }

  static trackAgentRun(agentId: string, agentName: string, opportunitiesFound?: number) {
    return this.track({
      activityType: 'agent_run',
      entityType: 'agent',
      entityId: agentId,
      entityName: agentName,
      metadata: { opportunities_found: opportunitiesFound }
    })
  }

  static trackStreamCreated(streamId: string, streamName: string) {
    return this.track({
      activityType: 'stream_created',
      entityType: 'stream',
      entityId: streamId,
      entityName: streamName
    })
  }
}

/**
 * Presence Tracker
 * Track who's online and what they're viewing
 */
export class PresenceTracker {
  private static heartbeatInterval: NodeJS.Timeout | null = null

  /**
   * Start presence tracking (call on app load)
   */
  static async start() {
    // Initial presence update
    await this.updatePresence('online')

    // Heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updatePresence('online')
    }, 30000)

    // Mark offline on page close
    window.addEventListener('beforeunload', () => {
      this.updatePresence('offline')
    })

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updatePresence('away')
      } else {
        this.updatePresence('online')
      }
    })
  }

  /**
   * Stop presence tracking
   */
  static stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.updatePresence('offline')
  }

  /**
   * Update user presence
   */
  static async updatePresence(
    status: 'online' | 'away' | 'busy' | 'offline',
    currentPage?: string,
    currentEntityType?: string,
    currentEntityId?: string
  ) {
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single() as { data: Row<'profiles'> | null; error: any }

      if (!profile?.org_id) return

      // Use upsert function
      // @ts-expect-error - Type inference issue
      await supabase.rpc('upsert_user_presence', {
        p_user_id: user.id,
        p_org_id: profile.org_id,
        p_status: status,
        p_current_page: currentPage,
        p_current_entity_type: currentEntityType,
        p_current_entity_id: currentEntityId
      })
    } catch (error) {
      // Fail silently
      console.error('[PresenceTracker] Error:', error)
    }
  }

  /**
   * Get online users in organization
   */
  static async getOnlineUsers() {
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single() as { data: Row<'profiles'> | null; error: any }

      if (!profile?.org_id) return []

      // Get users online in last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

      const { data: presence } = await supabase
        .from('user_presence')
        .select(`
          *,
          user:profiles!user_presence_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          ) as { data: Row<'user_presence'>[] | null; error: any }
        `)
        .eq('org_id', profile.org_id)
        .in('status', ['online', 'busy'])
        .gte('last_seen_at', twoMinutesAgo)

      return presence || []
    } catch (error) {
      console.error('[PresenceTracker] Error fetching online users:', error)
      return []
    }
  }
}
