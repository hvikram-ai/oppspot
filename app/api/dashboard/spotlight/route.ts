import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * GET /api/dashboard/spotlight
 *
 * Fetches personalized feature spotlight items for the user
 * Query params:
 * - limit: number (default: 3, max: 5)
 */
export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '3'), 5)

    // Use the database function to get personalized spotlight items
    const { data: spotlightItems, error: fetchError } = await supabase
      // @ts-ignore - Type inference issue
      .rpc('get_user_spotlight_items', {
        p_user_id: user.id,
        p_limit: limit
      })

    if (fetchError) {
      console.error('Error fetching spotlight items:', fetchError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch spotlight items' },
        { status: 500 }
      )
    }

    return NextResponse.json(spotlightItems || [], { status: 200 })
  } catch (error) {
    console.error('Unexpected error in GET /api/dashboard/spotlight:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
