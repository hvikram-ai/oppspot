/**
 * Real-Time Presence Hook
 * Manages user presence on company/entity pages
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceUser {
  user_id: string
  user_name: string
  avatar_url?: string
  online_at: string
  current_page?: string
}

export interface PresenceState {
  viewers: PresenceUser[]
  isConnected: boolean
  viewerCount: number
}

export interface UsePresenceOptions {
  entityType: 'company' | 'stream' | 'data_room' | 'list'
  entityId: string
  userId?: string
  userName?: string
  avatarUrl?: string
  enabled?: boolean
}

export function usePresence({
  entityType,
  entityId,
  userId,
  userName,
  avatarUrl,
  enabled = true
}: UsePresenceOptions) {
  const [state, setState] = useState<PresenceState>({
    viewers: [],
    isConnected: false,
    viewerCount: 0
  })

  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  // Get current user if not provided
  const [currentUser, setCurrentUser] = useState<{
    id: string
    name: string
    avatar?: string
  } | null>(null)

  useEffect(() => {
    if (userId && userName) {
      setCurrentUser({ id: userId, name: userName, avatar: avatarUrl })
      return
    }

    // Fetch current user
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single<{ full_name: string | null; avatar_url: string | null }>()

      if (profile) {
        setCurrentUser({
          id: user.id,
          name: profile.full_name || user.email || 'Unknown User',
          avatar: profile.avatar_url || undefined
        })
      }
    }

    fetchUser()
  }, [userId, userName, avatarUrl, supabase])

  // Update presence in database
  const updatePresenceInDB = useCallback(async () => {
    if (!currentUser) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single<{ org_id: string | null }>()

      if (!profile?.org_id) return

      await supabase.rpc('upsert_user_presence', {
        p_user_id: currentUser.id,
        p_org_id: profile.org_id,
        p_status: 'online',
        p_current_page: window.location.pathname,
        p_current_entity_type: entityType,
        p_current_entity_id: entityId
      } as any)
    } catch (error) {
      console.error('[usePresence] Error updating presence:', error)
    }
  }, [currentUser, entityType, entityId, supabase])

  // Setup presence channel
  useEffect(() => {
    if (!enabled || !currentUser || !entityId) return

    const channelName = `presence:${entityType}:${entityId}`
    console.log('[usePresence] Joining channel:', channelName)

    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser.id
        },
        broadcast: { self: true }
      }
    })

    // Track presence updates
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState<PresenceUser>()

        // Convert presence state to array
        const viewers: PresenceUser[] = []
        Object.entries(presenceState).forEach(([_, userArray]) => {
          if (userArray && userArray.length > 0) {
            viewers.push(userArray[0])
          }
        })

        console.log('[usePresence] Presence synced:', viewers.length, 'viewers')

        setState(prev => ({
          ...prev,
          viewers,
          viewerCount: viewers.length
        }))
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[usePresence] User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[usePresence] User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        console.log('[usePresence] Subscription status:', status)

        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED'
        }))

        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await presenceChannel.track({
            user_id: currentUser.id,
            user_name: currentUser.name,
            avatar_url: currentUser.avatar,
            online_at: new Date().toISOString(),
            current_page: window.location.pathname
          })

          // Update presence in database
          await updatePresenceInDB()
        }
      })

    setChannel(presenceChannel)

    // Setup heartbeat (every 30 seconds)
    heartbeatInterval.current = setInterval(() => {
      updatePresenceInDB()
    }, 30000)

    // Cleanup
    return () => {
      console.log('[usePresence] Cleaning up presence')

      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }

      presenceChannel.untrack().then(() => {
        presenceChannel.unsubscribe()
      })
    }
  }, [enabled, currentUser, entityType, entityId, supabase, updatePresenceInDB])

  // Update cursor position (optional - for future Figma-like features)
  const updateCursor = useCallback(async (x: number, y: number) => {
    if (!channel || !currentUser) return

    try {
      await channel.track({
        user_id: currentUser.id,
        user_name: currentUser.name,
        avatar_url: currentUser.avatar,
        cursor: { x, y },
        online_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('[usePresence] Error updating cursor:', error)
    }
  }, [channel, currentUser])

  // Manually refresh presence
  const refresh = useCallback(async () => {
    await updatePresenceInDB()
  }, [updatePresenceInDB])

  return {
    ...state,
    updateCursor,
    refresh,
    currentUser
  }
}
