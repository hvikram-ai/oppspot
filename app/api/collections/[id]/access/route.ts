/**
 * Collections API - Access Management (Sharing)
 * GET  /api/collections/[id]/access - List access grants
 * POST /api/collections/[id]/access - Grant access to user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { grantAccessSchema } from '@/lib/collections/validation'

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

    // Check if user owns the collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('user_id')
      .eq('id', collectionId)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the owner can view access grants' },
        { status: 403 }
      )
    }

    // Get all access grants with user details
    const { data: grants, error } = await supabase
      .from('collection_access')
      .select(`
        *,
        profiles!user_id(id, full_name, email),
        granted_by_profile:profiles!granted_by(id, full_name)
      `)
      .eq('collection_id', collectionId)
      .order('granted_at', { ascending: false })

    if (error) {
      console.error('Error fetching access grants:', error)
      return NextResponse.json(
        { error: 'Failed to fetch access grants' },
        { status: 500 }
      )
    }

    // Format response
    const formatted = (grants || []).map((grant) => ({
      id: grant.id,
      collection_id: grant.collection_id,
      user_id: grant.user_id,
      user_email: grant.profiles?.email,
      user_name: grant.profiles?.full_name,
      permission_level: grant.permission_level,
      granted_by: grant.granted_by,
      granted_by_name: grant.granted_by_profile?.full_name,
      granted_at: grant.granted_at
    }))

    return NextResponse.json({ grants: formatted })
  } catch (error) {
    console.error('Error in GET /api/collections/[id]/access:', error)
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
    const validation = grantAccessSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { user_id, permission_level } = validation.data

    // Check if user owns the collection or has manage permission
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('user_id, is_system')
      .eq('id', collectionId)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const isOwner = collection.user_id === user.id
    let canManage = isOwner

    if (!isOwner) {
      const { data: access } = await supabase
        .from('collection_access')
        .select('permission_level')
        .eq('collection_id', collectionId)
        .eq('user_id', user.id)
        .single()

      canManage = access?.permission_level === 'manage'
    }

    if (!canManage) {
      return NextResponse.json(
        { error: 'Insufficient permissions to share this collection' },
        { status: 403 }
      )
    }

    // Cannot share system collections
    if (collection.is_system) {
      return NextResponse.json(
        { error: 'Cannot share system collections' },
        { status: 400 }
      )
    }

    // Check for duplicate grant
    const { data: existing } = await supabase
      .from('collection_access')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('user_id', user_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Access already granted to this user' },
        { status: 409 }
      )
    }

    // Create access grant
    const { data: grant, error: grantError } = await supabase
      .from('collection_access')
      .insert({
        collection_id: collectionId,
        user_id,
        permission_level,
        granted_by: user.id
      })
      .select()
      .single()

    if (grantError) {
      console.error('Error granting access:', grantError)
      return NextResponse.json(
        { error: 'Failed to grant access' },
        { status: 500 }
      )
    }

    return NextResponse.json(grant, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/collections/[id]/access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
