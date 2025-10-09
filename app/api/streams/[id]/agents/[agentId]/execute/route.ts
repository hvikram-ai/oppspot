import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

// Extended types for stream-related tables
interface StreamAgentAssignment {
  id: string
  stream_id: string
  agent_id: string
  is_active: boolean
  depends_on_agent_ids: string[] | null
  execution_config: Record<string, any> | null
  execution_order: number | null
  total_executions: number
  last_executed_at: string | null
}

interface StreamRow extends Row<'streams'> {
  goal_criteria: Record<string, any> | null
  target_metrics: Record<string, any> | null
  success_criteria: Record<string, any> | null
  current_progress: Record<string, any> | null
}

interface AgentExecutionRow extends Row<'agent_executions'> {
  goal_context: Record<string, any> | null
}

/**
 * POST /api/streams/[id]/agents/[agentId]/execute
 * Execute an agent on a stream (creates execution task)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const { id: streamId, agentId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single() as { data: Pick<Row<'stream_members'>, 'role'> | null; error: any }

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { execution_config, force_execute } = body

    // Get stream and agent details
    const { data: stream } = await supabase
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .single() as { data: StreamRow | null; error: any }

    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single() as { data: Row<'ai_agents'> | null; error: any }

    const { data: assignment } = await supabase
      .from('stream_agent_assignments')
      .select('*')
      .eq('stream_id', streamId)
      .eq('agent_id', agentId)
      .single() as { data: StreamAgentAssignment | null; error: any }

    if (!stream || !agent || !assignment) {
      return NextResponse.json(
        { error: 'Stream, agent, or assignment not found' },
        { status: 404 }
      )
    }

    // Check if agent is active
    if (!assignment.is_active && !force_execute) {
      return NextResponse.json(
        { error: 'Agent is not active' },
        { status: 400 }
      )
    }

    // Check dependencies (unless force_execute)
    if (!force_execute && assignment.depends_on_agent_ids && assignment.depends_on_agent_ids.length > 0) {
      // Check if dependent agents have completed executions
      const { data: dependentExecutions } = await supabase
        .from('agent_executions')
        .select('agent_id, status')
        .eq('stream_id', streamId)
        .in('agent_id', assignment.depends_on_agent_ids)
        .order('created_at', { ascending: false }) as { data: Pick<Row<'agent_executions'>, 'agent_id' | 'status'>[] | null; error: any }

      const completedDependencies = new Set(
        dependentExecutions
          ?.filter(e => e.status === 'completed')
          .map(e => e.agent_id) || []
      )

      const missingDependencies = assignment.depends_on_agent_ids.filter(
        (depId: string) => !completedDependencies.has(depId)
      )

      if (missingDependencies.length > 0) {
        return NextResponse.json(
          {
            error: 'Dependent agents have not completed execution',
            missing_dependencies: missingDependencies
          },
          { status: 400 }
        )
      }
    }

    // Create agent execution record
    const executionInsert = supabase
      .from('agent_executions')
      .insert({
        agent_id: agentId,
        org_id: stream.org_id,
        stream_id: streamId,
        status: 'queued',
        input_data: execution_config || assignment.execution_config || {},
        goal_context: {
          goal_criteria: stream.goal_criteria,
          target_metrics: stream.target_metrics,
          success_criteria: stream.success_criteria,
          current_progress: stream.current_progress
        } as any
      } as any)
      .select()
      .single()

    const { data: execution, error: execError } = await executionInsert as { data: AgentExecutionRow | null; error: any }

    if (execError) {
      console.error('Error creating execution:', execError)
      return NextResponse.json(
        { error: 'Failed to create execution' },
        { status: 500 }
      )
    }

    // Create agent task for async execution
    if (execution) {
      await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agentId,
          org_id: stream.org_id,
          task_type: 'stream_execution',
          priority: assignment.execution_order || 5,
          payload: {
            stream_id: streamId,
            execution_id: execution.id,
            goal_context: execution.goal_context
          } as any,
          status: 'pending'
        } as any)
    }

    // Update assignment last execution
    const assignmentTable = supabase.from('stream_agent_assignments') as any
    await assignmentTable
      .update({
        last_executed_at: new Date().toISOString(),
        total_executions: (assignment.total_executions || 0) + 1
      })
      .eq('id', assignment.id)

    // Create activity
    if (execution) {
      await supabase
        .from('stream_activities')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          activity_type: 'ai_update',
          description: `Started execution of ${agent.name}`,
          is_system: false,
          importance: 'normal',
          metadata: {
            agent_id: agentId,
            execution_id: execution.id
          } as any
        } as any)
    }

    // Generate initial insight
    if (execution) {
      await supabase
        .from('stream_insights')
        .insert({
          stream_id: streamId,
          insight_type: 'progress_update',
          title: `${agent.name} Started`,
          description: `${agent.name} has begun working on this goal`,
          severity: 'info',
          data: {
            agent_name: agent.name,
            agent_type: agent.agent_type,
            execution_id: execution.id
          } as any,
          generated_by: agentId,
          agent_execution_id: execution.id,
          is_read: false,
          is_actionable: false
        } as any)
    }

    return NextResponse.json({
      execution,
      message: 'Agent execution queued successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error executing agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
