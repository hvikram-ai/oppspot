// Agent Workflow API - Get, Update, Delete specific workflow

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateWorkflowRequest } from '@/types/agent-workflow'
import { WorkflowValidator } from '@/lib/agents/workflow-builder/workflow-validator'

/**
 * GET /api/agent-workflows/[id]
 * Get a specific workflow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workflow with creator info
    const { data: workflow, error } = await (supabase
      .from('agent_workflows') as any)
      .select('*, created_by:profiles!agent_workflows_created_by_fkey(id, full_name, email)')
      .eq('id', id)
      .single()

    if (error || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Get execution history
    const { data: executions } = await (supabase
      .from('agent_workflow_executions') as any)
      .select('id, status, started_at, completed_at, duration_ms, triggered_by')
      .eq('workflow_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      workflow,
      recent_executions: executions || [],
    })
  } catch (error) {
    console.error('Error in GET /api/agent-workflows/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/agent-workflows/[id]
 * Update a workflow
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: UpdateWorkflowRequest = await request.json()
    const { name, description, config, tags, status } = body

    // Get existing workflow
    const { data: existing, error: fetchError } = await (supabase
      .from('agent_workflows') as any)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Validate config if provided
    let validationResult
    if (config) {
      validationResult = WorkflowValidator.validateForExecution(config)

      if (!validationResult.valid) {
        return NextResponse.json(
          {
            error: 'Invalid workflow configuration',
            validation: validationResult,
          },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (tags !== undefined) updates.tags = tags
    if (status !== undefined) updates.status = status

    if (config) {
      updates.config = config
      updates.nodes = config.nodes
      updates.edges = config.edges
    }

    // Update workflow
    const { data: workflow, error: updateError } = await (supabase
      .from('agent_workflows') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating workflow:', updateError)
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      workflow,
      validation: validationResult,
    })
  } catch (error) {
    console.error('Error in PUT /api/agent-workflows/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agent-workflows/[id]
 * Delete a workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if workflow exists and user owns it
    const { data: workflow, error: fetchError } = await (supabase
      .from('agent_workflows') as any)
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (workflow.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the workflow creator can delete it' },
        { status: 403 }
      )
    }

    // Delete workflow (cascades to executions and logs)
    const { error: deleteError } = await (supabase
      .from('agent_workflows') as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting workflow:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/agent-workflows/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
