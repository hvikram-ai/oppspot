import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signalDetector } from '@/lib/signals/buying-signal-detector'
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
    const signal_type = searchParams.get('signal_type')
    const min_strength = searchParams.get('min_strength')
    const days = searchParams.get('days') || '30'
    const limit = searchParams.get('limit') || '50'

    // Build query
    let query = supabase
      .from('buying_signals')
      .select(`
        *,
        company:businesses!buying_signals_company_id_fkey(
          id,
          name,
          website
        )
      `)
      .order('detected_at', { ascending: false })
      .limit(parseInt(limit))

    // Apply filters
    if (company_id) {
      query = query.eq('company_id', company_id)
    }

    if (signal_type) {
      query = query.eq('signal_type', signal_type)
    }

    if (min_strength) {
      query = query.gte('signal_strength', parseFloat(min_strength))
    }

    // Date filter
    const dateThreshold = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
    query = query.gte('detected_at', dateThreshold.toISOString())

    const { data: signals, error } = await query

    if (error) {
      console.error('[API] Error fetching signals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch signals' },
        { status: 500 }
      )
    }

    // Get intent scores for companies
    const companyIds = [...new Set(signals?.map(s => s.company_id) || [])]
    const intentScores = await Promise.all(
      companyIds.map(id => signalDetector.calculateIntentScore(id))
    )

    const intentMap = new Map(intentScores.map(score => [score.company_id, score]))

    return NextResponse.json({
      success: true,
      signals: signals || [],
      intent_scores: Object.fromEntries(intentMap),
      count: signals?.length || 0
    })

  } catch (error) {
    console.error('[API] Signals fetch error:', error)
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
    const { company_id, detect_all } = body

    if (!company_id) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      )
    }

    // Run signal detection
    const signals = await signalDetector.detectSignals(company_id)

    // Calculate intent score
    const intentScore = await signalDetector.calculateIntentScore(company_id)

    // Log API usage
    await supabase
      .from('api_audit_log')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        api_name: 'buying_signals',
        endpoint: '/api/signals',
        method: 'POST',
        request_params: { company_id },
        response_status: 200,
        response_data: {
          signals_found: signals.length,
          intent_score: intentScore.intent_score
        },
        user_id: user.id
      })

    return NextResponse.json({
      success: true,
      signals,
      intent_score: intentScore,
      count: signals.length
    })

  } catch (error) {
    console.error('[API] Signal detection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}