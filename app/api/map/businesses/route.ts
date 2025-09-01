import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Get map bounds
    const north = parseFloat(searchParams.get('north') || '90')
    const south = parseFloat(searchParams.get('south') || '-90')
    const east = parseFloat(searchParams.get('east') || '180')
    const west = parseFloat(searchParams.get('west') || '-180')
    
    // Get filters
    const searchQuery = searchParams.get('q') || null
    const categories = searchParams.get('categories')?.split(',') || null
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null
    const verified = searchParams.get('verified') === 'true' ? true : null

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('businesses')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', south)
      .lte('latitude', north)

    // Handle longitude wrap-around (if bounds cross the international date line)
    if (west > east) {
      query = query.or(`longitude.gte.${west},longitude.lte.${east}`)
    } else {
      query = query.gte('longitude', west).lte('longitude', east)
    }

    // Apply search filter
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
    }

    // Apply category filter
    if (categories && categories.length > 0) {
      query = query.contains('categories', categories)
    }

    // Apply rating filter
    if (minRating !== null) {
      query = query.gte('rating', minRating)
    }

    // Apply verified filter
    if (verified !== null) {
      query = query.eq('verified', verified)
    }

    // Limit results for performance (map shouldn't show too many markers)
    query = query.limit(500)

    const { data: businesses, error } = await query

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      )
    }

    // Format businesses for the map
    const formattedBusinesses = (businesses || []).map((business: Business) => ({
      id: business.id,
      name: business.name,
      description: business.description,
      address: business.address,
      latitude: business.latitude,
      longitude: business.longitude,
      phone_numbers: business.phone_numbers,
      emails: business.emails,
      website: business.website,
      categories: business.categories || [],
      rating: business.rating,
      verified: business.verified || false,
      google_place_id: business.google_place_id,
      metadata: business.metadata
    }))

    return NextResponse.json({
      businesses: formattedBusinesses,
      count: formattedBusinesses.length
    })

  } catch (error) {
    console.error('Map businesses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch map data' },
      { status: 500 }
    )
  }
}