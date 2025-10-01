import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/dashboard/digest
 *
 * Fetches today's AI digest for the user
 * Query params: date (optional) - specific date to fetch
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

    // Get date from query params (defaults to today)
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const targetDate = dateParam || new Date().toISOString().split('T')[0]

    // Fetch digest for the date
    const { data: digest, error: fetchError } = await supabase
      .from('ai_digest')
      .select('*')
      .eq('user_id', user.id)
      .eq('digest_date', targetDate)
      .single()

    if (fetchError && fetchError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Not Found', message: 'No digest found for this date' },
        { status: 404 }
      )
    }

    if (fetchError) {
      console.error('Error fetching digest:', fetchError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch digest' },
        { status: 500 }
      )
    }

    return NextResponse.json(digest, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in GET /api/dashboard/digest:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/digest
 *
 * Generates a new AI digest
 * Body: { force_refresh?: boolean }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}))
    const forceRefresh = body.force_refresh || false

    const today = new Date().toISOString().split('T')[0]

    // Check if digest already exists for today
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('ai_digest')
        .select('id')
        .eq('user_id', user.id)
        .eq('digest_date', today)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Digest already exists for today. Use force_refresh=true to regenerate.' },
          { status: 409 }
        )
      }
    }

    // Generate digest data
    // TODO: Replace with actual AI generation logic
    const digestData = await generateDigestData(supabase, user.id)

    // Calculate priority score (1-10)
    const priorityScore = calculatePriorityScore(digestData)

    // Insert or update digest
    const digestPayload = {
      user_id: user.id,
      digest_date: today,
      digest_data: digestData,
      priority_score: priorityScore,
      generation_duration_ms: 0, // Will be calculated
      ai_model: 'gpt-4-turbo'
    }

    const { data: digest, error: upsertError } = await supabase
      .from('ai_digest')
      .upsert(digestPayload, {
        onConflict: 'user_id,digest_date',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error creating digest:', upsertError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to create digest' },
        { status: 500 }
      )
    }

    return NextResponse.json(digest, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/dashboard/digest:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * Generate digest data by analyzing user activity
 */
async function generateDigestData(supabase: any, userId: string) {
  // Fetch overnight discoveries (searches, matches)
  const { data: recentSearches } = await supabase
    .from('saved_businesses')
    .select('business_id, created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(10)

  // Fetch completed research reports
  const { data: completedReports } = await supabase
    .from('research_reports')
    .select('id, company_name, status')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .gte('generated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(5)

  // Fetch stale leads (urgent alerts)
  const { data: staleLeads } = await supabase
    .from('saved_businesses')
    .select('business_id, updated_at')
    .eq('user_id', userId)
    .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(10)

  // Build digest structure
  const digestData = {
    overnight_discoveries: (recentSearches || []).map((search: any) => ({
      type: 'opportunity',
      title: `New business matches found`,
      description: 'Companies matching your search criteria',
      action_url: `/business/${search.business_id}`,
      priority: 'medium'
    })),
    urgent_alerts: (staleLeads || []).slice(0, 3).map((lead: any) => ({
      type: 'follow_up',
      title: `Lead needs follow-up`,
      company_ids: [lead.business_id],
      days_since_contact: Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (24 * 60 * 60 * 1000))
    })),
    completed_work: (completedReports || []).map((report: any) => ({
      type: 'research_report',
      title: `Research completed: ${report.company_name}`,
      report_ids: [report.id]
    })),
    recommendations: [
      {
        type: 'suggestion',
        title: 'Try ResearchGPT™ on your saved companies',
        reason: 'Generate deep insights on companies you\'re tracking'
      }
    ]
  }

  return digestData
}

/**
 * Calculate priority score based on digest content
 */
function calculatePriorityScore(digestData: any): number {
  let score = 5 // Base score

  // Increase for urgent alerts
  if (digestData.urgent_alerts?.length > 0) {
    score += Math.min(digestData.urgent_alerts.length, 3)
  }

  // Increase for overnight discoveries
  if (digestData.overnight_discoveries?.length > 0) {
    score += Math.min(digestData.overnight_discoveries.length / 2, 2)
  }

  return Math.min(Math.round(score), 10)
}
