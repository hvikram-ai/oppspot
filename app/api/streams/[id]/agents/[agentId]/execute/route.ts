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
  execution_config: Record<string, unknown> | null
  execution_order: number | null
  total_executions: number
  last_executed_at: string | null
}

interface StreamRow extends Row<'streams'> {
  goal_criteria: Record<string, unknown> | null
  target_metrics: Record<string, unknown> | null
  success_criteria: Record<string, unknown> | null
  current_progress: Record<string, unknown> | null
}

interface AgentExecutionRow extends Row<'agent_executions'> {
  goal_context: Record<string, unknown> | null
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
    const { data: membershipData, error: membershipError } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single();

    const membership = membershipData as Row<'stream_members'> | null

    if (membershipError) {
      console.error('[Agent Execute] Error fetching membership:', membershipError);
    }

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { execution_config, force_execute } = body

    // Get stream and agent details
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .single();

    if (streamError) {
      console.error('[Agent Execute] Error fetching stream:', streamError);
    }

    const streamTyped = stream as unknown as StreamRow | null;

    const { data: agentData, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    const agent = agentData as Row<'ai_agents'> | null

    if (agentError) {
      console.error('[Agent Execute] Error fetching agent:', agentError);
    }

    const { data: assignmentData, error: assignmentError } = await supabase
      .from('stream_agent_assignments')
      .select('*')
      .eq('stream_id', streamId)
      .eq('agent_id', agentId)
      .single();

    const assignment = assignmentData as StreamAgentAssignment | null

    if (assignmentError) {
      console.error('[Agent Execute] Error fetching assignment:', assignmentError);
    }

    const assignmentTyped = assignment as unknown as StreamAgentAssignment | null;

    if (!streamTyped || !agent || !assignmentTyped) {
      return NextResponse.json(
        { error: 'Stream, agent, or assignment not found' },
        { status: 404 }
      )
    }

    // Check if agent is active
    if (!assignmentTyped.is_active && !force_execute) {
      return NextResponse.json(
        { error: 'Agent is not active' },
        { status: 400 }
      )
    }

    // Check dependencies (unless force_execute)
    if (!force_execute && assignmentTyped.depends_on_agent_ids && assignmentTyped.depends_on_agent_ids.length > 0) {
      // Check if dependent agents have completed executions
      const { data: dependentExecutions, error: depError } = await supabase
        .from('agent_executions')
        .select('agent_id, status')
        .eq('stream_id', streamId)
        .in('agent_id', assignmentTyped.depends_on_agent_ids)
        .order('created_at', { ascending: false });

      if (depError) {
        console.error('[Agent Execute] Error fetching dependent executions:', depError);
      }

      const completedDependencies = new Set(
        dependentExecutions
          ?.filter((e: { status: string; agent_id: string }) => e.status === 'completed')
          .map((e: { status: string; agent_id: string }) => e.agent_id) || []
      )

      const missingDependencies = assignmentTyped.depends_on_agent_ids.filter(
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
    const { data: execution, error: execError } = await supabase
      .from('agent_executions')
      .insert({
        agent_id: agentId,
        org_id: streamTyped.org_id,
        stream_id: streamId,
        status: 'queued',
        input_data: execution_config || assignmentTyped.execution_config || {},
        goal_context: {
          goal_criteria: streamTyped.goal_criteria,
          target_metrics: streamTyped.target_metrics,
          success_criteria: streamTyped.success_criteria,
          current_progress: streamTyped.current_progress
        }
      } as never)
      .select()
      .single();

    const executionTyped = execution as unknown as AgentExecutionRow | null;

    if (execError) {
      console.error('Error creating execution:', execError)
      return NextResponse.json(
        { error: 'Failed to create execution' },
        { status: 500 }
      )
    }

    // Create agent task for async execution
    if (executionTyped) {
      await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agentId,
          org_id: streamTyped.org_id,
          task_type: 'stream_execution',
          priority: assignmentTyped.execution_order || 5,
          payload: {
            stream_id: streamId,
            execution_id: executionTyped.id,
            goal_context: executionTyped.goal_context
          } as Record<string, unknown>,
          status: 'pending'
        } as never)
    }

    // Update assignment last execution
    await supabase
      .from('stream_agent_assignments')
      .update({
        last_executed_at: new Date().toISOString(),
        total_executions: (assignmentTyped.total_executions || 0) + 1
      } as never)
      .eq('id', assignmentTyped.id)

    // Create activity
    if (executionTyped) {
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
            execution_id: executionTyped.id
          } as Record<string, unknown>
        } as never)
    }

    // Generate initial insight
    if (executionTyped) {
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
            execution_id: executionTyped.id
          } as Record<string, unknown>,
          generated_by: agentId,
          agent_execution_id: executionTyped.id,
          is_read: false,
          is_actionable: false
        } as never)
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
