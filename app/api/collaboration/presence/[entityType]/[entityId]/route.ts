/**
 * Presence API
 * Get current viewers of an entity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single<{ org_id: string | null }>()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'User not in an organization' }, { status: 400 })
    }

    const { entityType, entityId } = await params

    // Get current viewers from user_presence table
    // Only show presence from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    type PresenceWithProfile = {
      user_id: string
      profiles: {
        full_name: string | null
        avatar_url: string | null
      } | null
    }

    const { data, error } = await supabase
      .from('user_presence')
      .select('user_id, profiles!user_id(full_name, avatar_url)')
      .eq('org_id', profile.org_id)
      .eq('current_entity_type', entityType)
      .eq('current_entity_id', entityId)
      .eq('status', 'online')
      .gte('last_seen_at', fiveMinutesAgo)
      .returns<PresenceWithProfile[]>()

    if (error) throw error

    // Transform data
    const viewers = (data || []).map(presence => ({
      user_id: presence.user_id,
      user_name: presence.profiles?.full_name || 'Unknown User',
      avatar_url: presence.profiles?.avatar_url
    }))

    return NextResponse.json({
      viewers,
      count: viewers.length
    })
  } catch (error) {
    console.error('[GET /api/collaboration/presence] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
