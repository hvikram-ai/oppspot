import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock data for demonstration - replace with real database queries
const mockBusinesses = [
  {
    id: '1',
    name: 'TechStart Solutions',
    description: 'Leading technology consulting firm specializing in digital transformation and cloud solutions.',
    address: {
      street: '123 Tech Street',
      city: 'London',
      state: 'England',
      country: 'UK',
      postal_code: 'EC1A 1BB'
    },
    phone: '+44 20 1234 5678',
    email: 'info@techstart.co.uk',
    website: 'https://techstart.co.uk',
    categories: ['Technology', 'Consulting'],
    rating: 4.8,
    distance: 2.5,
    relevance_score: 0.95,
    verified: true
  },
  {
    id: '2',
    name: 'Green Earth Cafe',
    description: 'Eco-friendly cafe serving organic, locally-sourced food and beverages.',
    address: {
      street: '456 High Street',
      city: 'Manchester',
      state: 'England',
      country: 'UK',
      postal_code: 'M1 1AD'
    },
    phone: '+44 161 234 5678',
    email: 'hello@greenearthcafe.co.uk',
    website: 'https://greenearthcafe.co.uk',
    categories: ['Food & Beverage', 'Retail'],
    rating: 4.6,
    distance: 5.2,
    relevance_score: 0.85,
    verified: false
  },
  {
    id: '3',
    name: 'DataDrive Analytics',
    description: 'Business intelligence and data analytics solutions for enterprise clients.',
    address: {
      street: '789 Data Lane',
      city: 'Edinburgh',
      state: 'Scotland',
      country: 'UK',
      postal_code: 'EH1 1AA'
    },
    phone: '+44 131 234 5678',
    email: 'contact@datadrive.co.uk',
    website: 'https://datadrive.co.uk',
    categories: ['Technology', 'Professional Services'],
    rating: 4.9,
    distance: 10.3,
    relevance_score: 0.92,
    verified: true
  },
  {
    id: '4',
    name: 'Swift Logistics Ltd',
    description: 'Comprehensive logistics and supply chain management services across the UK and Ireland.',
    address: {
      street: '321 Transport Way',
      city: 'Birmingham',
      state: 'England',
      country: 'UK',
      postal_code: 'B1 1AA'
    },
    phone: '+44 121 234 5678',
    email: 'info@swiftlogistics.co.uk',
    website: 'https://swiftlogistics.co.uk',
    categories: ['Transportation', 'Professional Services'],
    rating: 4.4,
    distance: 15.7,
    relevance_score: 0.78,
    verified: true
  },
  {
    id: '5',
    name: 'Innovate Finance Group',
    description: 'Financial services and investment advisory for businesses and individuals.',
    address: {
      street: '999 Money Street',
      city: 'Dublin',
      state: 'Dublin',
      country: 'Ireland',
      postal_code: 'D01 F5P2'
    },
    phone: '+353 1 234 5678',
    email: 'invest@innovatefinance.ie',
    website: 'https://innovatefinance.ie',
    categories: ['Finance', 'Professional Services'],
    rating: 4.7,
    distance: 120.5,
    relevance_score: 0.88,
    verified: true
  }
]

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

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Implement real database search
    // For now, we'll use mock data and apply basic filtering
    
    let results = [...mockBusinesses]

    // Apply filters
    if (query) {
      const searchQuery = query.toLowerCase()
      results = results.filter(b => 
        b.name.toLowerCase().includes(searchQuery) ||
        b.description?.toLowerCase().includes(searchQuery) ||
        b.categories?.some(c => c.toLowerCase().includes(searchQuery))
      )
    }

    if (categories.length > 0) {
      results = results.filter(b => 
        b.categories?.some(c => categories.includes(c))
      )
    }

    if (location) {
      results = results.filter(b => 
        b.address?.city?.toLowerCase().includes(location.toLowerCase()) ||
        b.address?.postal_code?.toLowerCase().includes(location.toLowerCase())
      )
    }

    if (minRating) {
      results = results.filter(b => (b.rating || 0) >= minRating)
    }

    if (verified) {
      results = results.filter(b => b.verified)
    }

    // Apply sorting
    switch (sortBy) {
      case 'distance':
        results.sort((a, b) => (a.distance || 0) - (b.distance || 0))
        break
      case 'rating':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'relevance':
      default:
        results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
        break
    }

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedResults = results.slice(startIndex, endIndex)

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
        results_count: results.length
      })

    return NextResponse.json({
      results: paginatedResults,
      total: results.length,
      page,
      limit,
      totalPages: Math.ceil(results.length / limit)
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
      // TODO: Implement AI-powered natural language processing
      // This would use OpenAI/Anthropic to understand the query
      // and convert it to structured search parameters
      
      // For now, return mock AI-processed results
      return NextResponse.json({
        results: mockBusinesses.slice(0, 3),
        total: 3,
        aiInsights: {
          interpretation: `Found businesses matching "${query}"`,
          suggestedFilters: {
            categories: ['Technology', 'Professional Services'],
            location: 'London'
          }
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