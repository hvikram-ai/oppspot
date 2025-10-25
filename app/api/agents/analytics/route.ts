/**
 * Agent Analytics API
 * GET /api/agents/analytics - Retrieve agent performance analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentAnalyticsService } from '@/lib/agents/analytics-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and org_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const orgId = (profile as any)?.org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const timeRange = (searchParams.get('timeRange') as '24h' | '7d' | '30d') || '7d'
    const metric = searchParams.get('metric') || 'all'

    // Fetch requested metrics
    const response: Record<string, unknown> = {}

    if (metric === 'all' || metric === 'overview') {
      response.overview = await AgentAnalyticsService.getOverviewMetrics(orgId, timeRange)
    }

    if (metric === 'all' || metric === 'performance') {
      response.performance = await AgentAnalyticsService.getAgentPerformance(orgId, timeRange)
    }

    if (metric === 'all' || metric === 'history') {
      const limit = parseInt(searchParams.get('limit') || '50', 10)
      const agentId = searchParams.get('agentId') || undefined
      response.history = await AgentAnalyticsService.getExecutionHistory(orgId, limit, agentId)
    }

    if (metric === 'all' || metric === 'errors') {
      response.errors = await AgentAnalyticsService.getErrorAnalysis(orgId, timeRange)
    }

    if (metric === 'all' || metric === 'timeseries') {
      response.timeseries = await AgentAnalyticsService.getTimeSeriesData(orgId, timeRange)
    }

    if (metric === 'all' || metric === 'costs') {
      response.costs = await AgentAnalyticsService.getCostMetrics(orgId, timeRange)
    }

    return NextResponse.json({
      success: true,
      data: response,
      timeRange,
    })
  } catch (error) {
    console.error('[AgentAnalytics API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch agent analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
