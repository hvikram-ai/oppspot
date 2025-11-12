/**
 * Alert Statistics API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AlertService } from '@/lib/alerts/alert-service'

interface ProfileRole {
  role?: string;
}

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
export async function GET(request: NextRequest) {
  try {
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

    if (!profile || !['admin', 'super_admin'].includes((profile as ProfileRole)?.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get time window parameter
    const { searchParams } = new URL(request.url)
    const timeWindow = (searchParams.get('window') || '24h') as '1h' | '24h' | '7d'

    // Get stats
    const alertService = new AlertService()
    const stats = await alertService.getAlertStats(timeWindow)

    return NextResponse.json({ stats, timeWindow })
  } catch (error) {
    console.error('[Alert Stats API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
