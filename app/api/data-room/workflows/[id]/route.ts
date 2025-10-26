/**
 * Workflow Detail API Routes
 * GET - Get workflow details
 * PATCH - Update workflow
 * DELETE - Delete workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
  config: z.object({}).passthrough().optional()
})

/**
 * GET /api/data-room/workflows/[id]
 * Get workflow details with steps
 */
export async function GET(
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

    // Get workflow with steps and calculate progress
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (
          *,
          approval_requests (count),
          workflow_tasks (count)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Verify access
    const { data: access } = await supabase
      .from('data_room_access')
      .select('role')
      .eq('data_room_id', workflow.data_room_id)
      .eq('user_id', user.id)
      .single()

    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate progress metrics
    const totalSteps = workflow.workflow_steps?.length || 0
    const completedSteps = workflow.workflow_steps?.filter((s: { status: string }) => s.status === 'completed').length || 0
    const pendingApprovals = workflow.workflow_steps?.reduce((sum: number, s: { approval_requests: { count: number }[] }) =>
      sum + (s.approval_requests?.[0]?.count || 0), 0) || 0
    const overdueTasks = 0 // TODO: Calculate based on due dates

    const workflowWithProgress = {
      ...workflow,
      total_steps: totalSteps,
      completed_steps: completedSteps,
      pending_approvals: pendingApprovals,
      overdue_tasks: overdueTasks
    }

    return NextResponse.json({ success: true, data: workflowWithProgress })
  } catch (error) {
    console.error('Get workflow error:', error)
    return NextResponse.json({ error: 'Failed to get workflow' }, { status: 500 })
  }
}

/**
 * PATCH /api/data-room/workflows/[id]
 * Update workflow
 */
export async function PATCH(
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

    // Get workflow to check permissions
    const { data: workflow } = await supabase
      .from('workflows')
      .select('data_room_id')
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

    // Validate and update
    const body = await req.json()
    const validated = UpdateWorkflowSchema.parse(body)

    const { data: updated, error } = await supabase
      .from('workflows')
      .update(validated)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update workflow error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
  }
}

/**
 * DELETE /api/data-room/workflows/[id]
 * Delete workflow
 */
export async function DELETE(
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
      .select('data_room_id')
      .eq('id', id)
      .single()

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Verify owner access
    const { data: access } = await supabase
      .from('data_room_access')
      .select('role')
      .eq('data_room_id', workflow.data_room_id)
      .eq('user_id', user.id)
      .single()

    if (!access || access.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete workflow (cascade will delete steps, tasks, etc.)
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete workflow error:', error)
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 })
  }
}
