import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'
import type { Row } from '@/lib/supabase/helpers'

type DbClient = SupabaseClient<Database>

// POST: Create or update competitor set
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
      name, 
      description, 
      primaryBusinessId, 
      competitorIds = [],
      metadata = {}
    } = body
    
    if (!name || !primaryBusinessId) {
      return NextResponse.json(
        { error: 'Name and primary business are required' },
        { status: 400 }
      )
    }
    
    // Verify primary business exists
    const { data: primaryBusiness, error: primaryBusinessError } = await supabase
      .from('businesses')
      .select('id, name, categories')
      .eq('id', primaryBusinessId)
      .single();
    
    if (!primaryBusiness) {
      return NextResponse.json(
        { error: 'Primary business not found' },
        { status: 404 }
      )
    }
    
    // Auto-discover competitors if none provided
    let finalCompetitorIds = competitorIds
    if (competitorIds.length === 0) {
      finalCompetitorIds = await discoverCompetitors(
        supabase,
        primaryBusinessId,
        primaryBusiness.categories
      )
    }
    
    // Create competitor set
    const { data: competitorSet, error: createError } = await supabase
      .from('competitor_sets')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        user_id: user.id,
        name,
        description,
        primary_business_id: primaryBusinessId,
        competitor_ids: finalCompetitorIds,
        metadata: {
          ...metadata,
          auto_discovered: competitorIds.length === 0,
          categories: primaryBusiness.categories
        }
      })
      .select()
      .single()
    
    if (createError) throw createError
    
    // Fetch competitor details
    const { data: competitors, error: competitorsError } = await supabase
      .from('businesses')
      .select('id, name, rating, review_count, categories')
      .in('id', finalCompetitorIds)
    
    return NextResponse.json({
      competitor_set: competitorSet,
      primary_business: primaryBusiness,
      competitors: competitors || []
    })
    
  } catch (error) {
    console.error('Create competitor set error:', error)
    return NextResponse.json(
      { error: 'Failed to create competitor set' },
      { status: 500 }
    )
  }
}

// GET: Fetch competitor sets
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const setId = searchParams.get('id')
    const businessId = searchParams.get('businessId')
    
    if (setId) {
      // Get specific competitor set with details
      const { data: competitorSet, error } = await supabase
        .from('competitor_sets')
        .select('*')
        .eq('id', setId)
        .eq('user_id', user.id)
        .single()
      
      if (error) throw error
      
      if (!competitorSet) {
        return NextResponse.json(
          { error: 'Competitor set not found' },
          { status: 404 }
        )
      }
      
      // Fetch all business details
      const allBusinessIds = [
        competitorSet.primary_business_id,
        ...competitorSet.competitor_ids
      ].filter(Boolean)
      
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('*')
        .in('id', allBusinessIds)
      
      // Fetch competitive metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('competitive_metrics')
        .select('*')
        .in('business_id', allBusinessIds)
        .order('metric_date', { ascending: false })
        .limit(30 * allBusinessIds.length) // Last 30 days for each
      
      // Organize data
      const primaryBusiness = businesses?.find(
        b => b.id === competitorSet.primary_business_id
      )
      const competitors = businesses?.filter(
        b => competitorSet.competitor_ids.includes(b.id)
      )
      
      return NextResponse.json({
        competitor_set: competitorSet,
        primary_business: primaryBusiness,
        competitors: competitors || [],
        metrics: metrics || []
      })
      
    } else if (businessId) {
      // Find competitor sets for a specific business
      const { data: sets, error: setsError } = await supabase
        .from('competitor_sets')
        .select('*')
        .eq('user_id', user.id)
        .or(`primary_business_id.eq.${businessId},competitor_ids.cs.{${businessId}}`)
      
      return NextResponse.json({ competitor_sets: sets || [] })
      
    } else {
      // Get all user's competitor sets
      const { data: sets, error } = await supabase
        .from('competitor_sets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return NextResponse.json({ competitor_sets: sets || [] })
    }
    
  } catch (error) {
    console.error('Fetch competitor sets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitor sets' },
      { status: 500 }
    )
  }
}

// PATCH: Update competitor set
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Competitor set ID required' },
        { status: 400 }
      )
    }
    
    // Update competitor set
    const { data: updated, error } = await supabase
      .from('competitor_sets')
      // @ts-expect-error - Type inference issue
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ competitor_set: updated })
    
  } catch (error) {
    console.error('Update competitor set error:', error)
    return NextResponse.json(
      { error: 'Failed to update competitor set' },
      { status: 500 }
    )
  }
}

// DELETE: Remove competitor set
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Competitor set ID required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('competitor_sets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    
    if (error) throw error
    
    return NextResponse.json({ message: 'Competitor set deleted' })
    
  } catch (error) {
    console.error('Delete competitor set error:', error)
    return NextResponse.json(
      { error: 'Failed to delete competitor set' },
      { status: 500 }
    )
  }
}

// Helper function to auto-discover competitors
async function discoverCompetitors(
  supabase: DbClient,
  primaryBusinessId: string,
  categories: string[]
) {
  try {
    // Get primary business location
    const { data: primaryBusiness, error: primaryBusinessError } = await supabase
      .from('businesses')
      .select('latitude, longitude')
      .eq('id', primaryBusinessId)
      .single();
    
    if (!primaryBusiness || !primaryBusiness.latitude) {
      return []
    }
    
    // Find similar businesses nearby
    const { data: competitors, error: competitorsError } = await supabase
      .rpc('nearby_businesses', {
        lat: primaryBusiness.latitude,
        lng: primaryBusiness.longitude,
        radius_km: 10
      })
      .contains('categories', categories)
      .neq('id', primaryBusinessId)
      .order('rating', { ascending: false })
      .limit(10)
    
    interface Competitor {
      id: string
    }
    return (competitors || []).map((c: Competitor) => c.id)
    
  } catch (error) {
    console.error('Auto-discover error:', error)
    return []
  }
}