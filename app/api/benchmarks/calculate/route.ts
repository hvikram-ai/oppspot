import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BenchmarkingService } from '@/lib/benchmarking/benchmark-service'

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

    // Calculate benchmarks
    const benchmarkingService = new BenchmarkingService()
    const benchmark = await benchmarkingService.calculateBenchmarks(company_id)

    // Log API usage
    await supabase
      .from('api_audit_log')
      .insert({
        api_name: 'benchmark_calculation',
        endpoint: '/api/benchmarks/calculate',
        method: 'POST',
        request_params: { company_id },
        response_status: 200,
        response_data: {
          overall_percentile: benchmark.overall_percentile,
          performance_rating: benchmark.performance_rating
        },
        user_id: user.id
      })

    return NextResponse.json({
      success: true,
      benchmark
    })

  } catch (error) {
    console.error('[API] Benchmark calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}