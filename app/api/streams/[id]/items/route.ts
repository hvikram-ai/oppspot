/**
 * Streams API - Item Management
 * GET  /api/streams/[id]/items - Get stream items
 * POST /api/streams/[id]/items - Create item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StreamService } from '@/lib/streams/stream-service'
import type { CreateStreamItemRequest, StreamItemFilters } from '@/types/streams'
import { getErrorMessage } from '@/lib/utils/error-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams

    const filters: StreamItemFilters = {
      item_type: searchParams.get('type') as any || undefined,
      status: searchParams.get('status') as any || undefined,
      stage_id: searchParams.get('stage') || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      priority: searchParams.get('priority') as any || undefined,
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined
    }

    const items = await StreamService.getItems(streamId, user.id, filters)

    return NextResponse.json(items)
  } catch (error: unknown) {
    console.error('Error fetching items:', error)

    if (getErrorMessage(error) === 'Access denied') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: streamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateStreamItemRequest = await request.json()

    // Validate required fields
    if (!body.item_type) {
      return NextResponse.json(
        { error: 'item_type is required' },
        { status: 400 }
      )
    }

    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    const item = await StreamService.createItem(streamId, user.id, body)

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating item:', error)

    if (getErrorMessage(error) === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    )
  }
}
