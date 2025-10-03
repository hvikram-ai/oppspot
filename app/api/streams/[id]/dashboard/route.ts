import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/streams/[id]/dashboard
 * Fetch comprehensive dashboard data for a stream including progress, insights, and agent activity
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await context.params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch stream with all related data
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select(`
        *,
        creator:profiles!streams_created_by_fkey(id, full_name, avatar_url)
      `)
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      console.error('Error fetching stream:', streamError)
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
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

    // Fetch stream items to calculate progress
    const { data: items = [] } = await supabase
      .from('stream_items')
      .select('id, status, stage_id, metadata')
      .eq('stream_id', streamId)

    // Calculate progress metrics
    const total = stream.target_metrics?.companies_to_find || items.length
    const completed = items.filter(item => item.status === 'completed').length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    // Calculate items by stage
    const items_by_stage: Record<string, number> = {}
    items.forEach(item => {
      if (item.stage_id) {
        items_by_stage[item.stage_id] = (items_by_stage[item.stage_id] || 0) + 1
      }
    })

    // Calculate quality metrics
    let totalQualityScore = 0
    let qualityCount = 0
    let highQualityCount = 0
    let signalsDetected = 0

    items.forEach(item => {
      if (item.metadata && typeof item.metadata === 'object') {
        const metadata = item.metadata as Record<string, unknown>
        if (typeof metadata.quality_score === 'number') {
          totalQualityScore += metadata.quality_score
          qualityCount++
          if (metadata.quality_score >= 4.0) {
            highQualityCount++
          }
        }
        if (Array.isArray(metadata.signals)) {
          signalsDetected += metadata.signals.length
        }
      }
    })

    const avg_quality_score = qualityCount > 0 ? totalQualityScore / qualityCount : 0
    const quality_score = avg_quality_score

    // Fetch insights
    const { data: insights = [] } = await supabase
      .from('stream_insights')
      .select(`
        *,
        agent:generated_by(id, name, agent_type)
      `)
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch recent agent executions (mock data for now - replace with actual table when available)
    // TODO: Replace with actual agent_executions table query
    const recent_agent_executions: Array<{
      id: string
      agent_id: string
      agent_name: string
      agent_type: string
      status: string
      started_at: string
      completed_at: string | null
      duration_ms: number | null
      results_summary: {
        items_created?: number
        items_updated?: number
        items_qualified?: number
        avg_score?: number
      }
    }> = []

    // Fetch agent assignments and their execution history
    const { data: agentAssignments = [] } = await supabase
      .from('stream_agent_assignments')
      .select(`
        *,
        agent:agent_id(id, name, agent_type)
      `)
      .eq('stream_id', streamId)
      .order('last_executed_at', { ascending: false })
      .limit(10)

    // Transform agent assignments into execution summaries
    agentAssignments.forEach((assignment: any) => {
      if (assignment.last_executed_at && assignment.agent) {
        recent_agent_executions.push({
          id: assignment.id,
          agent_id: assignment.agent_id,
          agent_name: assignment.agent.name || 'Unknown Agent',
          agent_type: assignment.agent.agent_type || 'unknown',
          status: assignment.is_active ? 'completed' : 'inactive',
          started_at: assignment.last_executed_at,
          completed_at: assignment.last_executed_at,
          duration_ms: assignment.avg_execution_time_ms,
          results_summary: {
            items_created: Math.floor(assignment.successful_executions / 10), // Estimate
            items_updated: assignment.successful_executions,
            avg_score: 4.2 // Mock value - replace with actual tracking
          }
        })
      }
    })

    // Determine goal status
    let goal_status = stream.goal_status || 'not_started'

    // Auto-update goal status based on progress
    if (percentage === 0) {
      goal_status = 'not_started'
    } else if (percentage === 100) {
      goal_status = 'completed'
    } else if (percentage >= 70) {
      goal_status = 'on_track'
    } else if (percentage >= 40) {
      goal_status = 'in_progress'
    } else if (stream.goal_deadline) {
      const daysRemaining = Math.ceil(
        (new Date(stream.goal_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysRemaining < 7 && percentage < 50) {
        goal_status = 'at_risk'
      } else {
        goal_status = 'in_progress'
      }
    }

    // Construct dashboard response
    const dashboardData = {
      stream,
      progress: {
        completed,
        total,
        percentage,
        quality_score,
        signals_detected: signalsDetected,
        items_by_stage
      },
      goal_status,
      insights,
      recent_agent_executions,
      quality_metrics: {
        avg_quality_score,
        high_quality_count: highQualityCount,
        signals_detected: signalsDetected
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
