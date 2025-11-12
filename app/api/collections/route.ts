/**
 * Collections API - List and Create
 * GET  /api/collections - List user's collections
 * POST /api/collections - Create new collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createStreamSchema } from '@/lib/collections/validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const includeArchived = searchParams.get('include_archived') === 'true'

    // Get owned collections
    let ownedQuery = supabase
      .from('collections')
      .select('*, collection_items(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!includeArchived) {
      ownedQuery = ownedQuery.is('archived_at', null)
    }

    const { data: owned, error: ownedError } = await ownedQuery

    if (ownedError) {
      console.error('Error fetching owned collections:', {
        message: ownedError.message,
        code: ownedError.code,
        details: ownedError.details,
        hint: ownedError.hint
      })
      return NextResponse.json({ error: 'Failed to fetch collections', details: ownedError.message }, { status: 500 })
    }

    // Get shared collections
    const { data: sharedAccess, error: sharedError } = await supabase
      .from('collection_members')
      .select(`
        role,
        collections!inner (
          id,
          name,
          is_system,
          archived_at,
          created_at,
          updated_at,
          user_id,
          collection_items(count)
        )
      `)
      .eq('user_id', user.id)

    if (sharedError) {
      console.error('Error fetching shared collections:', sharedError)
    }

    // Format owned collections with item count
    const ownedFormatted = (owned || []).map((col) => ({
      ...col,
      item_count: col.collection_items?.[0]?.count || 0
    }))

    // Format shared collections
    const sharedFormatted = (sharedAccess || []).map((access) => ({
      ...access.collections,
      role: access.role,
      item_count: access.collections.collection_items?.[0]?.count || 0
    }))

    return NextResponse.json({
      owned: ownedFormatted,
      shared: sharedFormatted
    })
  } catch (error) {
    console.error('Error in GET /api/collections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const body = await request.json()

    // Validate request body
    const validation = createStreamSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { name } = validation.data

    // Create collection
    const { data: collection, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name,
        is_system: false,
        archived_at: null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating collection:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        full: JSON.stringify(error, null, 2)
      })
      return NextResponse.json(
        { error: 'Failed to create collection', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(collection, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/collections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
