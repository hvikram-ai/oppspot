/**
 * Collections API - Individual Item Operations
 * DELETE /api/collections/[id]/items/[itemId] - Remove item from collection
 * PATCH  /api/collections/[id]/items/[itemId] - Move item to different collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { moveItemSchema } from '@/lib/collections/validation'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: collectionId, itemId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has edit permission
    const { data: collection } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collectionId)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const isOwner = collection.user_id === user.id
    let canEdit = isOwner

    if (!isOwner) {
      const { data: access } = await supabase
        .from('collection_access')
        .select('permission_level')
        .eq('collection_id', collectionId)
        .eq('user_id', user.id)
        .single()

      canEdit = access?.permission_level === 'edit' || access?.permission_level === 'manage'
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Delete item
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', itemId)
      .eq('collection_id', collectionId)

    if (error) {
      console.error('Error removing item from collection:', error)
      return NextResponse.json(
        { error: 'Failed to remove item' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/collections/[id]/items/[itemId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: collectionId, itemId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validation = moveItemSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { target_collection_id } = validation.data

    // Check if user has edit permission on source collection
    const { data: sourceCollection } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collectionId)
      .single()

    if (!sourceCollection) {
      return NextResponse.json({ error: 'Source collection not found' }, { status: 404 })
    }

    // Check if user has edit permission on target collection
    const { data: targetCollection } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', target_collection_id)
      .single()

    if (!targetCollection) {
      return NextResponse.json({ error: 'Target collection not found' }, { status: 404 })
    }

    // Check permissions on both collections
    const canEditSource = sourceCollection.user_id === user.id
    const canEditTarget = targetCollection.user_id === user.id

    if (!canEditSource || !canEditTarget) {
      return NextResponse.json(
        { error: 'You must have edit permissions on both collections' },
        { status: 403 }
      )
    }

    // Get original item data
    const { data: item } = await supabase
      .from('collection_items')
      .select('item_type, item_id')
      .eq('id', itemId)
      .eq('collection_id', collectionId)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Move item (update collection_id and reset added_at to current time)
    const { data: updated, error } = await supabase
      .from('collection_items')
      .update({
        collection_id: target_collection_id,
        added_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      console.error('Error moving item:', error)
      return NextResponse.json(
        { error: 'Failed to move item' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error in PATCH /api/collections/[id]/items/[itemId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
