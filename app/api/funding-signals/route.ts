import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FundingDetector } from '@/lib/signals/funding-detector'

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
    const limit = searchParams.get('limit') || '10'

    let query = supabase
      .from('funding_signals')
      .select('*')
      .order('announcement_date', { ascending: false })
      .limit(parseInt(limit))

    if (company_id) {
      query = query.eq('company_id', company_id)
    }

    const { data: signals, error } = await query

    if (error) {
      console.error('[API] Error fetching funding signals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch funding signals' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signals: signals || [],
      total_count: signals?.length || 0
    })

  } catch (error) {
    console.error('[API] Funding signals fetch error:', error)
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
    const { company_name, company_id } = body

    if (!company_name) {
      return NextResponse.json(
        { error: 'Company name required' },
        { status: 400 }
      )
    }

    // Detect funding signals
    const detector = new FundingDetector()
    const signals = await detector.detectFundingForCompany(company_name, company_id)

    // Log API usage
    await supabase
      .from('api_audit_log')
      .insert({
        api_name: 'funding_detection',
        endpoint: '/api/funding-signals',
        method: 'POST',
        request_params: { company_name, company_id },
        response_status: 200,
        response_data: { signals_found: signals.length },
        user_id: user.id
      })

    return NextResponse.json({
      success: true,
      signals,
      count: signals.length
    })

  } catch (error) {
    console.error('[API] Funding detection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const signal_id = searchParams.get('id')

    if (!signal_id) {
      return NextResponse.json(
        { error: 'Signal ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('funding_signals')
      .delete()
      .eq('id', signal_id)

    if (error) {
      console.error('[API] Error deleting funding signal:', error)
      return NextResponse.json(
        { error: 'Failed to delete funding signal' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Funding signal deleted successfully'
    })

  } catch (error) {
    console.error('[API] Funding signal deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}