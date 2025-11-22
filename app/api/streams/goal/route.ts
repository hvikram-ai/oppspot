import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'

// Type definitions for database operations
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type StreamRow = Database['public']['Tables']['streams']['Row']
type StreamInsert = Database['public']['Tables']['streams']['Insert']
type StreamUpdate = Database['public']['Tables']['streams']['Update']
type StreamMemberInsert = Database['public']['Tables']['stream_members']['Insert']
type AIAgentRow = Database['public']['Tables']['ai_agents']['Row']
type AIAgentInsert = Database['public']['Tables']['ai_agents']['Insert']

// Extended type for goal templates (may not be in current schema)
interface GoalTemplate {
  id: string
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

// Extended types for tables that may not be fully defined
interface StreamActivityInsert {
  stream_id: string
  user_id: string
  activity_type: string
  description: string
  is_system: boolean
  importance: string
  metadata?: Record<string, unknown>
}

interface StreamAgentAssignmentInsert {
  stream_id: string
  agent_id: string
  assignment_role: string
  execution_order: number
  is_active: boolean
  auto_execute: boolean
  execution_frequency: string
  execution_config: Record<string, unknown>
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single() as { data: Pick<ProfileRow, 'org_id'> | null, error: Error | null }

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

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
      // Note: goal_templates table may not be fully defined in schema
      const { data: template, error: templateError } = await supabase
        .from('goal_templates')
        .select('*')
        .eq('id', goal_template_id)
        .single() as { data: GoalTemplate | null, error: Error | null }

      if (templateError) {
        console.error('Error fetching template:', templateError);
      }

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
        const updateData: Record<string, unknown> = { use_count: (template.use_count || 0) + 1 }
        await supabase
          .from('goal_templates')
          // @ts-expect-error - goal_templates table not fully typed in schema
          .update(updateData)
          .eq('id', goal_template_id)
      }
    }

    // Create the stream
    const insertData: Record<string, unknown> = {
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
      org_id: profile.org_id
    })

    const { data, error: streamError } = await supabase
      .from('streams')
      .insert(insertData)
      .select()
      .single()

    if (streamError) {
      console.error('Error creating stream:', streamError)
      return NextResponse.json(
        { error: 'Failed to create stream', details: streamError.message },
        { status: 500 }
      )
    }

    const stream = data as StreamRow
    if (!stream) {
      return NextResponse.json(
        { error: 'Failed to create stream' },
        { status: 500 }
      );
    }

    // Add creator as owner member (required for stream to show in list)
    const { error: memberError } = await supabase
      .from('stream_members')
      .insert({
        stream_id: stream.id,
        user_id: user.id,
        role: 'owner',
        invitation_accepted_at: new Date().toISOString()
      } as any)

    if (memberError) {
      console.error('Error adding stream member:', memberError)
      // Non-fatal - stream was created, just log the error
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
      } as any)

    // Assign agents if requested
    const assignedAgentRecords: Array<Record<string, unknown>> = []
    if (agentsToAssign.length > 0) {
      // First, create or get AI agent records for each agent type
      for (const suggestedAgent of agentsToAssign) {
        const agentType = suggestedAgent.agent_type
        const agentRole = suggestedAgent.role || 'primary'
        const agentOrder = suggestedAgent.order || 1
        const agentConfig = suggestedAgent.config || {}

        // Check if agent already exists for this org
        const { data: existingAgent, error: existingAgentError } = await supabase
          .from('ai_agents')
          .select('id')
          .eq('org_id', profile.org_id)
          .eq('agent_type', agentType)
          .eq('stream_id', stream.id)
          .single() as { data: Pick<AIAgentRow, 'id'> | null, error: Error | null }

        if (existingAgentError) {
          console.error('Error checking existing agent:', existingAgentError);
        }

        let agentId = existingAgent?.id;

        // Create agent if doesn't exist
        if (!agentId) {
          const agentNames: Record<string, string> = {
            opportunity_bot: 'OpportunityBot™',
            scout_agent: 'Scout Agent',
            research_gpt: 'ResearchGPT™',
            scoring_agent: 'Scoring Agent'
          }

          const { data: newAgent, error: newAgentError } = await supabase
            .from('ai_agents')
            .insert({
              org_id: profile.org_id,
              stream_id: stream.id,
              agent_type: agentType,
              name: agentNames[agentType] || agentType,
              description: `Auto-assigned agent for ${name}`,
              configuration: agentConfig,
              is_active: true,
              created_by: user.id
            } as any)
            .select('id')
            .single()

          if (newAgentError) {
            console.error('Error creating agent:', newAgentError);
          }

          agentId = (newAgent as { id: string } | null)?.id;
        }

        if (agentId) {
          // Create stream-agent assignment
          const { data: assignment, error: assignmentError } = await supabase
            .from('stream_agent_assignments')
            .insert({
              stream_id: stream.id,
              agent_id: agentId,
              assignment_role: agentRole,
              execution_order: agentOrder,
              is_active: true,
              auto_execute: agentRole === 'primary',
              execution_frequency: agentRole === 'primary' ? 'daily' : 'on_demand',
              execution_config: agentConfig
            } as any)
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
        await supabase
          .from('stream_activities')
          .insert({
            stream_id: stream.id,
            user_id: user.id,
            activity_type: 'ai_update',
            description: `Assigned ${assignedAgentRecords.length} AI agents to work on this goal`,
            is_system: true,
            importance: 'normal'
          } as any)
      }
    }

    // Update goal status to in_progress if agents assigned
    if (assignedAgentRecords.length > 0) {
      const statusUpdate: Record<string, unknown> = { goal_status: 'in_progress' }
      await supabase
        .from('streams')
        // @ts-expect-error - Complex Supabase update type mismatch
        .update(statusUpdate)
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
