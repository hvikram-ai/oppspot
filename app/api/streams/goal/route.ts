import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

interface GoalTemplate {
  default_criteria: Record<string, unknown>
  default_metrics: Record<string, unknown>
  default_success_criteria: Record<string, unknown>
  suggested_agents?: Array<{
    agent_type: string
    role: string
    order: number
    config: Record<string, unknown>
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
    // @ts-ignore - profiles table type inference
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    const typedProfile = profile as unknown as { org_id: string } | null

    if (!typedProfile?.org_id) {
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
      // @ts-ignore - goal_templates table
      const { data: template, error: templateError } = await supabase
        .from('goal_templates')
        .select('*')
        .eq('id', goal_template_id)
        .single();

      if (templateError) {
        console.error('Error fetching template:', templateError);
      }

      const typedTemplate = template as unknown as GoalTemplate | null;

      if (typedTemplate) {
        // Merge template defaults with user overrides
        finalCriteria = { ...typedTemplate.default_criteria, ...goal_criteria }
        finalMetrics = { ...typedTemplate.default_metrics, ...target_metrics }
        finalSuccessCriteria = { ...typedTemplate.default_success_criteria, ...success_criteria }

        // Use suggested agents if user requested
        if (assign_agents && typedTemplate.suggested_agents) {
          agentsToAssign = typedTemplate.suggested_agents
        }

        // Increment template use count
        // @ts-ignore - goal_templates table update
        await supabase
          .from('goal_templates')
          .update({ use_count: ((typedTemplate.use_count || 0) as number) + 1 })
          .eq('id', goal_template_id)
      }
    }

    // Create the stream
    const insertData: Record<string, unknown> = {
      org_id: typedProfile.org_id,
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
        total: (finalMetrics.companies_to_find as number) || 0,
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
      org_id: typedProfile.org_id
    })

    // @ts-ignore - streams table insert
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .insert(insertData)
      .select()
      .single();

    if (streamError) {
      console.error('Error creating stream:', streamError)
      return NextResponse.json(
        { error: 'Failed to create stream', details: streamError.message, code: streamError.code },
        { status: 500 }
      )
    }

    interface StreamData {
      id: string;
    }

    const typedStream = stream as unknown as StreamData | null;

    if (!typedStream) {
      return NextResponse.json(
        { error: 'Failed to create stream' },
        { status: 500 }
      );
    }

    // Add creator as owner member (required for stream to show in list)
    // @ts-ignore - stream_members table insert
    const { error: memberError } = await supabase
      .from('stream_members')
      .insert({
        stream_id: typedStream.id,
        user_id: user.id,
        role: 'owner',
        invitation_accepted_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Error adding stream member:', memberError)
      // Non-fatal - stream was created, just log the error
    }

    // Create initial activity
    // @ts-ignore - stream_activities table insert
    await supabase
      .from('stream_activities')
      .insert({
        stream_id: typedStream.id,
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
        // @ts-ignore - ai_agents table
        const { data: existingAgent, error: existingAgentError } = await supabase
          .from('ai_agents')
          .select('id')
          .eq('org_id', typedProfile.org_id)
          .eq('agent_type', (suggestedAgent as any).agent_type)
          .eq('stream_id', typedStream.id)
          .single();

        if (existingAgentError) {
          console.error('Error checking existing agent:', existingAgentError);
        }

        interface AgentIdData {
          id: string;
        }

        const typedExistingAgent = existingAgent as unknown as AgentIdData | null;
        let agentId = typedExistingAgent?.id;

        // Create agent if doesn't exist
        if (!agentId) {
          const agentNames: Record<string, string> = {
            opportunity_bot: 'OpportunityBot™',
            scout_agent: 'Scout Agent',
            research_gpt: 'ResearchGPT™',
            scoring_agent: 'Scoring Agent'
          }

          const agentType = (suggestedAgent as any).agent_type as string

          // @ts-ignore - ai_agents table insert
          const { data: newAgent, error: newAgentError } = await supabase
            .from('ai_agents')
            .insert({
              org_id: typedProfile.org_id,
              stream_id: typedStream.id,
              agent_type: agentType,
              name: agentNames[agentType] || agentType,
              description: `Auto-assigned agent for ${name}`,
              configuration: (suggestedAgent as any).config || {},
              is_active: true,
              created_by: user.id
            })
            .select('id')
            .single();

          if (newAgentError) {
            console.error('Error creating agent:', newAgentError);
          }

          const typedNewAgent = newAgent as unknown as AgentIdData | null;
          agentId = typedNewAgent?.id;
        }

        if (agentId) {
          const agentRole = (suggestedAgent as any).role as string || 'primary'
          const agentOrder = (suggestedAgent as any).order as number || 1
          const agentConfig = (suggestedAgent as any).config as Record<string, unknown> || {}

          // Create stream-agent assignment
          // @ts-ignore - stream_agent_assignments table insert
          const { data: assignment, error: assignmentError } = await supabase
            .from('stream_agent_assignments')
            .insert({
              stream_id: typedStream.id,
              agent_id: agentId,
              assignment_role: agentRole,
              execution_order: agentOrder,
              is_active: true,
              auto_execute: agentRole === 'primary',
              execution_frequency: agentRole === 'primary' ? 'daily' : 'on_demand',
              execution_config: agentConfig
            })
            .select()
            .single();

          if (assignmentError) {
            console.error('Error creating assignment:', assignmentError);
          }

          if (assignment) {
            assignedAgentRecords.push(assignment)
          }
        }
      }

      // Create activity for agent assignments
      if (assignedAgentRecords.length > 0) {
        // @ts-ignore - stream_activities table insert
        await supabase
          .from('stream_activities')
          .insert({
            stream_id: typedStream.id,
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
      // @ts-ignore - streams table update
      await supabase
        .from('streams')
        .update({ goal_status: 'in_progress' })
        .eq('id', typedStream.id)
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
