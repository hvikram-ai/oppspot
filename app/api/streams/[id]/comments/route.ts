/**
 * Streams API - Comments
 * POST /api/streams/[id]/comments - Add comment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StreamService } from '@/lib/streams/stream-service'
import type { CreateStreamCommentRequest } from '@/types/streams'
import { getErrorMessage } from '@/lib/utils/error-handler'

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

    const body: CreateStreamCommentRequest = await request.json()

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    const comment = await StreamService.addComment(streamId, user.id, body)

    return NextResponse.json(comment, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating comment:', error)

    if (getErrorMessage(error) === 'Access denied') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
