import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * POST /api/dashboard/interactions
 *
 * Tracks user interaction with a feature
 * Body: {
 *   feature_name: string,
 *   interaction_type: 'view' | 'click' | 'complete' | 'dismiss' | 'share',
 *   context?: object,
 *   session_id?: string,
 *   page_url?: string,
 *   referrer_url?: string
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

    // Validate required fields
    if (!body.feature_name || !body.interaction_type) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'feature_name and interaction_type are required' },
        { status: 400 }
      )
    }

    // Validate interaction_type enum
    const validTypes = ['view', 'click', 'complete', 'dismiss', 'share']
    if (!validTypes.includes(body.interaction_type)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid interaction_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Insert interaction record
    const { data: interaction, error: insertError } = await supabase
      .from('feature_interactions')
      // @ts-ignore - Supabase type inference issue
      .insert({
        user_id: user.id,
        feature_name: body.feature_name,
        interaction_type: body.interaction_type,
        context: body.context || null,
        session_id: body.session_id || null,
        page_url: body.page_url || null,
        referrer_url: body.referrer_url || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error tracking interaction:', insertError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to track interaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, interaction }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/dashboard/interactions:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
