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
    const limit = searchParams.get('limit') || '10'

    if (!company_id) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      )
    }

    // Get peer comparisons
    const benchmarkingService = new BenchmarkingService()
    const peers = await benchmarkingService.getPeerComparisons(
      company_id,
      parseInt(limit)
    )

    return NextResponse.json({
      success: true,
      peers,
      count: peers.length
    })

  } catch (error) {
    console.error('[API] Peer comparison error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}