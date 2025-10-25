// Agent Workflow Execution API

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ExecuteWorkflowRequest } from '@/types/agent-workflow'
import { WorkflowEngine } from '@/lib/agents/workflow-builder/workflow-engine'
import { WorkflowValidator } from '@/lib/agents/workflow-builder/workflow-validator'

/**
 * POST /api/agent-workflows/[id]/execute
 * Execute a workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: ExecuteWorkflowRequest = await request.json()
    const { inputData, options } = body

    // Get workflow
    const { data: workflow, error: fetchError } = await supabase
      .from('agent_workflows')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const workflowData = workflow as any

    // Check if workflow is active
    if (workflowData.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot execute archived workflow' },
        { status: 400 }
      )
    }

    // Validate workflow before execution
    const validationResult = WorkflowValidator.validateForExecution(workflowData.config)

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: 'Workflow validation failed',
          validation: validationResult,
        },
        { status: 400 }
      )
    }

    // Create execution record
    const { data: execution, error: executionError } = await (adminSupabase
      .from('agent_workflow_executions') as any as any)
      .insert({
        workflow_id: id,
        triggered_by: user.id,
        trigger_type: 'manual',
        input_data: inputData || {},
        status: 'pending',
      })
      .select()
      .single()

    if (executionError || !execution) {
      console.error('Error creating execution:', executionError)
      return NextResponse.json(
        { error: 'Failed to create execution' },
        { status: 500 }
      )
    }

    // Execute workflow asynchronously
    // In production, this would be handled by a background job (Inngest)
    executeWorkflowAsync(
      execution.id,
      workflowData.id,
      workflowData.config,
      {
        inputData: inputData || {},
        ...options,
      }
    ).catch((error) => {
      console.error('Error executing workflow:', error)
    })

    // Return execution immediately (execution runs in background)
    return NextResponse.json({
      execution: {
        id: execution.id,
        workflow_id: workflowData.id,
        status: 'pending',
        created_at: execution.created_at,
      },
      message: 'Workflow execution started',
    }, { status: 202 })
  } catch (error) {
    console.error('Error in POST /api/agent-workflows/[id]/execute:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Execute workflow asynchronously
 */
async function executeWorkflowAsync(
  executionId: string,
  workflowId: string,
  config: Record<string, unknown>,
  options: Record<string, unknown>
) {
  const adminSupabase = createAdminClient()

  try {
    // Update execution status to running
    await (adminSupabase
      .from('agent_workflow_executions') as any)
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', executionId)

    // Create workflow engine
    const engine = new WorkflowEngine(
      workflowId,
      config as never, // Type assertion needed due to JSONB
      options as never
    )

    // Execute workflow
    const result = await engine.execute()

    // Update execution with results
    await (adminSupabase
      .from('agent_workflow_executions') as any)
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_data: result.variables,
        node_results: result.nodeResults,
      })
      .eq('id', executionId)
  } catch (error) {
    console.error('Workflow execution error:', error)

    // Update execution with error
    await (adminSupabase
      .from('agent_workflow_executions') as any)
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
      })
      .eq('id', executionId)
  }
}
