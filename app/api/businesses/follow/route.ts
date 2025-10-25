import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

// Type definitions for database operations
type BusinessRow = Database['public']['Tables']['businesses']['Row']
type BusinessFollowerRow = Database['public']['Tables']['business_followers']['Row']
type BusinessFollowerInsert = Database['public']['Tables']['business_followers']['Insert']
type BusinessFollowerUpdate = Database['public']['Tables']['business_followers']['Update']

// Business update type (table may not exist in current schema)
interface BusinessUpdate {
  business_id: string
  [key: string]: unknown
}

// Extended type for business follower with joined business data
interface BusinessFollowerWithBusiness extends BusinessFollowerRow {
  business: BusinessRow
}

// POST: Follow or unfollow a business
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, action = 'follow', notificationPreference = 'all' } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Check if business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (action === 'unfollow') {
      // Unfollow the business
      const { error: unfollowError } = await supabase
        .from('business_followers')
        .delete()
        .eq('business_id', businessId)
        .eq('user_id', user.id)

      if (unfollowError) {
        console.error('Error unfollowing business:', unfollowError)
        return NextResponse.json(
          { error: 'Failed to unfollow business' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully unfollowed business'
      })
    }

    // Follow the business (default action)
    // Check if already following
    const { data: existingFollow, error: checkError } = await supabase
      .from('business_followers')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single()

    if (existingFollow) {
      return NextResponse.json({
        success: true,
        message: 'Already following this business',
        isFollowing: true
      })
    }

    // Create new follow
    const followData: BusinessFollowerInsert = {
      business_id: businessId,
      user_id: user.id,
      notification_preference: notificationPreference
    }

    const { error: followError } = await supabase
      .from('business_followers')
      .insert(followData)

    if (followError) {
      console.error('Error following business:', followError)
      return NextResponse.json(
        { error: 'Failed to follow business' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully followed business',
      isFollowing: true
    })

  } catch (error) {
    console.error('Error in follow route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: Get followed businesses for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const includeUpdates = searchParams.get('includeUpdates') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const query = supabase
      .from('business_followers')
      .select(`
        *,
        business:businesses (
          id,
          name,
          description,
          categories,
          rating,
          verified
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: follows, error: followsError } = await query

    if (followsError) {
      console.error('Error fetching followed businesses:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch followed businesses' },
        { status: 500 }
      )
    }

    // If requested, fetch recent updates for followed businesses
    let updates: BusinessUpdate[] = []
    if (includeUpdates && follows && follows.length > 0) {
      const businessIds = follows
        .map((f: BusinessFollowerWithBusiness) => f.business?.id)
        .filter(Boolean)

      if (businessIds.length > 0) {
        const { data: updatesData, error: updatesError } = await supabase
          .from('business_updates')
          .select('*')
          .in('business_id', businessIds)
          .order('published_at', { ascending: false })
          .limit(20)

        if (!updatesError && updatesData) {
          updates = updatesData as BusinessUpdate[]
        }
      }
    }

    return NextResponse.json({
      success: true,
      follows: follows || [],
      updates: includeUpdates ? updates : undefined,
      pagination: {
        limit,
        offset,
        total: follows?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET follow route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Unfollow a business (alternative to POST with action=unfollow)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    const { error: unfollowError } = await supabase
      .from('business_followers')
      .delete()
      .eq('business_id', businessId)
      .eq('user_id', user.id)

    if (unfollowError) {
      console.error('Error unfollowing business:', unfollowError)
      return NextResponse.json(
        { error: 'Failed to unfollow business' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed business'
    })

  } catch (error) {
    console.error('Error in DELETE follow route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
