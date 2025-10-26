/**
 * Team Activity API
 * Create and broadcast team activities
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ActivityBroadcaster } from '@/lib/collaboration/activity-broadcaster'
import type { Json } from '@/types/database'

export async function POST(request: NextRequest) {
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
      .select('org_id, full_name')
      .eq('id', user.id)
      .single<{ org_id: string | null; full_name: string | null }>()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'User not in an organization' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { activity_type, entity_type, entity_id, entity_name, metadata } = body

    if (!activity_type || !entity_type || !entity_id || !entity_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create broadcaster
    const broadcaster = new ActivityBroadcaster(
      profile.org_id,
      user.id,
      profile.full_name || user.email || 'Unknown User'
    )

    // Broadcast activity
    await broadcaster.broadcast({
      activity_type,
      entity_type,
      entity_id,
      entity_name,
      metadata: metadata || {}
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/collaboration/activity] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    const activityType = searchParams.get('activity_type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query - type assertion for joined data
    type ActivityWithProfile = {
      id: string
      org_id: string | null
      user_id: string | null
      activity_type: string
      entity_type: string | null
      entity_id: string | null
      entity_name: string | null
      metadata: Json
      created_at: string
      profiles: {
        full_name: string | null
        avatar_url: string | null
      } | null
    }

    let query = supabase
      .from('team_activities')
      .select('*, profiles!user_id(full_name, avatar_url)', { count: 'exact' })
      .eq('org_id', profile.org_id)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      .returns<ActivityWithProfile[]>()

    if (error) throw error

    // Transform data
    const activities = (data || []).map(activity => ({
      ...activity,
      user_name: activity.profiles?.full_name,
      user_avatar: activity.profiles?.avatar_url
    }))

    return NextResponse.json({
      activities,
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('[GET /api/collaboration/activity] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
