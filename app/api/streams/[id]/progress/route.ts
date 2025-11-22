import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Type definitions for stream-related data
interface StreamRow {
  id: string
  org_id: string
  name: string
  description: string | null
  emoji: string | null
  color: string | null
  stream_type: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  target_metrics?: {
    companies_to_find?: number
    min_quality_score?: number
    [key: string]: unknown
  }
  current_progress?: {
    completed?: number
    total?: number
    percentage?: number
    last_updated?: string
    items_by_stage?: Record<string, number>
    quality_score?: number
    signals_detected?: number
    [key: string]: unknown
  }
  goal_status?: string
  goal_deadline?: string | null
}

interface StreamItemRow {
  id: string
  stream_id: string
  item_type: string
  item_id: string | null
  position: number
  stage_id: string | null
  status?: string
  metadata: {
    quality_score?: number
    signals?: string[]
    [key: string]: unknown
  } | null
  created_by: string
  created_at: string
  updated_at: string
}

interface StreamMemberRow {
  id: string
  stream_id: string
  user_id: string
  role: string
  created_at: string
}

interface AgentExecutionRow {
  id: string
  agent_id: string
  status: string
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  results_summary: Record<string, unknown> | null
  ai_agents?: {
    name?: string
    agent_type?: string
  } | null
}

interface StreamInsightRow {
  id: string
  stream_id: string
  insight_type: string
  title: string
  description: string
  severity: string
  data: Record<string, unknown> | null
  generated_by: string
  is_read: boolean
  is_actionable: boolean
  created_at: string
}

/**
 * GET /api/streams/[id]/progress
 * Get comprehensive progress data for a goal-oriented stream
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

    // Verify user has access
    const { data: membership, error: membershipError } = await supabase
      .from('stream_members')
      .select('role')
      .eq('stream_id', streamId)
      .eq('user_id', user.id)
      .single();

    if (membershipError) {
      console.error('Error fetching membership:', membershipError);
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get stream details
    const { data: streamData, error: streamError } = await supabase
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .single();

    if (streamError) {
      console.error('Error fetching stream:', streamError);
    }

    if (!streamData) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      )
    }

    const stream = streamData as StreamRow

    // Get all stream items
    const { data: itemsData, error: itemsError } = await supabase
      .from('stream_items')
      .select('*')
      .eq('stream_id', streamId);

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
    }

    const items = (itemsData || []) as StreamItemRow[]

    const targetMetrics = stream.target_metrics as { companies_to_find?: number; min_quality_score?: number } | null
    const totalItems = items?.length || 0
    const completedItems = items?.filter(item => item.status === 'completed').length || 0
    const percentage = targetMetrics?.companies_to_find
      ? Math.round((totalItems / targetMetrics.companies_to_find) * 100)
      : totalItems > 0 ? 100 : 0

    // Calculate items by stage
    const itemsByStage: Record<string, number> = {}
    items?.forEach(item => {
      if (item.stage_id) {
        itemsByStage[item.stage_id] = (itemsByStage[item.stage_id] || 0) + 1
      }
    })

    // Calculate quality metrics
    const itemsWithScores = items?.filter(
      item => item.metadata && typeof (item.metadata as { quality_score?: number }).quality_score === 'number'
    ) || []

    const avgQualityScore = itemsWithScores.length > 0
      ? itemsWithScores.reduce((sum, item) => sum + ((item.metadata as { quality_score: number }).quality_score), 0) / itemsWithScores.length
      : 0

    const highQualityCount = itemsWithScores.filter(
      item => ((item.metadata as { quality_score: number }).quality_score) >= (targetMetrics?.min_quality_score || 4.0)
    ).length

    // Count signals detected
    const signalsDetected = items?.reduce((count, item) => {
      const signals = (item.metadata as { signals?: string[] } | null)?.signals || []
      return count + signals.length
    }, 0) || 0

    // Update stream progress in database
    await supabase
      .from('streams')
      .update({
        current_progress: {
          completed: totalItems,
          total: targetMetrics?.companies_to_find || totalItems,
          percentage,
          last_updated: new Date().toISOString(),
          items_by_stage: itemsByStage,
          quality_score: avgQualityScore,
          signals_detected: signalsDetected
        } as any
      } as any)
      .eq('id', streamId)

    // Get recent agent executions
    const { data: executionsData, error: executionsError } = await supabase
      .from('agent_executions')
      .select(`
        id,
        agent_id,
        status,
        started_at,
        completed_at,
        duration_ms,
        results_summary,
        ai_agents (
          name,
          agent_type
        )
      `)
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (executionsError) {
      console.error('Error fetching executions:', executionsError);
    }

    const executions = (executionsData || []) as AgentExecutionRow[]

    const recentAgentExecutions = executions?.map(exec => ({
      id: exec.id,
      agent_id: exec.agent_id,
      agent_name: exec.ai_agents?.name || 'Unknown',
      agent_type: exec.ai_agents?.agent_type || 'unknown',
      status: exec.status,
      started_at: exec.started_at,
      completed_at: exec.completed_at,
      duration_ms: exec.duration_ms,
      results_summary: exec.results_summary || {}
    })) || []

    // Get unread insights
    const { data: insightsData, error: insightsError } = await supabase
      .from('stream_insights')
      .select('*')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (insightsError) {
      console.error('Error fetching insights:', insightsError);
    }

    const insights = (insightsData || []) as StreamInsightRow[]

    // Determine goal status
    let goalStatus = stream.goal_status
    if (percentage >= 100) {
      goalStatus = 'completed'
    } else if (percentage >= 80) {
      goalStatus = 'on_track'
    } else if (percentage >= 50) {
      goalStatus = 'in_progress'
    } else if (stream.goal_deadline) {
      const daysRemaining = Math.ceil(
        (new Date(stream.goal_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysRemaining < 7 && percentage < 70) {
        goalStatus = 'at_risk'
      }
    }

    // Update goal status if changed
    if (goalStatus !== stream.goal_status) {
      await supabase
        .from('streams')
        .update({ goal_status: goalStatus } as any as any)
        .eq('id', streamId)

      // Create insight for status change
      const insertInsightResult = await supabase
        .from('stream_insights')
        .insert({
          stream_id: streamId,
          insight_type: 'progress_update',
          title: `Goal Status: ${goalStatus}`,
          description: `Your goal status has been updated to ${goalStatus?.replace('_', ' ') || ''}`,
          severity: goalStatus === 'completed' ? 'success' : goalStatus === 'at_risk' ? 'warning' : 'info',
          data: {
            previous_status: stream.goal_status,
            new_status: goalStatus,
            percentage
          },
          generated_by: 'system',
          is_read: false,
          is_actionable: false
        } as any)
    }

    return NextResponse.json({
      stream,
      progress: {
        completed: totalItems,
        total: targetMetrics?.companies_to_find || totalItems,
        percentage,
        last_updated: new Date().toISOString(),
        items_by_stage: itemsByStage,
        quality_score: avgQualityScore,
        signals_detected: signalsDetected
      },
      goal_status: goalStatus,
      quality_metrics: {
        avg_quality_score: avgQualityScore,
        high_quality_count: highQualityCount,
        signals_detected: signalsDetected
      },
      recent_agent_executions: recentAgentExecutions,
      insights: insights || []
    })

  } catch (error) {
    console.error('Unexpected error fetching stream progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
