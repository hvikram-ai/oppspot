import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

interface GoalTemplate {
  default_criteria: Record<string, any>
  default_metrics: Record<string, any>
  default_success_criteria: Record<string, any>
  suggested_agents?: Array<{
    agent_type: string
    role: string
    order: number
    config: Record<string, any>
  }>
  use_count: number
}

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
      .single() as { data: Pick<Row<'profiles'>, 'org_id'> | null; error: any }

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
        .single() as { data: (Row<'goal_templates'> & GoalTemplate) | null; error: any }

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
          // @ts-ignore - Type inference issue
          .update({ use_count: (template.use_count || 0) + 1 })
          .eq('id', goal_template_id)
      }
    }

    // Create the stream
    const insertData = {
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
    }

    console.log('[Goal Stream] Creating with data:', {
      ...insertData,
      user_id: user.id,
      org_id: profile.org_id
    })

    const { data: stream, error: streamError } = await supabase
      .from('streams')
      // @ts-ignore - Supabase type inference issue
      .insert(insertData)
      .select()
      .single() as { data: Row<'streams'> | null; error: any }

    if (streamError) {
      console.error('Error creating stream:', streamError)
      return NextResponse.json(
        { error: 'Failed to create stream', details: streamError.message, code: streamError.code },
        { status: 500 }
      )
    }

    // Add creator as owner member (required for stream to show in list)
    const { error: memberError } = await supabase
      // @ts-ignore - Supabase type inference issue
      .from('stream_members')
      .insert({
        stream_id: stream.id,
        user_id: user.id,
        role: 'owner',
        invitation_accepted_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Error adding stream member:', memberError)
      // Non-fatal - stream was created, just log the error
    }

    // Create initial activity
    // @ts-ignore - Supabase type inference issue
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
    const assignedAgentRecords = []
    if (agentsToAssign.length > 0) {
      // First, create or get AI agent records for each agent type
      for (const suggestedAgent of agentsToAssign) {
        // Check if agent already exists for this org
        const { data: existingAgent } = await supabase
          .from('ai_agents')
          .select('id')
          .eq('org_id', profile.org_id)
          .eq('agent_type', suggestedAgent.agent_type)
          .eq('stream_id', stream.id)
          .single() as { data: Pick<Row<'ai_agents'>, 'id'> | null; error: any }

        let agentId = existingAgent?.id

        // Create agent if doesn't exist
        if (!agentId) {
          const agentNames: Record<string, string> = {
            opportunity_bot: 'OpportunityBot™',
            scout_agent: 'Scout Agent',
            research_gpt: 'ResearchGPT™',
            scoring_agent: 'Scoring Agent'
          }
// @ts-ignore - Supabase type inference issue

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
            .single() as { data: Pick<Row<'ai_agents'>, 'id'> | null; error: any }

          agentId = newAgent?.id
        }

        // @ts-ignore - Supabase type inference issue
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
            .single() as { data: Row<'stream_agent_assignments'> | null; error: any }

          if (assignment) {
            assignedAgentRecords.push(assignment)
          }
        }
      }
// @ts-ignore - Supabase type inference issue

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
