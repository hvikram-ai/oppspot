import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single()
    
    if (!business) {
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
      
      if (unfollowError) throw unfollowError
      
      // Log event
      await supabase.from('events').insert({
        user_id: user.id,
        event_type: 'business_unfollowed',
        event_data: {
          business_id: businessId,
          business_name: business.name
        }
      } as any)
      
      return NextResponse.json({
        following: false,
        message: `Unfollowed ${business.name}`
      })
    } else {
      // Follow the business
      const { error: followError } = await supabase
        .from('business_followers')
        .upsert({
          business_id: businessId,
          user_id: user.id,
          notification_preference: notificationPreference
        }, {
          onConflict: 'business_id,user_id'
        })
      
      if (followError) throw followError
      
      // Log event
      await supabase.from('events').insert({
        user_id: user.id,
        event_type: 'business_followed',
        event_data: {
          business_id: businessId,
          business_name: business.name,
          notification_preference: notificationPreference
        }
      } as any)
      
      return NextResponse.json({
        following: true,
        message: `Following ${business.name}`,
        notification_preference: notificationPreference
      })
    }
    
  } catch (error) {
    console.error('Follow/unfollow error:', error)
    return NextResponse.json(
      { error: 'Failed to update follow status' },
      { status: 500 }
    )
  }
}

// GET: Get user's followed businesses or check follow status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    if (businessId) {
      // Check if user follows a specific business
      const { data: follow } = await supabase
        .from('business_followers')
        .select('notification_preference, created_at')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .single()
      
      // Get follower count for the business
      const { count: followerCount } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
      
      return NextResponse.json({
        following: !!follow,
        notification_preference: follow?.notification_preference || null,
        followed_at: follow?.created_at || null,
        follower_count: followerCount || 0
      })
    } else {
      // Get all businesses the user follows
      const { data: follows, error, count } = await supabase
        .from('business_followers')
        .select(`
          *,
          business:businesses!business_id (
            id,
            name,
            description,
            categories,
            rating,
            verified
          )
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (error) throw error
      
      // Get recent updates count for each followed business
      const businessIds = follows?.map(f => f.business_id) || []
      const recentUpdates: Record<string, number> = {}
      
      if (businessIds.length > 0) {
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        
        const { data: updateCounts } = await supabase
          .from('business_updates')
          .select('business_id')
          .in('business_id', businessIds)
          .gte('published_at', oneWeekAgo.toISOString())
        
        // Count updates per business
        updateCounts?.forEach(update => {
          recentUpdates[update.business_id] = (recentUpdates[update.business_id] || 0) + 1
        })
      }
      
      // Combine follows with recent update counts
      const followsWithUpdates = follows?.map(follow => ({
        ...follow,
        recent_updates_count: recentUpdates[follow.business_id] || 0
      }))
      
      return NextResponse.json({
        follows: followsWithUpdates || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (follows?.length || 0) === limit
        }
      })
    }
    
  } catch (error) {
    console.error('Error fetching follows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch follow information' },
      { status: 500 }
    )
  }
}

// PATCH: Update notification preferences for a followed business
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { businessId, notificationPreference } = body
    
    if (!businessId || !notificationPreference) {
      return NextResponse.json(
        { error: 'Business ID and notification preference are required' },
        { status: 400 }
      )
    }
    
    // Update notification preference
    const { error: updateError } = await supabase
      .from('business_followers')
      .update({ notification_preference: notificationPreference })
      .eq('business_id', businessId)
      .eq('user_id', user.id)
    
    if (updateError) throw updateError
    
    return NextResponse.json({
      message: 'Notification preference updated',
      notification_preference: notificationPreference
    })
    
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preference' },
      { status: 500 }
    )
  }
}