/**
 * Collections API - Individual Collection Operations
 * GET    /api/collections/[id] - Get collection details
 * PUT    /api/collections/[id] - Update collection
 * DELETE /api/collections/[id] - Archive collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateStreamSchema } from '@/lib/collections/validation'

export async function GET(
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

    // Get collection with item count
    const { data: collection, error } = await supabase
      .from('collections')
      .select('*, collection_items(count)')
      .eq('id', id)
      .single()

    if (error || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check access: owner or has shared access
    const isOwner = collection.user_id === user.id
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: access } = await supabase
        .from('collection_access')
        .select('permission_level')
        .eq('collection_id', id)
        .eq('user_id', user.id)
        .single()

      hasAccess = !!access
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Format response
    const formatted = {
      ...collection,
      item_count: collection.collection_items?.[0]?.count || 0
    }
    delete formatted.collection_items

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Error in GET /api/collections/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const body = await request.json()

    // Validate request body
    const validation = updateStreamSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Get collection to check ownership and if it's a system collection
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('user_id, is_system')
      .eq('id', id)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Only owner can update
    if (collection.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the owner can update this collection' },
        { status: 403 }
      )
    }

    // Cannot rename system collections
    if (collection.is_system && validation.data.name) {
      return NextResponse.json(
        { error: 'Cannot rename system collections' },
        { status: 400 }
      )
    }

    // Update collection
    const { data: updated, error: updateError } = await supabase
      .from('collections')
      .update({
        name: validation.data.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating collection:', updateError)
      return NextResponse.json(
        { error: 'Failed to update collection' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error in PUT /api/collections/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Get collection to check ownership and if it's a system collection
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('user_id, is_system')
      .eq('id', id)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Only owner can delete
    if (collection.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the owner can delete this collection' },
        { status: 403 }
      )
    }

    // Cannot delete system collections
    if (collection.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system collections' },
        { status: 400 }
      )
    }

    // Archive collection (soft delete)
    const { error: deleteError } = await supabase
      .from('collections')
      .update({
        archived_at: new Date().toISOString()
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Error archiving collection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to archive collection' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/collections/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
