/**
 * Checklist Item API Routes
 * PATCH - Update checklist item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateChecklistItemSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'blocked', 'not_applicable']).optional(),
  notes: z.string().optional(),
  document_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional()
})

/**
 * PATCH /api/data-room/checklists/[id]/items/[itemId]
 * Update checklist item
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get checklist to verify access
    const { data: checklist } = await supabase
      .from('review_checklists')
      .select('data_room_id')
      .eq('id', id)
      .single()

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
    }

    // Verify access
    const { data: access } = await supabase
      .from('data_room_access')
      .select('role')
      .eq('data_room_id', checklist.data_room_id)
      .eq('user_id', user.id)
      .single()

    if (!access || !['owner', 'editor', 'commenter'].includes(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate and update
    const body = await req.json()
    const validated = UpdateChecklistItemSchema.parse(body)

    const updates: Record<string, unknown> = { ...validated }

    // Set completed_at if marking as completed
    if (validated.status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('checklist_items')
      .update(updates)
      .eq('id', itemId)
      .eq('checklist_id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update checklist item error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update checklist item' },
      { status: 500 }
    )
  }
}
