import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { industryComparisonEngine } from '@/lib/benchmarking/industry/industry-comparison'

interface Params {
  params: Promise<{
    code: string
  }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient()
    const { code } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Industry code is required' },
        { status: 400 }
      )
    }

    console.log('[API] Analyzing industry:', code)

    // Get industry analysis
    const analysis = await industryComparisonEngine.analyzeIndustry(code)

    // Get industry benchmarks
    const { data: benchmarks, error: benchmarksError } = await supabase
      .from('industry_benchmarks')
      .select('*')
      .eq('industry_code', code)
      .order('metric_date', { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      analysis,
      benchmarks: benchmarks || []
    })

  } catch (error) {
    console.error('[API] Industry analysis error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}