import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

/**
 * PATCH /api/dashboard/priority-queue/[id]
 *
 * Updates a queue item's status
 * Body: { status: 'in_progress' | 'completed' | 'dismissed' }
 */
export async function PATCH(
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

    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['in_progress', 'completed', 'dismissed']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid status. Must be "in_progress", "completed", or "dismissed"' },
        { status: 400 }
      )
    }

    // Update queue item
    const { data: item, error: updateError } = await supabase
      .from('priority_queue_items')
      // @ts-expect-error - Type inference issue
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this item
      .select()
      .single()

    if (updateError && updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Not Found', message: 'Queue item not found' },
        { status: 404 }
      )
    }

    if (updateError) {
      console.error('Error updating queue item:', updateError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update queue item' },
        { status: 500 }
      )
    }

    return NextResponse.json(item, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/dashboard/priority-queue/[id]:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/priority-queue/[id]
 *
 * Deletes a queue item
 */
export async function DELETE(
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

    // Delete queue item
    const { error: deleteError } = await supabase
      .from('priority_queue_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns this item

    if (deleteError) {
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not Found', message: 'Queue item not found' },
          { status: 404 }
        )
      }

      console.error('Error deleting queue item:', deleteError)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to delete queue item' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/dashboard/priority-queue/[id]:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
