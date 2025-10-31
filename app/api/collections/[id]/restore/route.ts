/**
 * Collections API - Restore Archived Collection
 * POST /api/collections/[id]/restore - Restore an archived collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get collection to check ownership and if it's archived
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('user_id, archived_at')
      .eq('id', id)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Only owner can restore
    if (collection.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the owner can restore this collection' },
        { status: 403 }
      )
    }

    // Check if already active
    if (!collection.archived_at) {
      return NextResponse.json(
        { error: 'Collection is already active' },
        { status: 400 }
      )
    }

    // Restore collection
    const { data: restored, error: restoreError } = await supabase
      .from('collections')
      .update({
        archived_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (restoreError) {
      console.error('Error restoring collection:', restoreError)
      return NextResponse.json(
        { error: 'Failed to restore collection' },
        { status: 500 }
      )
    }

    return NextResponse.json(restored)
  } catch (error) {
    console.error('Error in POST /api/collections/[id]/restore:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
