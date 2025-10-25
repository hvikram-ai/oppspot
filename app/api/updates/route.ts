import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Type definitions for updates
interface BusinessUpdate {
  id: string;
  business_id: string;
  title: string;
  content: string;
  type?: string;
  category?: string;
  tags?: string[];
  image_url?: string | null;
  link_url?: string | null;
  link_title?: string | null;
  published_at: string;
  expires_at?: string | null;
  is_featured?: boolean;
  is_verified?: boolean;
  created_by: string;
  verified_by?: string | null;
  created_at?: string;
  updated_at?: string;
  has_liked?: boolean;
  has_viewed?: boolean;
  business?: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
}

interface UpdateInteraction {
  update_id: string;
  interaction_type: string;
}

// GET: Fetch business updates feed
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    
    // Get parameters
    const feedType = searchParams.get('type') || 'all' // all, following, business
    const businessId = searchParams.get('businessId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    // Check authentication for personalized feeds
    const { data: { user } } = await supabase.auth.getUser()

    let updates: BusinessUpdate[] = []
    let totalCount = 0
    
    switch (feedType) {
      case 'following':
        // Get updates from followed businesses
        if (!user) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
        
        const { data: followingFeed, error: followingError } = await supabase
          .rpc('get_following_feed', {
            user_id: user.id,
            limit_count: limit,
            offset_count: offset
          })
        
        if (followingError) throw followingError
        updates = followingFeed || []
        break
        
      case 'business':
        // Get updates for a specific business
        if (!businessId) {
          return NextResponse.json({ error: 'Business ID required' }, { status: 400 })
        }
        
        const businessQuery = supabase
          .from('business_updates')
          .select(`
            *,
            business:businesses!business_id (
              id,
              name,
              logo_url
            )
          `, { count: 'exact' })
          .eq('business_id', businessId)
          .lte('published_at', new Date().toISOString())
          .order('published_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        const { data: businessUpdates, error: businessError, count } = await businessQuery
        
        if (businessError) throw businessError
        updates = (businessUpdates || []) as BusinessUpdate[]
        totalCount = count || 0

        // Add interaction status if user is authenticated
        if (user && updates.length > 0) {
          const updateIds = updates.map((u) => u.id)
          const { data: interactions, error: interactionsError } = await supabase
            .from('update_interactions')
            .select('update_id, interaction_type')
            .eq('user_id', user.id)
            .in('update_id', updateIds);

          if (interactionsError) {
            console.error('Error fetching interactions:', interactionsError);
          }

          const typedInteractions = interactions as unknown as UpdateInteraction[] | null;

          // Map interactions to updates
          updates = updates.map(update => ({
            ...update,
            has_liked: typedInteractions?.some(
              i => i.update_id === update.id && i.interaction_type === 'like'
            ) || false,
            has_viewed: typedInteractions?.some(
              i => i.update_id === update.id && i.interaction_type === 'view'
            ) || false
          }))
        }
        break
        
      default:
        // Get all updates (personalized if authenticated)
        if (user) {
          const { data: personalizedFeed, error: feedError } = await supabase
            .rpc('get_user_feed', {
              user_id: user.id,
              limit_count: limit,
              offset_count: offset
            } as any)

          if (feedError) throw feedError
          updates = (personalizedFeed || []) as BusinessUpdate[]
        } else {
          // Public feed for non-authenticated users
          const publicQuery = supabase
            .from('business_updates')
            .select(`
              *,
              business:businesses!business_id (
                id,
                name,
                logo_url
              )
            `, { count: 'exact' })
            .lte('published_at', new Date().toISOString())
            .order('is_featured', { ascending: false })
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1)

          const { data: publicUpdates, error: publicError, count } = await publicQuery

          if (publicError) throw publicError
          updates = (publicUpdates || []) as BusinessUpdate[]
          totalCount = count || 0
        }
    }
    
    return NextResponse.json({
      updates,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: updates.length === limit
      }
    })
    
  } catch (error) {
    console.error('Error fetching updates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    )
  }
}

// POST: Create a new business update
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const {
      businessId,
      title,
      content,
      type = 'general',
      category,
      tags = [],
      imageUrl,
      linkUrl,
      linkTitle,
      publishAt,
      expiresAt,
      isFeatured = false
    } = body
    
    // Validate required fields
    if (!businessId || !title) {
      return NextResponse.json(
        { error: 'Business ID and title are required' },
        { status: 400 }
      )
    }
    
    // Check if user has permission to post for this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, metadata')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if user is admin or business owner
    const { data: profile, error: _profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }
    
    interface ProfileData {
      role?: string | null;
    }

    interface BusinessMetadata {
      claimed_by?: string;
    }

    const typedProfile = profile as unknown as ProfileData | null;
    const isAdmin = typedProfile?.role === 'admin' || typedProfile?.role === 'owner';
    const typedBusiness = business as { metadata?: BusinessMetadata };
    const metadata = typedBusiness.metadata;
    const isBusinessOwner = metadata?.claimed_by === user.id;
    
    if (!isAdmin && !isBusinessOwner) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }
    
    // Create the update
    const { data: newUpdate, error: createError } = await supabase
      .from('business_updates')
      .insert({
        business_id: businessId,
        title,
        content,
        type,
        category,
        tags,
        image_url: imageUrl,
        link_url: linkUrl,
        link_title: linkTitle,
        published_at: publishAt || new Date().toISOString(),
        expires_at: expiresAt,
        is_featured: isFeatured && isAdmin, // Only admins can feature
        is_verified: isAdmin,
        created_by: user.id,
        verified_by: isAdmin ? user.id : null
      } as never)
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating update:', createError)
      return NextResponse.json(
        { error: 'Failed to create update' },
        { status: 500 }
      )
    }
    
    // Notify followers (in production, this would trigger a notification service)
    const { data: followers, error: followersError } = await supabase
      .from('business_followers')
      .select('user_id, notification_preference')
      .eq('business_id', businessId);

    interface NewUpdateData {
      id?: string;
    }

    const typedNewUpdate = newUpdate as unknown as NewUpdateData | null;

    // Log event
    await supabase.from('events').insert({
      user_id: user.id,
      event_type: 'update_created',
      event_data: {
        update_id: typedNewUpdate?.id,
        business_id: businessId,
        title,
        type,
        follower_count: followers?.length || 0
      }
    } as never);
    
    return NextResponse.json({
      message: 'Update created successfully',
      update: newUpdate,
      notified_users: followers?.length || 0
    })
    
  } catch (error) {
    console.error('Error creating update:', error)
    return NextResponse.json(
      { error: 'Failed to create update' },
      { status: 500 }
    )
  }
}

// PATCH: Update an existing business update
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { updateId, ...updates } = body
    
    if (!updateId) {
      return NextResponse.json(
        { error: 'Update ID is required' },
        { status: 400 }
      )
    }
    
    // Check if user owns the update
    const { data: existingUpdate, error: _existingError } = await supabase
      .from('business_updates')
      .select('created_by')
      .eq('id', updateId)
      .single();

    if (existingError || !existingUpdate) {
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      )
    }

    interface UpdateOwnerData {
      created_by?: string | null;
    }

    interface ProfileData {
      role?: string | null;
    }

    const typedExisting = existingUpdate as unknown as UpdateOwnerData;

    if (typedExisting.created_by !== user.id) {
      // Check if user is admin
      const { data: profile, error: _profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      const typedProfile = profile as unknown as ProfileData | null;

      if (typedProfile?.role !== 'admin' && typedProfile?.role !== 'owner') {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }
    }
    
    // Update the record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('business_updates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      } as never)
      .eq('id', updateId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating:', updateError)
      return NextResponse.json(
        { error: 'Failed to update' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Update modified successfully',
      update: updatedRecord
    })
    
  } catch (error) {
    console.error('Error updating:', error)
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    )
  }
}

// DELETE: Delete a business update
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const updateId = searchParams.get('id')
    
    if (!updateId) {
      return NextResponse.json(
        { error: 'Update ID is required' },
        { status: 400 }
      )
    }
    
    // Check ownership
    const { data: existingUpdate, error: _existingError } = await supabase
      .from('business_updates')
      .select('created_by')
      .eq('id', updateId)
      .single();

    if (existingError || !existingUpdate) {
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      )
    }

    interface UpdateOwnerData {
      created_by?: string | null;
    }

    interface ProfileData {
      role?: string | null;
    }

    const typedExisting = existingUpdate as unknown as UpdateOwnerData;

    if (typedExisting.created_by !== user.id) {
      // Check if user is admin
      const { data: profile, error: _profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      const typedProfile = profile as unknown as ProfileData | null;

      if (typedProfile?.role !== 'admin' && typedProfile?.role !== 'owner') {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }
    }
    
    // Delete the update
    const { error: deleteError } = await supabase
      .from('business_updates')
      .delete()
      .eq('id', updateId)
    
    if (deleteError) {
      console.error('Error deleting:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete update' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Update deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting update:', error)
    return NextResponse.json(
      { error: 'Failed to delete update' },
      { status: 500 }
    )
  }
}