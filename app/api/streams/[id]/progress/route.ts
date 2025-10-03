import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get stream details
    const { data: stream } = await supabase
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .single()

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      )
    }

    // Get all stream items
    const { data: items } = await supabase
      .from('stream_items')
      .select('*')
      .eq('stream_id', streamId)

    const totalItems = items?.length || 0
    const completedItems = items?.filter(item => item.status === 'completed').length || 0
    const percentage = stream.target_metrics.companies_to_find
      ? Math.round((totalItems / stream.target_metrics.companies_to_find) * 100)
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
      item => item.metadata && typeof item.metadata.quality_score === 'number'
    ) || []

    const avgQualityScore = itemsWithScores.length > 0
      ? itemsWithScores.reduce((sum, item) => sum + (item.metadata.quality_score as number), 0) / itemsWithScores.length
      : 0

    const highQualityCount = itemsWithScores.filter(
      item => (item.metadata.quality_score as number) >= (stream.target_metrics.min_quality_score || 4.0)
    ).length

    // Count signals detected
    const signalsDetected = items?.reduce((count, item) => {
      const signals = item.metadata?.signals as string[] || []
      return count + signals.length
    }, 0) || 0

    // Update stream progress in database
    await supabase
      .from('streams')
      .update({
        current_progress: {
          completed: totalItems,
          total: stream.target_metrics.companies_to_find || totalItems,
          percentage,
          last_updated: new Date().toISOString(),
          items_by_stage: itemsByStage,
          quality_score: avgQualityScore,
          signals_detected: signalsDetected
        }
      })
      .eq('id', streamId)

    // Get recent agent executions
    const { data: executions } = await supabase
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
      .limit(10)

    const recentAgentExecutions = executions?.map(exec => ({
      id: exec.id,
      agent_id: exec.agent_id,
      agent_name: (exec.ai_agents as any)?.name || 'Unknown',
      agent_type: (exec.ai_agents as any)?.agent_type || 'unknown',
      status: exec.status,
      started_at: exec.started_at,
      completed_at: exec.completed_at,
      duration_ms: exec.duration_ms,
      results_summary: exec.results_summary || {}
    })) || []

    // Get unread insights
    const { data: insights } = await supabase
      .from('stream_insights')
      .select('*')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false })
      .limit(20)

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
        .update({ goal_status: goalStatus })
        .eq('id', streamId)

      // Create insight for status change
      await supabase
        .from('stream_insights')
        .insert({
          stream_id: streamId,
          insight_type: 'progress_update',
          title: `Goal Status: ${goalStatus}`,
          description: `Your goal status has been updated to ${goalStatus.replace('_', ' ')}`,
          severity: goalStatus === 'completed' ? 'success' : goalStatus === 'at_risk' ? 'warning' : 'info',
          data: {
            previous_status: stream.goal_status,
            new_status: goalStatus,
            percentage
          },
          generated_by: 'system',
          is_read: false,
          is_actionable: false
        })
    }

    return NextResponse.json({
      stream,
      progress: {
        completed: totalItems,
        total: stream.target_metrics.companies_to_find || totalItems,
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
