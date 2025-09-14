import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

// Demo search results generator
function getDemoSearchResults(query: string, categories: string[], location?: string | null) {
  const demoBusinesses = [
    {
      id: 'demo-1',
      name: 'TechVentures UK',
      description: 'Leading technology consultancy specializing in AI and machine learning solutions for enterprise clients.',
      address: {
        formatted: '123 Tech Street, London, EC2A 4BX',
        vicinity: 'London',
        street: '123 Tech Street',
        city: 'London',
        postal_code: 'EC2A 4BX'
      },
      latitude: 51.5074,
      longitude: -0.1278,
      phone: '+44 20 7123 4567',
      email: 'info@techventures.co.uk',
      website: 'https://techventures.co.uk',
      categories: ['Technology', 'AI & Machine Learning', 'Consulting'],
      rating: 4.8,
      verified: true,
      google_place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
      metadata: {
        employees: '50-100',
        founded: '2018',
        revenue: '£5M-10M'
      }
    },
    {
      id: 'demo-2',
      name: 'GreenTech Solutions',
      description: 'Sustainable technology solutions for businesses looking to reduce their carbon footprint.',
      address: {
        formatted: '45 Eco Park, Manchester, M1 2NE',
        vicinity: 'Manchester',
        street: '45 Eco Park',
        city: 'Manchester',
        postal_code: 'M1 2NE'
      },
      latitude: 53.4808,
      longitude: -2.2426,
      phone: '+44 161 234 5678',
      email: 'contact@greentech.co.uk',
      website: 'https://greentech-solutions.co.uk',
      categories: ['Technology', 'Sustainability', 'Environmental Services'],
      rating: 4.6,
      verified: true,
      google_place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
      metadata: {
        employees: '25-50',
        founded: '2020',
        revenue: '£2M-5M'
      }
    },
    {
      id: 'demo-3',
      name: 'Digital Marketing Pro',
      description: 'Full-service digital marketing agency helping businesses grow their online presence.',
      address: {
        formatted: '78 Creative Quarter, Birmingham, B1 1BA',
        vicinity: 'Birmingham',
        street: '78 Creative Quarter',
        city: 'Birmingham',
        postal_code: 'B1 1BA'
      },
      latitude: 52.4862,
      longitude: -1.8904,
      phone: '+44 121 345 6789',
      email: 'hello@digitalmarketingpro.co.uk',
      website: 'https://digitalmarketingpro.co.uk',
      categories: ['Marketing', 'Digital Services', 'Advertising'],
      rating: 4.7,
      verified: false,
      google_place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
      metadata: {
        employees: '10-25',
        founded: '2019',
        revenue: '£1M-2M'
      }
    },
    {
      id: 'demo-4',
      name: 'FinTech Innovations',
      description: 'Revolutionary financial technology solutions for modern banking and payments.',
      address: {
        formatted: '200 Canary Wharf, London, E14 5LB',
        vicinity: 'London',
        street: '200 Canary Wharf',
        city: 'London',
        postal_code: 'E14 5LB'
      },
      latitude: 51.5054,
      longitude: -0.0235,
      phone: '+44 20 7987 6543',
      email: 'info@fintechinnovations.com',
      website: 'https://fintechinnovations.com',
      categories: ['FinTech', 'Banking', 'Technology'],
      rating: 4.9,
      verified: true,
      google_place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
      metadata: {
        employees: '100-250',
        founded: '2017',
        revenue: '£10M-25M'
      }
    },
    {
      id: 'demo-5',
      name: 'Healthcare Analytics Ltd',
      description: 'Data-driven healthcare solutions improving patient outcomes through advanced analytics.',
      address: {
        formatted: '32 Medical District, Cambridge, CB2 1TN',
        vicinity: 'Cambridge',
        street: '32 Medical District',
        city: 'Cambridge',
        postal_code: 'CB2 1TN'
      },
      latitude: 52.2053,
      longitude: 0.1218,
      phone: '+44 1223 456 789',
      email: 'contact@healthcareanalytics.co.uk',
      website: 'https://healthcareanalytics.co.uk',
      categories: ['Healthcare', 'Analytics', 'Technology'],
      rating: 4.5,
      verified: true,
      google_place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
      metadata: {
        employees: '25-50',
        founded: '2021',
        revenue: '£2M-5M'
      }
    },
    {
      id: 'demo-6',
      name: 'EduTech Platforms',
      description: 'Innovative educational technology solutions for schools and universities.',
      address: {
        formatted: '15 University Road, Oxford, OX1 3DQ',
        vicinity: 'Oxford',
        street: '15 University Road',
        city: 'Oxford',
        postal_code: 'OX1 3DQ'
      },
      latitude: 51.7520,
      longitude: -1.2577,
      phone: '+44 1865 123 456',
      email: 'info@edutechplatforms.co.uk',
      website: 'https://edutechplatforms.co.uk',
      categories: ['Education', 'Technology', 'E-Learning'],
      rating: 4.4,
      verified: false,
      google_place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
      metadata: {
        employees: '50-100',
        founded: '2016',
        revenue: '£5M-10M'
      }
    },
    {
      id: 'demo-7',
      name: 'CleanEnergy Co',
      description: 'Renewable energy solutions and solar panel installations for commercial properties.',
      address: {
        formatted: '88 Green Lane, Bristol, BS1 4ST',
        vicinity: 'Bristol',
        street: '88 Green Lane',
        city: 'Bristol',
        postal_code: 'BS1 4ST'
      },
      latitude: 51.4545,
      longitude: -2.5879,
      phone: '+44 117 987 6543',
      email: 'enquiries@cleanenergyco.uk',
      website: 'https://cleanenergyco.uk',
      categories: ['Energy', 'Sustainability', 'Construction'],
      rating: 4.8,
      verified: true,
      google_place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
      metadata: {
        employees: '100-250',
        founded: '2015',
        revenue: '£10M-25M'
      }
    },
    {
      id: 'demo-8',
      name: 'LegalTech Solutions',
      description: 'AI-powered legal technology streamlining document review and contract analysis.',
      address: {
        formatted: '50 Law Courts, Leeds, LS1 2DA',
        vicinity: 'Leeds',
        street: '50 Law Courts',
        city: 'Leeds',
        postal_code: 'LS1 2DA'
      },
      latitude: 53.8008,
      longitude: -1.5491,
      phone: '+44 113 234 5678',
      email: 'info@legaltechsolutions.co.uk',
      website: 'https://legaltechsolutions.co.uk',
      categories: ['Legal', 'Technology', 'AI'],
      rating: 4.6,
      verified: true,
      google_place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
      metadata: {
        employees: '25-50',
        founded: '2019',
        revenue: '£2M-5M'
      }
    }
  ]

  // Filter by query
  let filteredResults = demoBusinesses
  if (query) {
    const queryLower = query.toLowerCase()
    filteredResults = filteredResults.filter(business => 
      business.name.toLowerCase().includes(queryLower) ||
      business.description.toLowerCase().includes(queryLower) ||
      business.categories.some(cat => cat.toLowerCase().includes(queryLower))
    )
  }

  // Filter by categories
  if (categories && categories.length > 0) {
    filteredResults = filteredResults.filter(business =>
      categories.some(cat => 
        business.categories.some(bCat => 
          bCat.toLowerCase().includes(cat.toLowerCase())
        )
      )
    )
  }

  // Filter by location
  if (location) {
    const locationLower = location.toLowerCase()
    filteredResults = filteredResults.filter(business =>
      business.address.city.toLowerCase().includes(locationLower) ||
      business.address.vicinity.toLowerCase().includes(locationLower)
    )
  }

  return filteredResults
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

    // Get authenticated user (optional for search)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Allow search without authentication for demo purposes
    // In production, you might want to limit results for unauthenticated users

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
      // Search in the address JSON field - use text cast for JSONB fields
      businessQuery = businessQuery.or(`address->>formatted.ilike.%${location}%,address->>vicinity.ilike.%${location}%`)
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
      // Return demo data instead of error for better UX
      const demoResults = getDemoSearchResults(query, categories, location)
      return NextResponse.json({
        results: demoResults,
        total: demoResults.length,
        page: page,
        limit: limit,
        demo: true
      })
    }
    
    // If no results from database, return demo data
    if (!searchResults || searchResults.length === 0) {
      const demoResults = getDemoSearchResults(query, categories, location)
      return NextResponse.json({
        results: demoResults,
        total: demoResults.length,
        page: page,
        limit: limit,
        demo: true
      })
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

    // Log search for analytics (only if user is authenticated)
    if (user?.id) {
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
    }

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