/**
 * Acknowledge Alert API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AlertService } from '@/lib/alerts/alert-service'

/**
 * POST /api/alerts/[id]/acknowledge
 * Acknowledge an alert
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { notes } = body

    // Acknowledge the alert
    const alertService = new AlertService()
    const success = await alertService.acknowledgeAlert(params.id, user.id, notes)

    if (!success) {
      return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Acknowledge Alert API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
