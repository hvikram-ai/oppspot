import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadScoringService } from '@/lib/ai/scoring/lead-scoring-service'

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

    const body = await request.json()
    const {
      company_ids = [],
      company_numbers = [],
      force_refresh = false,
      limit = 50
    } = body

    // Combine and validate identifiers
    const identifiers = [
      ...company_ids,
      ...company_numbers
    ].slice(0, limit) // Limit batch size

    if (identifiers.length === 0) {
      return NextResponse.json(
        { error: 'No companies provided for batch scoring' },
        { status: 400 }
      )
    }

    console.log(`[API] Batch scoring request for ${identifiers.length} companies`)

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single() as { data: { org_id: string | null } | null; error: unknown }

    if (profileError) {
      console.error('[API] Failed to fetch profile:', profileError)
    }

    // Initialize scoring service
    const scoringService = new LeadScoringService()

    // Perform batch scoring
    const scores = await scoringService.batchScore(
      identifiers,
      {
        force_refresh,
        org_id: profile?.org_id || undefined
      }
    )

    // Log API usage
    await supabase
      .from('api_audit_log')
      .insert({
        api_name: 'lead_scoring',
        endpoint: '/api/scoring/batch',
        request_params: { count: identifiers.length },
        response_status: 200,
        response_data: { scores_calculated: scores.length },
        user_id: user.id
      })

    return NextResponse.json({
      success: true,
      scores,
      total: scores.length,
      message: `Calculated scores for ${scores.length} companies`
    })

  } catch (error) {
    console.error('[API] Batch scoring error:', error)
    return NextResponse.json(
      {
        error: 'Batch scoring failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}