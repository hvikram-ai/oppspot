import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SearchFilters {
  categories?: string[]
  location?: string
  radius?: number
  minRating?: number
  verified?: boolean
  sortBy?: string
  userLat?: number
  userLng?: number
}

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

    // Use the advanced search RPC function for better performance
    const { data: searchResults, error } = await supabase
      .rpc('search_businesses', {
        search_query: query || null,
        filter_categories: categories.length > 0 ? categories : null,
        filter_location: location || null,
        filter_min_rating: minRating,
        filter_verified: verified || null,
        user_lat: userLat,
        user_lng: userLng,
        radius_miles: radius,
        sort_by: sortBy,
        page_limit: limit,
        page_offset: (page - 1) * limit
      })

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to search businesses' },
        { status: 500 }
      )
    }

    // Get total count from the first result (if any)
    const totalCount = searchResults && searchResults.length > 0 
      ? searchResults[0].total_count 
      : 0

    // Format the results
    const formattedResults = (searchResults || []).map(business => ({
      id: business.id,
      name: business.name,
      description: business.description,
      address: business.address,
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
      distance: business.distance_miles,
      relevance_score: business.relevance_score || 0.9
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
          verified,
          sortBy
        },
        results_count: totalCount || 0
      })

    return NextResponse.json({
      results: formattedResults,
      total: totalCount || 0,
      page,
      limit,
      totalPages: Math.ceil((totalCount || 0) / limit)
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for AI-powered search
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, useAI = false } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (useAI) {
      // Parse natural language query into structured search
      // This would integrate with OpenAI/Anthropic to understand intent
      
      // For now, extract basic patterns
      const filters: SearchFilters = {}
      
      // Extract location mentions
      const locationMatch = query.match(/in\s+([A-Za-z\s]+?)(?:\s|$)/i)
      if (locationMatch) {
        filters.location = locationMatch[1].trim()
      }
      
      // Extract category mentions
      const categoryKeywords = {
        'restaurant': ['Food & Beverage', 'Restaurant'],
        'tech': ['Technology'],
        'software': ['Technology', 'Software'],
        'medical': ['Healthcare', 'Medical'],
        'finance': ['Finance'],
        'construction': ['Construction'],
        'education': ['Education']
      }
      
      for (const [keyword, cats] of Object.entries(categoryKeywords)) {
        if (query.toLowerCase().includes(keyword)) {
          filters.categories = cats
          break
        }
      }
      
      // Extract rating requirements
      if (query.includes('highly rated') || query.includes('best')) {
        filters.minRating = 4.5
      }
      
      // Extract verified requirement
      if (query.includes('verified') || query.includes('trusted')) {
        filters.verified = true
      }
      
      // Build URL with extracted filters
      const searchParams = new URLSearchParams({
        q: query,
        ...(filters.location && { location: filters.location }),
        ...(filters.categories && { categories: filters.categories.join(',') }),
        ...(filters.minRating && { minRating: filters.minRating.toString() }),
        ...(filters.verified && { verified: 'true' })
      })
      
      // Use the GET endpoint with extracted parameters
      const url = new URL(request.url)
      url.search = searchParams.toString()
      const modifiedRequest = new Request(url, {
        method: 'GET',
        headers: request.headers
      })
      
      const response = await GET(modifiedRequest)
      const data = await response.json()
      
      return NextResponse.json({
        ...data,
        aiInsights: {
          interpretation: `Searching for: ${query}`,
          extractedFilters: filters,
          suggestions: [
            'Try adding more specific location',
            'Filter by business category',
            'Sort by rating or distance'
          ]
        }
      })
    }

    // Fall back to regular search
    return GET(request)

  } catch (error) {
    console.error('AI Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}