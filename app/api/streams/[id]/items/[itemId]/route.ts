/**
 * Streams API - Individual Item Operations
 * PATCH  /api/streams/[id]/items/[itemId] - Update item
 * DELETE /api/streams/[id]/items/[itemId] - Delete item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StreamService } from '@/lib/streams/stream-service'
import type { UpdateStreamItemRequest } from '@/types/streams'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateStreamItemRequest = await request.json()

    const item = await StreamService.updateItem(itemId, user.id, body)

    return NextResponse.json(item)
  } catch (error: any) {
    console.error('Error updating item:', error)

    if (error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    if (error.message === 'Item not found') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await StreamService.deleteItem(itemId, user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting item:', error)

    if (error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    if (error.message === 'Item not found') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}
