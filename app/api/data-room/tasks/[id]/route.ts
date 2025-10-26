/**
 * Task Detail API Routes
 * PATCH - Update task
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowNotificationService } from '@/lib/data-room/automation'
import { z } from 'zod'

const UpdateTaskSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  description: z.string().optional(),
  due_date: z.string().optional()
})

/**
 * PATCH /api/data-room/tasks/[id]
 * Update task
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

    // Get task
    const { data: task } = await supabase
      .from('workflow_tasks')
      .select(`
        *,
        workflow_steps!inner (
          workflows!inner (
            data_rooms!inner (name)
          )
        )
      `)
      .eq('id', id)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify user is assignee or assigner
    if (task.assigned_to !== user.id && task.assigned_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate and update
    const body = await req.json()
    const validated = UpdateTaskSchema.parse(body)

    const updates: Record<string, unknown> = { ...validated }

    // Set completed_at if marking as completed
    if (validated.status === 'completed' && task.status !== 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('workflow_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Send notification if completed
    if (validated.status === 'completed' && task.status !== 'completed') {
      const notificationService = new WorkflowNotificationService()
      const dataRoomName = task.workflow_steps?.workflows?.data_rooms?.name || 'Data Room'

      await notificationService.notifyTaskCompleted(
        { ...task, ...updated },
        dataRoomName
      )
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update task error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
