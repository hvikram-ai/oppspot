import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract search parameters
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []
    const location = searchParams.get('location')
    const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : null
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null
    const verified = searchParams.get('verified') === 'true'
    const sortBy = searchParams.get('sortBy') || 'relevance'
    
    // User location for distance calculation (if provided)
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build the query
    let businessQuery = supabase.from('businesses').select('*', { count: 'exact' })

    // Apply search query
    if (query) {
      businessQuery = businessQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Apply category filter
    if (categories.length > 0) {
      businessQuery = businessQuery.contains('categories', categories)
    }

    // Apply location filter
    if (location) {
      // Search in the address JSON field
      businessQuery = businessQuery.or(`address->formatted.ilike.%${location}%,address->vicinity.ilike.%${location}%`)
    }

    // Apply rating filter
    if (minRating) {
      businessQuery = businessQuery.gte('rating', minRating)
    }

    // Apply verified filter
    if (verified) {
      businessQuery = businessQuery.eq('verified', true)
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        businessQuery = businessQuery.order('rating', { ascending: false, nullsFirst: false })
        break
      case 'name':
        businessQuery = businessQuery.order('name', { ascending: true })
        break
      case 'newest':
        businessQuery = businessQuery.order('created_at', { ascending: false })
        break
      default:
        // Default sort by creation date for now
        businessQuery = businessQuery.order('created_at', { ascending: false })
    }

    // Apply pagination
    const startRange = (page - 1) * limit
    const endRange = startRange + limit - 1
    businessQuery = businessQuery.range(startRange, endRange)

    const { data: searchResults, error, count } = await businessQuery

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to search businesses' },
        { status: 500 }
      )
    }

    // Calculate distance if user location is provided
    const resultsWithDistance = searchResults?.map((business: Business) => {
      let distance = null
      if (userLat && userLng && business.latitude && business.longitude) {
        // Calculate distance using Haversine formula
        const R = 6371 // Earth's radius in kilometers
        const dLat = (business.latitude - userLat) * Math.PI / 180
        const dLon = (business.longitude - userLng) * Math.PI / 180
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(userLat * Math.PI / 180) * Math.cos(business.latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        distance = R * c // Distance in kilometers
      }

      return {
        ...business,
        distance_km: distance
      }
    }) || []

    // Filter by radius if specified and location is provided
    let filteredResults = resultsWithDistance
    if (radius && userLat && userLng) {
      filteredResults = resultsWithDistance.filter(
        business => business.distance_km !== null && business.distance_km <= radius
      )
    }

    // Sort by distance if user location is provided and sort is relevance
    if (sortBy === 'relevance' && userLat && userLng) {
      filteredResults.sort((a, b) => {
        if (a.distance_km === null) return 1
        if (b.distance_km === null) return -1
        return a.distance_km - b.distance_km
      })
    }

    // Format the results
    const formattedResults = filteredResults.map(business => ({
      id: business.id,
      name: business.name,
      description: business.description,
      address: business.address,
      latitude: business.latitude,
      longitude: business.longitude,
      phone: Array.isArray(business.phone_numbers) 
        ? business.phone_numbers[0] 
        : business.phone_numbers,
      email: Array.isArray(business.emails) 
        ? business.emails[0] 
        : business.emails,
      website: business.website,
      categories: business.categories || [],
      rating: business.rating,
      verified: business.verified || false,
      distance: business.distance_km,
      google_place_id: business.google_place_id,
      metadata: business.metadata
    }))

    // Log search for analytics
    await supabase
      .from('searches')
      .insert({
        user_id: user.id,
        query,
        filters: {
          categories,
          location,
          radius,
          minRating,
          verified
        },
        results_count: formattedResults.length
      } as Database['public']['Tables']['searches']['Insert'])

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      results: formattedResults,
      totalCount: count || 0,
      page,
      totalPages,
      hasMore: page < totalPages
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}