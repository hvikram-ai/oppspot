/**
 * Collections API - Individual Access Grant Management
 * DELETE /api/collections/[id]/access/[accessId] - Revoke access
 * PATCH  /api/collections/[id]/access/[accessId] - Update permission level
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updatePermissionSchema } from '@/lib/collections/validation'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accessId: string }> }
) {
  try {
    const { id: collectionId, accessId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user owns the collection or has manage permission
    const { data: collection } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collectionId)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const isOwner = collection.user_id === user.id
    let canManage = isOwner

    if (!isOwner) {
      const { data: access } = await supabase
        .from('collection_access')
        .select('permission_level')
        .eq('collection_id', collectionId)
        .eq('user_id', user.id)
        .single()

      canManage = access?.permission_level === 'manage'
    }

    if (!canManage) {
      return NextResponse.json(
        { error: 'Insufficient permissions to revoke access' },
        { status: 403 }
      )
    }

    // Delete access grant
    const { error } = await supabase
      .from('collection_access')
      .delete()
      .eq('id', accessId)
      .eq('collection_id', collectionId)

    if (error) {
      console.error('Error revoking access:', error)
      return NextResponse.json(
        { error: 'Failed to revoke access' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/collections/[id]/access/[accessId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accessId: string }> }
) {
  try {
    const { id: collectionId, accessId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validation = updatePermissionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { permission_level } = validation.data

    // Check if user owns the collection or has manage permission
    const { data: collection } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collectionId)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const isOwner = collection.user_id === user.id
    let canManage = isOwner

    if (!isOwner) {
      const { data: access } = await supabase
        .from('collection_access')
        .select('permission_level')
        .eq('collection_id', collectionId)
        .eq('user_id', user.id)
        .single()

      canManage = access?.permission_level === 'manage'
    }

    if (!canManage) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update access' },
        { status: 403 }
      )
    }

    // Update permission level
    const { data: updated, error } = await supabase
      .from('collection_access')
      .update({ permission_level })
      .eq('id', accessId)
      .eq('collection_id', collectionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating permission:', error)
      return NextResponse.json(
        { error: 'Failed to update permission' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error in PATCH /api/collections/[id]/access/[accessId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
