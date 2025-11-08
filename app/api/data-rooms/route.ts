/**
 * Data Rooms API - List & Create
 * GET /api/data-rooms - List all accessible data rooms
 * POST /api/data-rooms - Create new data room
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateDataRoomRequest, DataRoom } from '@/lib/data-room/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Data Rooms API] User:', user.id, user.email)

    // Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    // Fetch data rooms with access info
    // Note: LEFT JOIN (no !inner) to include rooms user owns without explicit access records
    const { data: dataRooms, error } = await supabase
      .from('data_rooms')
      .select(`
        *,
        profiles!data_rooms_user_id_fkey(full_name, email),
        data_room_access(permission_level)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false }) as any as {
        data: Array<any & {
          user_id: string
          profiles?: { full_name?: string; email?: string }
          data_room_access?: Array<{ permission_level?: string }>
        }> | null
        error: { message: string } | null
      }

    console.log('[Data Rooms API] Raw query result:', {
      count: dataRooms?.length || 0,
      error: error?.message,
      sampleRoom: dataRooms?.[0] ? {
        id: dataRooms[0].id,
        name: dataRooms[0].name,
        user_id: dataRooms[0].user_id,
        status: dataRooms[0].status
      } : null
    })

    if (error) {
      console.error('[Data Rooms API] List error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to include access info
    const rooms = dataRooms?.map(room => ({
      ...room,
      owner_name: room.profiles?.full_name || 'Unknown',
      my_permission: room.data_room_access?.[0]?.permission_level ||
                     (room.user_id === user.id ? 'owner' : null)
    })) || []

    console.log('[Data Rooms API] Returning:', {
      count: rooms.length,
      userMatches: rooms.filter(r => r.user_id === user.id).length
    })

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
      // @ts-expect-error - data_rooms insert type mismatch
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
      .single() as { data: { id: string; name: string } & Record<string, unknown> | null; error: { message: string } | null }

    if (error) {
      console.error('[Data Rooms API] Create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    // @ts-expect-error - activity_logs insert type mismatch
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
