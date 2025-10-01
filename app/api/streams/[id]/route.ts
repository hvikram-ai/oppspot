/**
 * Streams API - Individual Stream Operations
 * GET    /api/streams/[id] - Get stream details
 * PATCH  /api/streams/[id] - Update stream
 * DELETE /api/streams/[id] - Delete stream
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StreamService } from '@/lib/streams/stream-service'
import type { UpdateStreamRequest } from '@/types/streams'

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

    const result = await StreamService.getStreamDetail(id, user.id)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching stream:', error)

    if (error.message === 'Access denied') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch stream' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const body: UpdateStreamRequest = await request.json()

    const stream = await StreamService.updateStream(id, user.id, body)

    return NextResponse.json(stream)
  } catch (error: any) {
    console.error('Error updating stream:', error)

    if (error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update stream' },
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

    // Check if archive or delete
    const searchParams = request.nextUrl.searchParams
    const archive = searchParams.get('archive') === 'true'

    if (archive) {
      await StreamService.archiveStream(id, user.id)
    } else {
      await StreamService.deleteStream(id, user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting stream:', error)

    if (error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Only owners can delete streams' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete stream' },
      { status: 500 }
    )
  }
}
