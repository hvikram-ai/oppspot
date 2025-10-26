/**
 * Workflows API Routes
 * POST - Create workflow
 * GET - List workflows
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const CreateWorkflowSchema = z.object({
  data_room_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  workflow_type: z.enum(['approval', 'review', 'checklist', 'custom']),
  config: z.object({
    auto_start: z.boolean().optional(),
    trigger_on_document_types: z.array(z.string()).optional(),
    require_all_approvals: z.boolean().optional(),
    allow_parallel_steps: z.boolean().optional(),
    due_date: z.string().optional(),
    reminder_days: z.array(z.number()).optional()
  }).optional()
})

/**
 * POST /api/data-room/workflows
 * Create a new workflow
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await req.json()
    const validated = CreateWorkflowSchema.parse(body)

    // Verify user has access to data room
    const { data: access } = await supabase
      .from('data_room_access')
      .select('role')
      .eq('data_room_id', validated.data_room_id)
      .eq('user_id', user.id)
      .single()

    if (!access || !['owner', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        data_room_id: validated.data_room_id,
        name: validated.name,
        description: validated.description,
        workflow_type: validated.workflow_type,
        config: validated.config || {},
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: validated.data_room_id,
      action: 'create_workflow',
      details: { workflow_id: workflow.id, name: workflow.name }
    })

    return NextResponse.json({ success: true, data: workflow }, { status: 201 })
  } catch (error) {
    console.error('Create workflow error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/data-room/workflows
 * List workflows for a data room
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

    if (!dataRoomId) {
      return NextResponse.json(
        { error: 'data_room_id is required' },
        { status: 400 }
      )
    }

    // Verify access
    const { data: access } = await supabase
      .from('data_room_access')
      .select('role')
      .eq('data_room_id', dataRoomId)
      .eq('user_id', user.id)
      .single()

    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (
          id,
          name,
          status,
          step_order
        )
      `)
      .eq('data_room_id', dataRoomId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: workflows, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data: workflows })
  } catch (error) {
    console.error('List workflows error:', error)
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    )
  }
}
