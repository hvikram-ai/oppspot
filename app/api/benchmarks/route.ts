import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BenchmarkingService } from '@/lib/benchmarking/benchmark-service'

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

    // Get existing benchmark comparison
    const { data: benchmark, error } = await supabase
      .from('company_benchmark_comparisons')
      .select('*')
      .eq('company_id', company_id)
      .order('comparison_date', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[API] Error fetching benchmark:', error)
      return NextResponse.json(
        { error: 'Failed to fetch benchmark data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      benchmark: benchmark || null
    })

  } catch (error) {
    console.error('[API] Benchmark fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}