/**
 * Collections API - Item Management
 * GET  /api/collections/[id]/items - List items in collection
 * POST /api/collections/[id]/items - Add item to collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addStreamItemSchema } from '@/lib/collections/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this collection
    const { data: collection } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collectionId)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const isOwner = collection.user_id === user.id
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: access } = await supabase
        .from('collection_access')
        .select('permission_level')
        .eq('collection_id', collectionId)
        .eq('user_id', user.id)
        .single()

      hasAccess = !!access
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get items ordered by added_at DESC (newest first)
    const { data: items, error, count } = await supabase
      .from('collection_items')
      .select('*, profiles!added_by(id, full_name, email)', { count: 'exact' })
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching collection items:', error)
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      )
    }

    // Format response
    const formattedItems = (items || []).map((item) => ({
      ...item,
      added_by_name: item.profiles?.full_name,
      added_by_email: item.profiles?.email
    }))

    return NextResponse.json({
      items: formattedItems,
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit
    })
  } catch (error) {
    console.error('Error in GET /api/collections/[id]/items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validation = addStreamItemSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { item_type, item_id } = validation.data

    // Check if user has edit permission
    const { data: collection } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collectionId)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const isOwner = collection.user_id === user.id
    let canEdit = isOwner

    if (!isOwner) {
      const { data: access } = await supabase
        .from('collection_access')
        .select('permission_level')
        .eq('collection_id', collectionId)
        .eq('user_id', user.id)
        .single()

      canEdit = access?.permission_level === 'edit' || access?.permission_level === 'manage'
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Add item to collection
    const { data: item, error } = await supabase
      .from('collection_items')
      .insert({
        collection_id: collectionId,
        item_type,
        item_id,
        added_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding item to collection:', error)
      return NextResponse.json(
        { error: 'Failed to add item' },
        { status: 500 }
      )
    }

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/collections/[id]/items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
