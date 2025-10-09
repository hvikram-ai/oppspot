import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * GET /api/dashboard/priority-queue
 *
 * Fetches priority queue items for the user
 * Query params:
 * - status: 'pending' | 'in_progress' | 'completed' | 'dismissed'
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query using the view with age_days
    let query = supabase
      .from('priority_queue_items_with_age')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Order by priority score (highest first), then created_at
    query = query
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: items, error: fetchError, count } = await query

    if (fetchError) {
      console.error('Error fetching priority queue:', fetchError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch priority queue' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      items: items || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in GET /api/dashboard/priority-queue:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
