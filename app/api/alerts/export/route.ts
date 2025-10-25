/**
 * Alert Export API
 *
 * Export alerts to CSV or JSON formats with filtering support.
 *
 * @route GET /api/alerts/export
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAlertExportService } from '@/lib/alerts/export-service'

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get('format') || 'json') as 'csv' | 'json'
    const includeContext = searchParams.get('includeContext') === 'true'
    const includeErrorStack = searchParams.get('includeErrorStack') === 'true'

    // Parse filters
    const severityParam = searchParams.get('severity')
    const statusParam = searchParams.get('status')
    const categoryParam = searchParams.get('category')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const filters = {
      severity: severityParam ? severityParam.split(',') : undefined,
      status: statusParam ? statusParam.split(',') : undefined,
      category: categoryParam ? categoryParam.split(',') : undefined,
      startDate: startDateParam ? new Date(startDateParam) : undefined,
      endDate: endDateParam ? new Date(endDateParam) : undefined,
    }

    // 4. Export alerts
    const exportService = getAlertExportService()
    const result = await exportService.export({
      format,
      filters,
      includeContext,
      includeErrorStack,
    })

    // 5. Return file with appropriate headers
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[Export API] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * Get export statistics
 *
 * @route POST /api/alerts/export (with action=stats)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 3. Parse request body
    const body = await request.json()
    const { filters } = body

    // 4. Get export statistics
    const exportService = getAlertExportService()
    const stats = await exportService.getExportStats(filters)

    // 5. Return statistics
    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('[Export Stats API] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
