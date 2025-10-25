import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/dashboard/metrics
 *
 * Fetches dashboard metrics with trends and predictions
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'year' (default: 'week')
 * - format: 'absolute' | 'relative' (default: 'relative')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week'
    const format = searchParams.get('format') || 'relative'

    // Calculate date ranges
    const now = new Date()
    const periodStart = getPeriodStart(now, period)
    const previousPeriodStart = getPeriodStart(periodStart, period)

    // Fetch metrics in parallel
    const [
      timeSaved,
      pipelineValue,
      activeLeads,
      researchCredits,
      searchCount,
      conversionRate,
      previousTimeSaved,
      previousSearchCount
    ] = await Promise.all([
      calculateTimeSaved(supabase, user.id, periodStart, now),
      calculatePipelineValue(supabase, user.id, periodStart, now),
      getActiveLeads(supabase, user.id),
      getResearchCredits(supabase, user.id),
      getSearchCount(supabase, user.id, periodStart, now),
      getConversionRate(supabase, user.id, periodStart, now),
      calculateTimeSaved(supabase, user.id, previousPeriodStart, periodStart),
      getSearchCount(supabase, user.id, previousPeriodStart, periodStart)
    ])

    // Calculate trends
    const trends = {
      time_saved: calculateTrend(timeSaved, previousTimeSaved),
      pipeline_value: calculateTrend(pipelineValue, 0), // No previous data yet
      search_count: calculateTrend(searchCount, previousSearchCount)
    }

    // Generate predictions
    const predictions = {
      next_milestone: generateMilestone(activeLeads),
      warnings: generateWarnings(researchCredits, activeLeads)
    }

    const metrics = {
      time_period: period,
      format,
      metrics: {
        time_saved_hours: timeSaved,
        pipeline_value: pipelineValue,
        active_leads: activeLeads,
        research_credits_remaining: researchCredits,
        search_count: searchCount,
        conversion_rate: conversionRate
      },
      trends,
      predictions
    }

    return NextResponse.json(metrics, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in GET /api/dashboard/metrics:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Helper functions

function getPeriodStart(from: Date, period: string): Date {
  const date = new Date(from)
  switch (period) {
    case 'day':
      date.setDate(date.getDate() - 1)
      break
    case 'week':
      date.setDate(date.getDate() - 7)
      break
    case 'month':
      date.setMonth(date.getMonth() - 1)
      break
    case 'year':
      date.setFullYear(date.getFullYear() - 1)
      break
  }
  return date
}

async function calculateTimeSaved(supabase: SupabaseClient, userId: string, start: Date, end: Date): Promise<number> {
  // Estimate: Each research report saves ~2 hours
  const { count } = await supabase
    .from('research_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('generated_at', start.toISOString())
    .lte('generated_at', end.toISOString())

  return (count || 0) * 2
}

async function calculatePipelineValue(supabase: SupabaseClient, userId: string, start: Date, end: Date): Promise<number> {
  // Estimate: Count saved businesses with estimated value
  const { count } = await supabase
    .from('saved_businesses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('created_at', start.toISOString())

  // Rough estimate: £5000 per lead
  return (count || 0) * 5000
}

async function getActiveLeads(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from('saved_businesses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')

  return count || 0
}

async function getResearchCredits(supabase: SupabaseClient, userId: string): Promise<number> {
  // Get user's research quota (100 per month)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count: used } = await supabase
    .from('research_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('generated_at', monthStart.toISOString())

  const totalCredits = 100
  return Math.max(0, totalCredits - (used || 0))
}

async function getSearchCount(supabase: SupabaseClient, userId: string, start: Date, end: Date): Promise<number> {
  // Count saved businesses as proxy for searches
  const { count } = await supabase
    .from('saved_businesses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  return count || 0
}

async function getConversionRate(supabase: SupabaseClient, userId: string, start: Date, end: Date): Promise<number> {
  // Simplified conversion calculation
  const { count: total } = await supabase
    .from('saved_businesses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())

  const { count: converted } = await supabase
    .from('saved_businesses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'won')
    .gte('created_at', start.toISOString())

  if (!total || total === 0) return 0
  return Math.round((converted || 0) / total * 1000) / 10 // Percentage with 1 decimal
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    return {
      current,
      previous: 0,
      change_percent: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'flat'
    }
  }

  const change = ((current - previous) / previous) * 100
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return {
    current,
    previous,
    change_percent: Math.round(change * 10) / 10,
    direction
  }
}

function generateMilestone(activeLeads: number): string {
  if (activeLeads < 10) {
    return 'Add 10 more leads to reach your first milestone'
  } else if (activeLeads < 50) {
    return 'On track to hit 50 leads by end of month'
  } else if (activeLeads < 100) {
    return 'Great progress! You\'re approaching 100 active leads'
  } else {
    return 'Excellent! You have 100+ leads in your pipeline'
  }
}

function generateWarnings(credits: number, leads: number): string[] {
  const warnings: string[] = []

  if (credits < 10) {
    warnings.push('Research credits running low. Only ' + credits + ' remaining this month.')
  }

  if (leads > 50 && credits < 20) {
    warnings.push('You have many leads but few research credits. Consider upgrading.')
  }

  return warnings
}
