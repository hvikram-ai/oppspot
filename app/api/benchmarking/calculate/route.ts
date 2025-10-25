import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { benchmarkEngine } from '@/lib/benchmarking/core/benchmark-engine'
import type { CalculateBenchmarksRequest } from '@/lib/benchmarking/types/benchmarking'

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

    const body: CalculateBenchmarksRequest = await request.json()

    // Validate request
    if (!body.company_id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    console.log('[API] Calculating benchmarks for:', body.company_id)

    // Calculate benchmarks
    const result = await benchmarkEngine.calculateBenchmarks(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to calculate benchmarks' },
        { status: 500 }
      )
    }

    // Log API usage
    await supabase
      .from('api_audit_log')
      .insert({
        api_name: 'benchmarking',
        endpoint: '/api/benchmarking/calculate',
        request_params: {
          company_id: body.company_id,
          comparison_type: body.comparison_type,
          include_ai_insights: body.include_ai_insights
        },
        response_status: 200,
        response_data: {
          overall_score: result.comparison?.overall_score,
          percentile_rank: result.comparison?.percentile_rank,
          cached: result.cached
        },
        user_id: user.id
      })

    return NextResponse.json(result)

  } catch (error) {
    console.error('[API] Benchmarking error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
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
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Fetch latest benchmark comparison
    const { data: comparison, error } = await supabase
      .from('benchmark_comparisons')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !comparison) {
      return NextResponse.json(
        { error: 'No benchmark data found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      comparison,
      cached: true
    })

  } catch (error) {
    console.error('[API] Get benchmarks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}