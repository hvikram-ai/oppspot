/**
 * Data Rooms API - List & Create
 * GET /api/data-rooms - List all accessible data rooms
 * POST /api/data-rooms - Create new data room
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateDataRoomRequest, DataRoom } from '@/lib/data-room/types'
import type { Row } from '@/lib/supabase/helpers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    // Fetch data rooms with access info
    const { data: dataRooms, error } = await supabase
      .from('data_rooms')
      .select(`
        *,
        profiles!data_rooms_user_id_fkey(name, email),
        data_room_access!inner(permission_level)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false }) as {
        data: Array<Row<'data_rooms'> & {
          user_id: string
          profiles?: { name?: string; email?: string }
          data_room_access?: Array<{ permission_level?: string }>
        }> | null
        error: any
      }

    if (error) {
      console.error('[Data Rooms API] List error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to include access info
    const rooms = dataRooms?.map(room => ({
      ...room,
      owner_name: room.profiles?.name || 'Unknown',
      my_permission: room.data_room_access?.[0]?.permission_level ||
                     (room.user_id === user.id ? 'owner' : null)
    })) || []

    return NextResponse.json({
      success: true,
      data: rooms,
      count: rooms.length
    })
  } catch (error) {
    console.error('[Data Rooms API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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

    // Parse request body
    const body: CreateDataRoomRequest = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Create data room
    const { data: dataRoom, error } = await supabase
      .from('data_rooms')
      // @ts-ignore - Supabase type inference issue
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        company_id: body.company_id || null,
        deal_type: body.deal_type || 'due_diligence',
        status: 'active',
        storage_used_bytes: 0,
        document_count: 0,
        metadata: body.metadata || {}
      })
      .select()
      .single() as { data: (Row<'data_rooms'> & { id: string; name: string }) | null; error: any }

    if (error) {
      console.error('[Data Rooms API] Create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // @ts-ignore - Supabase type inference issue
    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: dataRoom!.id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || user.email || 'Unknown',
      actor_email: user.email || '',
      action: 'create_room',
      details: { name: dataRoom!.name },
      ip_address: request.headers.get('x-forwarded-for') || '0.0.0.0',
      user_agent: request.headers.get('user-agent') || 'Unknown'
    })

    return NextResponse.json({
      success: true,
      data: dataRoom
    }, { status: 201 })
  } catch (error) {
    console.error('[Data Rooms API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
