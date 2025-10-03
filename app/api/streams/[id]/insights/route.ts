import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/streams/[id]/insights
 * Get all insights for a stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = request.nextUrl
    const filter = searchParams.get('filter') // 'all', 'unread', 'actionable'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('stream_insights')
      .select(`
        *,
        agent:ai_agents!stream_insights_generated_by_fkey (
          id,
          name,
          agent_type
        )
      `)
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (filter === 'unread') {
      query = query.eq('is_read', false)
    } else if (filter === 'actionable') {
      query = query.eq('is_actionable', true).eq('action_taken', false)
    }

    const { data: insights, error } = await query

    if (error) {
      console.error('Error fetching insights:', error)
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      )
    }

    // Calculate counts
    const { count: totalCount } = await supabase
      .from('stream_insights')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', streamId)

    const { count: unreadCount } = await supabase
      .from('stream_insights')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', streamId)
      .eq('is_read', false)

    const { count: actionableCount } = await supabase
      .from('stream_insights')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', streamId)
      .eq('is_actionable', true)
      .eq('action_taken', false)

    return NextResponse.json({
      insights: insights || [],
      total: totalCount || 0,
      unread: unreadCount || 0,
      actionable: actionableCount || 0
    })

  } catch (error) {
    console.error('Unexpected error fetching insights:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/streams/[id]/insights/[insightId]
 * Update an insight (mark as read, take action, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { insight_id, is_read, action_taken } = body

    if (!insight_id) {
      return NextResponse.json(
        { error: 'insight_id is required' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: any = {}
    if (is_read !== undefined) {
      updates.is_read = is_read
    }
    if (action_taken !== undefined) {
      updates.action_taken = action_taken
      if (action_taken) {
        updates.action_taken_at = new Date().toISOString()
      }
    }

    // Update insight
    const { data: insight, error } = await supabase
      .from('stream_insights')
      .update(updates)
      .eq('id', insight_id)
      .eq('stream_id', streamId)
      .select()
      .single()

    if (error) {
      console.error('Error updating insight:', error)
      return NextResponse.json(
        { error: 'Failed to update insight' },
        { status: 500 }
      )
    }

    return NextResponse.json(insight)

  } catch (error) {
    console.error('Unexpected error updating insight:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
