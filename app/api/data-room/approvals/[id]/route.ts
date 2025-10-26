/**
 * Approval Detail API Routes
 * PATCH - Make approval decision
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowNotificationService } from '@/lib/data-room/automation'
import { z } from 'zod'

const ApprovalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'needs_changes']),
  decision_notes: z.string().optional()
})

/**
 * PATCH /api/data-room/approvals/[id]
 * Make approval decision
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

    // Get approval
    const { data: approval } = await supabase
      .from('approval_requests')
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

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    // Verify user is the approver
    if (approval.requested_from !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if already decided
    if (approval.decision) {
      return NextResponse.json(
        { error: 'Approval already decided' },
        { status: 400 }
      )
    }

    // Validate request
    const body = await req.json()
    const validated = ApprovalDecisionSchema.parse(body)

    // Update approval
    const { data: updated, error } = await supabase
      .from('approval_requests')
      .update({
        decision: validated.decision,
        decision_notes: validated.decision_notes,
        decided_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Send notification
    const notificationService = new WorkflowNotificationService()
    const dataRoomName = approval.workflow_steps?.workflows?.data_rooms?.name || 'Data Room'

    await notificationService.notifyApprovalDecision(
      {
        ...approval,
        decision: validated.decision,
        decision_notes: validated.decision_notes || null,
        decided_at: new Date().toISOString()
      },
      dataRoomName
    )

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Approval decision error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to make approval decision' },
      { status: 500 }
    )
  }
}
