import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * POST /api/dashboard/digest/[id]/read
 *
 * Marks a digest as read
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Update read_at timestamp
    const { data: digest, error: updateError } = await supabase
      .from('ai_digest')
      // @ts-ignore - Type inference issue
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this digest
      .select()
      .single()

    if (updateError && updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Not Found', message: 'Digest not found' },
        { status: 404 }
      )
    }

    if (updateError) {
      console.error('Error marking digest as read:', updateError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to mark digest as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, digest }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in POST /api/dashboard/digest/[id]/read:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
