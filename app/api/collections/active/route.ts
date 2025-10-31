/**
 * Collections API - Active Collection Management
 * GET /api/collections/active - Get user's active collection
 * PUT /api/collections/active - Set active collection for session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setActiveStreamSchema } from '@/lib/collections/validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's active collection from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('active_collection_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch active collection' },
        { status: 500 }
      )
    }

    let activeCollection = null

    // If user has an active collection set, fetch it
    if (profile?.active_collection_id) {
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', profile.active_collection_id)
        .single()

      if (!collectionError && collection) {
        activeCollection = collection
      }
    }

    // If no active collection or it doesn't exist, default to "General" collection
    if (!activeCollection) {
      const { data: generalCollection } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_system', true)
        .eq('name', 'General')
        .single()

      activeCollection = generalCollection
    }

    if (!activeCollection) {
      return NextResponse.json(
        { error: 'No active collection found' },
        { status: 404 }
      )
    }

    return NextResponse.json(activeCollection)
  } catch (error) {
    console.error('Error in GET /api/collections/active:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validation = setActiveStreamSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { collection_id } = validation.data

    // Verify collection exists and user has access
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collection_id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Check if user owns the collection or has access
    const isOwner = collection.user_id === user.id
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: access } = await supabase
        .from('collection_access')
        .select('permission_level')
        .eq('collection_id', collection_id)
        .eq('user_id', user.id)
        .single()

      hasAccess = !!access
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this collection' },
        { status: 403 }
      )
    }

    // Update user's active collection
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ active_collection_id: collection_id })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating active collection:', updateError)
      return NextResponse.json(
        { error: 'Failed to set active collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, collection_id })
  } catch (error) {
    console.error('Error in PUT /api/collections/active:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
