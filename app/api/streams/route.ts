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
    let { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    // If user doesn't have org_id, return empty streams
    if (!profile?.org_id) {
      return NextResponse.json({
        streams: [],
        total: 0,
        page: 1,
        limit: 20
      })
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
  console.log('POST /api/streams - Request received')
  try {
    const supabase = await createClient()
    console.log('POST /api/streams - Supabase client created')
    const { data: { user } } = await supabase.auth.getUser()
    console.log('POST /api/streams - User:', user?.id)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    let { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    // If user doesn't have org_id, create one
    if (!profile?.org_id) {
      const { data: newOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'My Organization',
          created_by: user.id
        })
        .select()
        .single()

      if (newOrg) {
        // Update profile with new org_id
        await supabase
          .from('profiles')
          .update({ org_id: newOrg.id })
          .eq('id', user.id)

        profile = { org_id: newOrg.id }
      } else {
        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
      }
    }

    const body: CreateStreamRequest = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Stream name is required' },
        { status: 400 }
      )
    }

    console.log('Creating stream with:', { userId: user.id, orgId: profile.org_id, body })
    const stream = await StreamService.createStream(user.id, profile.org_id, body)

    return NextResponse.json(stream, { status: 201 })
  } catch (error) {
    console.error('Error creating stream:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to create stream', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
