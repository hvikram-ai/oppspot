import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BANTScorer } from '@/lib/ai/scoring/bant-scorer'
import type { Row } from '@/lib/supabase/helpers'

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

    if (!company_id) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      )
    }

    // Get existing BANT score
    const { data: score, error } = await supabase
      .from('lead_scores')
      .select(`
        bant_score,
        bant_budget,
        bant_authority,
        bant_need,
        bant_timeline,
        bant_qualification_status,
        bant_recommendations,
        bant_next_actions,
        bant_last_calculated
      `)
      .eq('company_id', company_id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[API] Error fetching BANT score:', error)
      return NextResponse.json(
        { error: 'Failed to fetch BANT score' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bant: score || null
    })

  } catch (error) {
    console.error('[API] BANT fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const { company_id } = body

    if (!company_id) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      )
    }

    // Calculate BANT score
    const scorer = new BANTScorer()
    const bantScore = await scorer.calculateBANTScore(company_id)

    // Save to database
    const { error: saveError } = await supabase
      .from('lead_scores')
      .upsert({
        company_id,
        bant_score: bantScore.overall_score,
        bant_budget: bantScore.budget_score,
        bant_authority: bantScore.authority_score,
        bant_need: bantScore.need_score,
        bant_timeline: bantScore.timeline_score,
        bant_qualification_status: bantScore.qualification_status,
        bant_recommendations: bantScore.details.recommendations,
        bant_next_actions: bantScore.details.next_actions,
        bant_last_calculated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      })

    if (saveError) {
      console.error('[API] Error saving BANT score:', saveError)
      return NextResponse.json(
        { error: 'Failed to save BANT score' },
        { status: 500 }
      )
    }

    // Log API usage
    await supabase
      .from('api_audit_log')
      .insert({
        api_name: 'bant_scoring',
        endpoint: '/api/bant',
        method: 'POST',
        request_params: { company_id },
        response_status: 200,
        response_data: { bant_score: bantScore.overall_score },
        user_id: user.id
      })

    return NextResponse.json({
      success: true,
      bant: bantScore
    })

  } catch (error) {
    console.error('[API] BANT calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}