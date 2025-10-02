/**
 * Data Room API - Get, Update, Delete
 * GET /api/data-rooms/[id] - Get single data room
 * PATCH /api/data-rooms/[id] - Update data room
 * DELETE /api/data-rooms/[id] - Delete data room
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateDataRoomRequest } from '@/lib/data-room/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Fetch data room with related data
    const { data: dataRoom, error } = await supabase
      .from('data_rooms')
      .select(`
        *,
        profiles!data_rooms_user_id_fkey(name, email),
        data_room_access(
          id,
          user_id,
          permission_level,
          invite_email,
          created_at,
          accepted_at,
          profiles!data_room_access_user_id_fkey(name, email)
        ),
        documents(count),
        activity_logs(
          id,
          action,
          actor_name,
          created_at,
          details
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[Data Room API] Get error:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Check if user has access
    const hasAccess = dataRoom.user_id === user.id ||
      dataRoom.data_room_access?.some((a: any) =>
        a.user_id === user.id && !a.revoked_at && new Date(a.expires_at) > new Date()
      )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...dataRoom,
        owner_name: dataRoom.profiles?.name || 'Unknown',
        my_permission: dataRoom.user_id === user.id ? 'owner' :
          dataRoom.data_room_access?.find((a: any) => a.user_id === user.id)?.permission_level
      }
    })
  } catch (error) {
    console.error('[Data Room API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body: UpdateDataRoomRequest = await request.json()

    // Check ownership
    const { data: existing } = await supabase
      .from('data_rooms')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update object
    const updates: any = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.description !== undefined) updates.description = body.description?.trim() || null
    if (body.deal_type !== undefined) updates.deal_type = body.deal_type
    if (body.status !== undefined) updates.status = body.status
    if (body.metadata !== undefined) updates.metadata = body.metadata

    // Update data room
    const { data: dataRoom, error } = await supabase
      .from('data_rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Data Room API] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || user.email || 'Unknown',
      actor_email: user.email || '',
      action: 'edit',
      details: { updates },
      ip_address: request.headers.get('x-forwarded-for') || '0.0.0.0',
      user_agent: request.headers.get('user-agent') || 'Unknown'
    })

    return NextResponse.json({
      success: true,
      data: dataRoom
    })
  } catch (error) {
    console.error('[Data Room API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check ownership
    const { data: existing } = await supabase
      .from('data_rooms')
      .select('user_id, name')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Soft delete
    const { error } = await supabase
      .from('data_rooms')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('[Data Room API] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      data_room_id: id,
      actor_id: user.id,
      actor_name: user.user_metadata?.name || user.email || 'Unknown',
      actor_email: user.email || '',
      action: 'delete_room',
      details: { name: existing.name },
      ip_address: request.headers.get('x-forwarded-for') || '0.0.0.0',
      user_agent: request.headers.get('user-agent') || 'Unknown'
    })

    return NextResponse.json({
      success: true,
      message: 'Data room deleted'
    })
  } catch (error) {
    console.error('[Data Room API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
