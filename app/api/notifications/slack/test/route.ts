/**
 * Slack Test Notification API
 *
 * Sends a test message to Slack to verify webhook configuration.
 *
 * @route POST /api/notifications/slack/test
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSlackNotifier } from '@/lib/notifications/slack-notifier'

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

    // 3. Send test message via SlackNotifier
    const slackNotifier = getSlackNotifier()
    const result = await slackNotifier.sendTestMessage()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test message',
        },
        { status: 500 }
      )
    }

    // 4. Return success
    return NextResponse.json({
      success: true,
      message: 'Test message sent to Slack successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Slack Test API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
