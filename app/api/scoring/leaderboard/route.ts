import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Row } from '@/lib/supabase/helpers'

interface LeadScore {
  overall_score: number;
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const min_score = parseInt(searchParams.get('min_score') || '0')
    const score_type = searchParams.get('score_type') || 'overall'
    const industry = searchParams.get('industry')

    // Build query
    let query = supabase
      .from('lead_scores')
      .select(`
        *,
        businesses!inner(
          id,
          name,
          company_number,
          website,
          sic_codes,
          company_status
        )
      `)

    // Apply filters
    if (min_score > 0) {
      const scoreColumn = `${score_type}_score`
      query = query.gte(scoreColumn, min_score)
    }

    // Filter by industry if provided
    if (industry) {
      // This would need a more complex query to filter by SIC codes
      // For now, we'll just get all and filter in memory
    }

    // Order by score
    const orderColumn = score_type === 'overall' ? 'overall_score' : `${score_type}_score`
    query = query
      .order(orderColumn, { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: scores, error, count } = await query

    if (error) {
      throw error
    }

    // Calculate statistics
    const stats = await calculateLeaderboardStats(supabase)

    return NextResponse.json({
      success: true,
      leaderboard: scores || [],
      pagination: {
        limit,
        offset,
        total: count || 0
      },
      statistics: stats
    })

  } catch (error) {
    console.error('[API] Leaderboard error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function calculateLeaderboardStats(supabase: SupabaseClient) {
  try {
    // Get score distribution
    const { data: allScores, error: allScoresError } = await supabase
      .from('lead_scores')
      .select('overall_score')

    if (!allScores || allScores.length === 0) {
      return {
        average_score: 0,
        median_score: 0,
        total_scored: 0,
        distribution: {}
      }
    }

    const scores = (allScores as LeadScore[]).map(s => s.overall_score).sort((a: number, b: number) => a - b)
    const total = scores.length
    const average = scores.reduce((sum: number, score: number) => sum + score, 0) / total
    const median = total % 2 === 0
      ? (scores[total / 2 - 1] + scores[total / 2]) / 2
      : scores[Math.floor(total / 2)]

    // Calculate distribution
    const distribution = {
      excellent: scores.filter((s: number) => s >= 90).length,
      very_good: scores.filter((s: number) => s >= 75 && s < 90).length,
      good: scores.filter((s: number) => s >= 60 && s < 75).length,
      average: scores.filter((s: number) => s >= 45 && s < 60).length,
      below_average: scores.filter((s: number) => s >= 30 && s < 45).length,
      poor: scores.filter((s: number) => s < 30).length
    }

    return {
      average_score: Math.round(average),
      median_score: Math.round(median),
      total_scored: total,
      distribution
    }

  } catch (error) {
    console.error('[API] Stats calculation error:', error)
    return {
      average_score: 0,
      median_score: 0,
      total_scored: 0,
      distribution: {}
    }
  }
}