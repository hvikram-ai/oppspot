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
      company_id,
      company_number,
      company_name,
      force_refresh = false,
      include_explanations = false,
      use_ai = false,
      ai_depth = 'detailed'
    } = body

    // Validate input
    if (!company_id && !company_number && !company_name) {
      return NextResponse.json(
        { error: 'Company identifier required (company_id, company_number, or company_name)' },
        { status: 400 }
      )
    }

    console.log('[API] Scoring request:', { company_id, company_number, company_name, force_refresh })

    // Get user's organization for custom weights
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    // Initialize scoring service
    const scoringService = new LeadScoringService()

    // Calculate score
    const score = await scoringService.calculateScore(
      company_id || company_number || { company_name },
      {
        force_refresh,
        include_explanations,
        org_id: profile?.org_id,
        use_ai,
        ai_depth: ai_depth as 'quick' | 'detailed'
      }
    )

    // Get explanation if requested
    let explanation = null
    if (include_explanations) {
      explanation = await scoringService.getScoreExplanation(
        company_id || company_number || company_name,
        { detailed: true }
      )
    }

    return NextResponse.json({
      success: true,
      score,
      explanation,
      message: 'Lead score calculated successfully'
    })

  } catch (error) {
    console.error('[API] Scoring error:', error)
    return NextResponse.json(
      {
        error: 'Failed to calculate score',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
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
    const company_id = searchParams.get('company_id')
    const company_number = searchParams.get('company_number')

    if (!company_id && !company_number) {
      return NextResponse.json(
        { error: 'Company identifier required' },
        { status: 400 }
      )
    }

    // Fetch existing score from database
    let query = supabase
      .from('lead_scores')
      .select('*')

    if (company_id) {
      query = query.eq('company_id', company_id)
    } else if (company_number) {
      query = query.eq('company_number', company_number.toUpperCase())
    }

    const { data: score, error } = await query.single()

    if (error || !score) {
      return NextResponse.json(
        { error: 'Score not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      score,
      cached: true
    })

  } catch (error) {
    console.error('[API] Get score error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve score' },
      { status: 500 }
    )
  }
}