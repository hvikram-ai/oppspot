/**
 * Tasks API Routes
 * GET - List tasks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/data-room/tasks
 * List tasks for current user
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
    const status = searchParams.get('status')
    const assignedToMe = searchParams.get('assigned_to_me') === 'true'

    // Build query
    let query = supabase
      .from('workflow_tasks')
      .select(`
        *,
        workflow_steps!inner (
          id,
          name,
          workflows!inner (
            id,
            name,
            data_room_id,
            data_rooms!inner (name)
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (assignedToMe) {
      query = query.eq('assigned_to', user.id)
    } else {
      query = query.or(`assigned_to.eq.${user.id},assigned_by.eq.${user.id}`)
    }

    if (dataRoomId) {
      query = query.eq('workflow_steps.workflows.data_room_id', dataRoomId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: tasks, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data: tasks })
  } catch (error) {
    console.error('List tasks error:', error)
    return NextResponse.json({ error: 'Failed to list tasks' }, { status: 500 })
  }
}
