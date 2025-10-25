/**
 * Alerts API Endpoint
 * Manage system alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AlertService } from '@/lib/alerts/alert-service'

/**
 * GET /api/alerts
 * Get all alerts with optional filtering
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

    if (!profile || !['admin', 'super_admin'].includes((profile as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Alerts API] Query failed:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json({ alerts: data || [] })
  } catch (error) {
    console.error('[Alerts API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
