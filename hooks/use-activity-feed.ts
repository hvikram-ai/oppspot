/**
 * Activity Feed Hook
 * Subscribe to team activities in real-time
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface TeamActivity {
  id: string
  org_id: string
  user_id: string
  activity_type: string
  entity_type: string
  entity_id: string
  entity_name: string
  metadata: Record<string, unknown>
  created_at: string
  // Joined data
  user_name?: string
  user_avatar?: string
}

export interface ActivityFeedState {
  activities: TeamActivity[]
  loading: boolean
  hasMore: boolean
}

export interface UseActivityFeedOptions {
  limit?: number
  entityType?: string
  entityId?: string
}

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { limit = 50, entityType, entityId } = options

  const [state, setState] = useState<ActivityFeedState>({
    activities: [],
    loading: true,
    hasMore: false
  })

  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch initial activities
  const fetchActivities = useCallback(async () => {
    if (!orgId) return

    try {
      setState(prev => ({ ...prev, loading: true }))

      type ActivityWithProfile = {
        id: string
        org_id: string | null
        user_id: string | null
        activity_type: string
        entity_type: string | null
        entity_id: string | null
        entity_name: string | null
        metadata: any
        created_at: string
        profiles: {
          full_name: string | null
          avatar_url: string | null
        } | null
      }

      let query = supabase
        .from('team_activities')
        .select('*, profiles!user_id(full_name, avatar_url)')
        .eq('org_id', orgId)

      // Filter by entity if specified
      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<ActivityWithProfile[]>()

      if (error) throw error

      // Transform data to include user info
      const activities = (data || []).map(activity => ({
        ...activity,
        user_name: activity.profiles?.full_name,
        user_avatar: activity.profiles?.avatar_url
      }))

      setState({
        activities: activities as any,
        loading: false,
        hasMore: activities.length === limit
      })
    } catch (error) {
      console.error('[useActivityFeed] Error fetching activities:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [orgId, entityType, entityId, limit, supabase])

  // Get user's org ID
  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single<{ org_id: string | null }>()

      if (profile?.org_id) {
        setOrgId(profile.org_id)
      }
    }

    fetchOrgId()
  }, [supabase])

  // Fetch activities when orgId is available
  useEffect(() => {
    if (orgId) {
      fetchActivities()
    }
  }, [orgId, fetchActivities])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!orgId) return

    const channelName = `team-activity:${orgId}`
    const activityChannel = supabase.channel(channelName)

    activityChannel
      .on('broadcast', { event: 'team-activity' }, (payload) => {
        const newActivity = payload.payload as TeamActivity

        // Only add if matches filter (if specified)
        if (entityType && entityId) {
          if (newActivity.entity_type !== entityType || newActivity.entity_id !== entityId) {
            return
          }
        }

        setState(prev => ({
          ...prev,
          activities: [newActivity, ...prev.activities].slice(0, limit)
        }))
      })
      .subscribe((status) => {
        console.log('[useActivityFeed] Subscription status:', status)
      })

    setChannel(activityChannel)

    return () => {
      activityChannel.unsubscribe()
    }
  }, [orgId, entityType, entityId, limit, supabase])

  // Subscribe to database changes (fallback)
  useEffect(() => {
    if (!orgId) return

    const query = supabase
      .channel(`activity-db:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_activities',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          const newActivity = payload.new as TeamActivity

          // Only add if matches filter (if specified)
          if (entityType && entityId) {
            if (newActivity.entity_type !== entityType || newActivity.entity_id !== entityId) {
              return
            }
          }

          // Fetch user info for the activity
          supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newActivity.user_id)
            .single<{ full_name: string | null; avatar_url: string | null }>()
            .then(({ data: profile }) => {
              setState(prev => ({
                ...prev,
                activities: [{
                  ...newActivity,
                  user_name: profile?.full_name,
                  user_avatar: profile?.avatar_url
                }, ...prev.activities].slice(0, limit) as any
              }))
            })
        }
      )
      .subscribe()

    return () => {
      query.unsubscribe()
    }
  }, [orgId, entityType, entityId, limit, supabase])

  const loadMore = useCallback(async () => {
    if (!orgId || !state.hasMore || state.loading) return

    try {
      const lastActivity = state.activities[state.activities.length - 1]
      if (!lastActivity) return

      type ActivityWithProfile = {
        id: string
        org_id: string | null
        user_id: string | null
        activity_type: string
        entity_type: string | null
        entity_id: string | null
        entity_name: string | null
        metadata: any
        created_at: string
        profiles: {
          full_name: string | null
          avatar_url: string | null
        } | null
      }

      let query = supabase
        .from('team_activities')
        .select('*, profiles!user_id(full_name, avatar_url)')
        .eq('org_id', orgId)

      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .lt('created_at', lastActivity.created_at)
        .limit(limit)
        .returns<ActivityWithProfile[]>()

      if (error) throw error

      const activities = (data || []).map(activity => ({
        ...activity,
        user_name: activity.profiles?.full_name,
        user_avatar: activity.profiles?.avatar_url
      }))

      setState(prev => ({
        ...prev,
        activities: [...prev.activities, ...activities] as any,
        hasMore: activities.length === limit
      }))
    } catch (error) {
      console.error('[useActivityFeed] Error loading more:', error)
    }
  }, [orgId, entityType, entityId, limit, state.activities, state.hasMore, state.loading, supabase])

  return {
    ...state,
    refresh: fetchActivities,
    loadMore
  }
}
