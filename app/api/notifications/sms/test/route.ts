/**
 * SMS Test Notification API
 *
 * Sends a test SMS to verify Twilio configuration.
 *
 * @route POST /api/notifications/sms/test
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSmsNotifier } from '@/lib/notifications/sms-notifier'

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

    // 3. Parse request body (optional credentials for testing)
    const body = await request.json()
    const { to, accountSid, authToken, fromNumber } = body

    // 4. Send test SMS via SmsNotifier
    const smsNotifier = getSmsNotifier()
    const result = await smsNotifier.sendTestMessage(to, accountSid, authToken, fromNumber)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test SMS',
        },
        { status: 500 }
      )
    }

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: 'Test SMS sent successfully',
      messageSid: result.messageSid,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[SMS Test API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
