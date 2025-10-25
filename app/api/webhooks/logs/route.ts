/**
 * Webhook Logs API
 *
 * Retrieve webhook delivery logs with filtering.
 *
 * @route GET /api/webhooks/logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWebhookNotifier } from '@/lib/notifications/webhook-notifier'

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

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const alertId = searchParams.get('alertId')

    // 4. Fetch webhook logs
    let query = supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100)) // Max 100 logs

    if (alertId) {
      query = query.eq('alert_id', alertId)
    }

    const { data: logs, error } = await query

    if (error) {
      throw new Error('Failed to fetch webhook logs')
    }

    // 5. Calculate statistics
    const totalLogs = logs?.length || 0
    const successCount = logs?.filter((log) => log.status_code && log.status_code < 400).length || 0
    const failureCount = totalLogs - successCount
    const successRate = totalLogs > 0 ? ((successCount / totalLogs) * 100).toFixed(1) : '0'

    // 6. Return logs with statistics
    return NextResponse.json({
      logs: logs || [],
      statistics: {
        total: totalLogs,
        successful: successCount,
        failed: failureCount,
        successRate: `${successRate}%`,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Webhook Logs API] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
