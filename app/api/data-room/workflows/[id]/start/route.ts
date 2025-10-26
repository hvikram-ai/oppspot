/**
 * Start Workflow API Route
 * POST - Start a workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { workflowAutomationService } from '@/lib/data-room/automation'

/**
 * POST /api/data-room/workflows/[id]/start
 * Start a workflow (triggers automation)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workflow
    const { data: workflow } = await supabase
      .from('workflows')
      .select('data_room_id, status')
      .eq('id', id)
      .single()

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Verify access
    const { data: access } = await supabase
      .from('data_room_access')
      .select('role')
      .eq('data_room_id', workflow.data_room_id)
      .eq('user_id', user.id)
      .single()

    if (!access || !['owner', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if already started
    if (workflow.status !== 'draft') {
      return NextResponse.json(
        { error: 'Workflow already started' },
        { status: 400 }
      )
    }

    // Start workflow using automation service
    await workflowAutomationService.startWorkflow(id, user.id)

    return NextResponse.json({
      success: true,
      message: 'Workflow started successfully'
    })
  } catch (error) {
    console.error('Start workflow error:', error)
    return NextResponse.json(
      { error: 'Failed to start workflow' },
      { status: 500 }
    )
  }
}
