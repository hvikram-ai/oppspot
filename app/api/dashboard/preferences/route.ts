import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * GET /api/dashboard/preferences
 *
 * Fetches user's dashboard preferences
 * Creates default preferences if they don't exist
 */
export async function GET(_request: NextRequest) {
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

    // Fetch user preferences
    const { data: preferences, error: fetchError } = await supabase
      .from('dashboard_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If preferences don't exist, they should be auto-created by trigger
    // But if not, create them now
    if (fetchError && fetchError.code === 'PGRST116') {
      const { data: newPrefs, error: createError } = await supabase
        .from('dashboard_preferences')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          user_id: user.id
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating preferences:', createError)
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Failed to create preferences' },
          { status: 500 }
        )
      }

      return NextResponse.json(newPrefs, { status: 200 })
    }

    if (fetchError) {
      console.error('Error fetching preferences:', fetchError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json(preferences, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in GET /api/dashboard/preferences:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/dashboard/preferences
 *
 * Updates user's dashboard preferences
 */
export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()

    // Validate allowed fields
    const allowedFields = [
      'card_visibility',
      'card_order',
      'default_landing_page',
      'sidebar_collapsed',
      'metric_format',
      'time_period',
      'theme',
      'digest_frequency',
      'show_empty_state_tutorials'
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Validate enum fields
    if (updateData.metric_format && !['absolute', 'relative'].includes(updateData.metric_format)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid metric_format. Must be "absolute" or "relative"' },
        { status: 400 }
      )
    }

    if (updateData.time_period && !['day', 'week', 'month'].includes(updateData.time_period)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid time_period. Must be "day", "week", or "month"' },
        { status: 400 }
      )
    }

    if (updateData.theme && !['light', 'dark', 'system'].includes(updateData.theme)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid theme. Must be "light", "dark", or "system"' },
        { status: 400 }
      )
    }

    if (updateData.digest_frequency && !['daily', 'realtime', 'off'].includes(updateData.digest_frequency)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid digest_frequency. Must be "daily", "realtime", or "off"' },
        { status: 400 }
      )
    }

    // Update preferences
    const { data: updatedPrefs, error: updateError } = await supabase
      .from('dashboard_preferences')
      // @ts-expect-error - Type inference issue
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating preferences:', updateError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedPrefs, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in PUT /api/dashboard/preferences:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
