/**
 * Streams API - List and Create
 * GET  /api/streams - List streams
 * POST /api/streams - Create stream
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StreamService } from '@/lib/streams/stream-service'
import type { CreateStreamRequest, StreamFilters } from '@/types/streams'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const filters: StreamFilters = {
      stream_type: searchParams.get('type') as any || undefined,
      status: searchParams.get('status') as any || undefined,
      search: searchParams.get('search') || undefined,
      created_by: searchParams.get('created_by') || undefined
    }

    const result = await StreamService.getStreams(user.id, filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching streams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch streams' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body: CreateStreamRequest = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Stream name is required' },
        { status: 400 }
      )
    }

    const stream = await StreamService.createStream(user.id, profile.org_id, body)

    return NextResponse.json(stream, { status: 201 })
  } catch (error) {
    console.error('Error creating stream:', error)
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    )
  }
}
