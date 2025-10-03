import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/streams/goal
 * Create a new goal-oriented stream with optional agent assignments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      emoji,
      color,
      stream_type,
      goal_template_id,
      goal_criteria,
      target_metrics,
      success_criteria,
      goal_deadline,
      assign_agents,
      assigned_agents
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Stream name is required' },
        { status: 400 }
      )
    }

    // If using template, fetch it and merge settings
    let finalCriteria = goal_criteria || {}
    let finalMetrics = target_metrics || {}
    let finalSuccessCriteria = success_criteria || {}
    let agentsToAssign = assigned_agents || []

    if (goal_template_id) {
      const { data: template } = await supabase
        .from('goal_templates')
        .select('*')
        .eq('id', goal_template_id)
        .single()

      if (template) {
        // Merge template defaults with user overrides
        finalCriteria = { ...template.default_criteria, ...goal_criteria }
        finalMetrics = { ...template.default_metrics, ...target_metrics }
        finalSuccessCriteria = { ...template.default_success_criteria, ...success_criteria }

        // Use suggested agents if user requested
        if (assign_agents && template.suggested_agents) {
          agentsToAssign = template.suggested_agents
        }

        // Increment template use count
        await supabase
          .from('goal_templates')
          .update({ use_count: (template.use_count || 0) + 1 })
          .eq('id', goal_template_id)
      }
    }

    // Create the stream
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .insert({
        org_id: profile.org_id,
        name,
        description: description || null,
        emoji: emoji || '🎯',
        color: color || '#6366f1',
        stream_type: stream_type || 'project',
        goal_template_id: goal_template_id || null,
        goal_criteria: finalCriteria,
        target_metrics: finalMetrics,
        success_criteria: finalSuccessCriteria,
        current_progress: {
          completed: 0,
          total: finalMetrics.companies_to_find || 0,
          percentage: 0
        },
        goal_deadline: goal_deadline || null,
        goal_status: 'not_started',
        created_by: user.id,
        status: 'active'
      })
      .select()
      .single()

    if (streamError) {
      console.error('Error creating stream:', streamError)
      return NextResponse.json(
        { error: 'Failed to create stream' },
        { status: 500 }
      )
    }

    // Create initial activity
    await supabase
      .from('stream_activities')
      .insert({
        stream_id: stream.id,
        user_id: user.id,
        activity_type: 'stream_created',
        description: `Created goal-oriented stream: ${name}`,
        is_system: true,
        importance: 'high',
        metadata: {
          goal_template_id,
          has_agents: agentsToAssign.length > 0
        }
      })

    // Assign agents if requested
    let assignedAgentRecords = []
    if (agentsToAssign.length > 0) {
      // First, create or get AI agent records for each agent type
      for (const suggestedAgent of agentsToAssign) {
        // Check if agent already exists for this org
        let { data: existingAgent } = await supabase
          .from('ai_agents')
          .select('id')
          .eq('org_id', profile.org_id)
          .eq('agent_type', suggestedAgent.agent_type)
          .eq('stream_id', stream.id)
          .single()

        let agentId = existingAgent?.id

        // Create agent if doesn't exist
        if (!agentId) {
          const agentNames: Record<string, string> = {
            opportunity_bot: 'OpportunityBot™',
            scout_agent: 'Scout Agent',
            research_gpt: 'ResearchGPT™',
            scoring_agent: 'Scoring Agent'
          }

          const { data: newAgent } = await supabase
            .from('ai_agents')
            .insert({
              org_id: profile.org_id,
              stream_id: stream.id,
              agent_type: suggestedAgent.agent_type,
              name: agentNames[suggestedAgent.agent_type] || suggestedAgent.agent_type,
              description: `Auto-assigned agent for ${name}`,
              configuration: suggestedAgent.config || {},
              is_active: true,
              created_by: user.id
            })
            .select('id')
            .single()

          agentId = newAgent?.id
        }

        if (agentId) {
          // Create stream-agent assignment
          const { data: assignment } = await supabase
            .from('stream_agent_assignments')
            .insert({
              stream_id: stream.id,
              agent_id: agentId,
              assignment_role: suggestedAgent.role || 'primary',
              execution_order: suggestedAgent.order || 1,
              is_active: true,
              auto_execute: suggestedAgent.role === 'primary',
              execution_frequency: suggestedAgent.role === 'primary' ? 'daily' : 'on_demand',
              execution_config: suggestedAgent.config || {}
            })
            .select()
            .single()

          if (assignment) {
            assignedAgentRecords.push(assignment)
          }
        }
      }

      // Create activity for agent assignments
      if (assignedAgentRecords.length > 0) {
        await supabase
          .from('stream_activities')
          .insert({
            stream_id: stream.id,
            user_id: user.id,
            activity_type: 'ai_update',
            description: `Assigned ${assignedAgentRecords.length} AI agents to work on this goal`,
            is_system: true,
            importance: 'normal'
          })
      }
    }

    // Update goal status to in_progress if agents assigned
    if (assignedAgentRecords.length > 0) {
      await supabase
        .from('streams')
        .update({ goal_status: 'in_progress' })
        .eq('id', stream.id)
    }

    return NextResponse.json({
      stream,
      assigned_agents: assignedAgentRecords
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error creating goal stream:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
