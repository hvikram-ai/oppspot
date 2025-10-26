/**
 * Approvals API Routes
 * GET - List approval requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/data-room/approvals
 * List approval requests for current user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dataRoomId = searchParams.get('data_room_id')
    const pending = searchParams.get('pending') === 'true'

    // Build query
    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        workflow_steps!inner (
          id,
          name,
          workflow_id,
          workflows!inner (
            id,
            name,
            data_room_id
          )
        )
      `)
      .or(`requested_from.eq.${user.id},requested_by.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (dataRoomId) {
      query = query.eq('workflow_steps.workflows.data_room_id', dataRoomId)
    }

    if (pending) {
      query = query.is('decision', null)
    }

    const { data: approvals, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data: approvals })
  } catch (error) {
    console.error('List approvals error:', error)
    return NextResponse.json(
      { error: 'Failed to list approvals' },
      { status: 500 }
    )
  }
}
