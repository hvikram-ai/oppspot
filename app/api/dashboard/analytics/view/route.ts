import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * POST /api/dashboard/analytics/view
 *
 * Tracks dashboard page view with performance metrics
 * Body: {
 *   session_id?: string,
 *   device_type: 'mobile' | 'tablet' | 'desktop',
 *   browser?: string,
 *   viewport_width?: number,
 *   viewport_height?: number,
 *   time_to_first_byte_ms?: number,
 *   first_contentful_paint_ms?: number,
 *   time_to_interactive_ms?: number,
 *   largest_contentful_paint_ms?: number,
 *   cumulative_layout_shift?: number,
 *   time_on_page_seconds?: number,
 *   scroll_depth_percent?: number,
 *   interactions_count?: number,
 *   referrer_source?: string,
 *   utm_campaign?: string,
 *   utm_source?: string,
 *   utm_medium?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required field
    if (!body.device_type) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'device_type is required' },
        { status: 400 }
      )
    }

    // Validate device_type enum
    const validDeviceTypes = ['mobile', 'tablet', 'desktop']
    if (!validDeviceTypes.includes(body.device_type)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid device_type. Must be one of: ${validDeviceTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate scroll_depth_percent range
    if (body.scroll_depth_percent !== undefined) {
      const scrollDepth = parseInt(body.scroll_depth_percent)
      if (scrollDepth < 0 || scrollDepth > 100) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'scroll_depth_percent must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    // Insert page view record
    const { data: pageView, error: insertError } = await supabase
      .from('dashboard_views')
      // @ts-ignore - Supabase type inference issue
      .insert({
        user_id: user.id,
        session_id: body.session_id || null,
        device_type: body.device_type,
        browser: body.browser || null,
        viewport_width: body.viewport_width || null,
        viewport_height: body.viewport_height || null,
        time_to_first_byte_ms: body.time_to_first_byte_ms || null,
        first_contentful_paint_ms: body.first_contentful_paint_ms || null,
        time_to_interactive_ms: body.time_to_interactive_ms || null,
        largest_contentful_paint_ms: body.largest_contentful_paint_ms || null,
        cumulative_layout_shift: body.cumulative_layout_shift || null,
        time_on_page_seconds: body.time_on_page_seconds || null,
        scroll_depth_percent: body.scroll_depth_percent || null,
        interactions_count: body.interactions_count || 0,
        referrer_source: body.referrer_source || null,
        utm_campaign: body.utm_campaign || null,
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error tracking page view:', insertError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to track page view' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, page_view: pageView }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/dashboard/analytics/view:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
