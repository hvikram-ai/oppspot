/**
 * Webhook Test API
 *
 * Tests webhook connection and configuration.
 *
 * @route POST /api/webhooks/test
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWebhookNotifier } from '@/lib/notifications/webhook-notifier'

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

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 3. Parse request body (optional URL and secret for testing)
    const body = await request.json()
    const { url, secret } = body

    // 4. Test webhook connection
    const webhookNotifier = getWebhookNotifier()
    const result = await webhookNotifier.sendTestMessage(url, secret)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test message',
          statusCode: result.statusCode,
          responseTime: result.responseTime,
        },
        { status: result.statusCode || 500 }
      )
    }

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: 'Test message sent to webhook successfully',
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Webhook Test API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
