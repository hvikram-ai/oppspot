import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/streams/[id]/agents
 * Get all agents assigned to a stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has access to this stream
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Fetch stream agent assignments with agent details
    const { data: assignments, error } = await supabase
      .from('stream_agent_assignments')
      .select(`
        *,
        agent:ai_agents (
          id,
          name,
          agent_type,
          is_active,
          configuration,
          last_run_at
        )
      `)
      .eq('stream_id', streamId)
      .order('execution_order', { ascending: true })

    if (error) {
      console.error('Error fetching stream agents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stream agents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      assignments: assignments || [],
      total: assignments?.length || 0
    })
  } catch (error) {
    console.error('Unexpected error fetching stream agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/streams/[id]/agents
 * Assign an agent to a stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has editor/owner access
    const { data: membership } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      agent_id,
      agent_type,
      assignment_role,
      execution_order,
      is_active,
      auto_execute,
      execution_frequency,
      execution_config,
      depends_on_agent_ids
    } = body

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    let finalAgentId = agent_id

    // If agent_type provided but no agent_id, create the agent
    if (!agent_id && agent_type) {
      const agentNames: Record<string, string> = {
        opportunity_bot: 'OpportunityBot™',
        scout_agent: 'Scout Agent',
        research_gpt: 'ResearchGPT™',
        scoring_agent: 'Scoring Agent'
      }

      const { data: newAgent, error: agentError } = await supabase
        .from('ai_agents')
        .insert({
          org_id: profile?.org_id,
          stream_id: streamId,
          agent_type,
          name: agentNames[agent_type] || agent_type,
          description: `Agent for stream`,
          configuration: execution_config || {},
          is_active: is_active !== undefined ? is_active : true,
          created_by: user.id
        })
        .select('id')
        .single()

      if (agentError) {
        console.error('Error creating agent:', agentError)
        return NextResponse.json(
          { error: 'Failed to create agent' },
          { status: 500 }
        )
      }

      finalAgentId = newAgent.id
    }

    if (!finalAgentId) {
      return NextResponse.json(
        { error: 'Either agent_id or agent_type must be provided' },
        { status: 400 }
      )
    }

    // Create stream-agent assignment
    const { data: assignment, error: assignError } = await supabase
      .from('stream_agent_assignments')
      .insert({
        stream_id: streamId,
        agent_id: finalAgentId,
        assignment_role: assignment_role || 'primary',
        execution_order: execution_order || 1,
        is_active: is_active !== undefined ? is_active : true,
        auto_execute: auto_execute !== undefined ? auto_execute : false,
        execution_frequency: execution_frequency || 'on_demand',
        execution_config: execution_config || {},
        depends_on_agent_ids: depends_on_agent_ids || []
      })
      .select(`
        *,
        agent:ai_agents (
          id,
          name,
          agent_type,
          is_active
        )
      `)
      .single()

    if (assignError) {
      console.error('Error assigning agent:', assignError)
      return NextResponse.json(
        { error: 'Failed to assign agent to stream' },
        { status: 500 }
      )
    }

    // Create activity
    await supabase
      .from('stream_activities')
      .insert({
        stream_id: streamId,
        user_id: user.id,
        activity_type: 'ai_update',
        description: `Assigned ${assignment.agent?.name || 'agent'} to stream`,
        is_system: false,
        importance: 'normal'
      })

    return NextResponse.json(assignment, { status: 201 })

  } catch (error) {
    console.error('Unexpected error assigning agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
