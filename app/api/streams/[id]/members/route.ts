/**
 * Streams API - Member Management
 * POST   /api/streams/[id]/members - Add member
 * DELETE /api/streams/[id]/members/[memberId] - Remove member (handled in [memberId]/route.ts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StreamService } from '@/lib/streams/stream-service'
import type { AddStreamMemberRequest } from '@/types/streams'
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

    const body: AddStreamMemberRequest = await request.json()

    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    if (!body.role) {
      return NextResponse.json(
        { error: 'role is required' },
        { status: 400 }
      )
    }

    const member = await StreamService.addMember(streamId, user.id, body)

    return NextResponse.json(member, { status: 201 })
  } catch (error: unknown) {
    console.error('Error adding member:', error)

    if (getErrorMessage(error) === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    )
  }
}
