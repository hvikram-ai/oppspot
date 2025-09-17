import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompaniesHouseService } from '@/lib/services/companies-house'

// Helper function to calculate age in hours
function getAgeInHours(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
}

// Helper function to generate URL-safe slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

// Mock data for demo mode
interface MockCompany {
  id: string
  company_number: string
  name: string
  company_status: string
  company_type: string
  incorporation_date: string
  registered_office_address: {
    address_line_1?: string
    locality?: string
    postal_code?: string
    country?: string
  }
  sic_codes?: string[]
  slug: string
  source: string
}

function getMockCompanyResults(query: string): MockCompany[] {
  const mockCompanies = [
    {
      id: 'mock-1',
      company_number: '03977902',
      name: 'GOOGLE UK LIMITED',
      company_status: 'active',
      company_type: 'ltd',
      incorporation_date: '2000-02-15',
      registered_office_address: {
        address_line_1: '1-13 St Giles High St',
        locality: 'London',
        postal_code: 'WC2H 8AG',
        country: 'United Kingdom'
      },
      sic_codes: ['62012', '62020'],
      slug: 'google-uk-limited',
      source: 'mock'
    },
    {
      id: 'mock-2', 
      company_number: '04035903',
      name: 'AMAZON UK SERVICES LTD.',
      company_status: 'active',
      company_type: 'ltd',
      incorporation_date: '2000-08-02',
      registered_office_address: {
        address_line_1: '1 Principal Place',
        locality: 'London',
        postal_code: 'EC2A 2FA',
        country: 'United Kingdom'
      },
      sic_codes: ['47911', '52290'],
      slug: 'amazon-uk-services-ltd',
      source: 'mock'
    },
    {
      id: 'mock-3',
      company_number: '03824658',
      name: 'MICROSOFT LIMITED',
      company_status: 'active', 
      company_type: 'ltd',
      incorporation_date: '1999-08-25',
      registered_office_address: {
        address_line_1: 'Microsoft Campus',
        address_line_2: 'Thames Valley Park',
        locality: 'Reading',
        postal_code: 'RG6 1WG',
        country: 'United Kingdom'
      },
      sic_codes: ['62012', '62020', '58290'],
      slug: 'microsoft-limited',
      source: 'mock'
    },
    {
      id: 'mock-4',
      company_number: '02627406',
      name: 'APPLE UK LIMITED',
      company_status: 'active',
      company_type: 'ltd', 
      incorporation_date: '1991-05-16',
      registered_office_address: {
        address_line_1: '100 New Bridge Street',
        locality: 'London',
        postal_code: 'EC4V 6JA',
        country: 'United Kingdom'
      },
      sic_codes: ['46510', '47410'],
      slug: 'apple-uk-limited',
      source: 'mock'
    },
    {
      id: 'mock-5',
      company_number: '03609101',
      name: 'META PLATFORMS IRELAND LIMITED',
      company_status: 'active',
      company_type: 'ltd',
      incorporation_date: '1998-10-13',
      registered_office_address: {
        address_line_1: '10 Brock Street',
        locality: 'London',
        postal_code: 'NW1 3FG',
        country: 'United Kingdom'
      },
      sic_codes: ['63120', '73110'],
      slug: 'meta-platforms-ireland-limited',
      source: 'mock'
    }
  ]
  
  // Filter based on search query
  const lowerQuery = query.toLowerCase()
  return mockCompanies.filter(company => 
    company.name.toLowerCase().includes(lowerQuery) ||
    company.company_number.includes(query)
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const {
      query,
      useCache = true,
      limit = 20,
      offset = 0,
      demo = false
    } = body

    console.log('Companies search request:', { query, demo, useCache })

    // Check authentication but make it optional
    let user = null
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.log('Auth check error:', authError.message)
      } else {
        user = authData.user
      }
    } catch (authCheckError) {
      console.error('Failed to check auth:', authCheckError)
    }

    // Log auth status for debugging
    console.log('Auth status:', {
      isAuthenticated: !!user,
      userId: user?.id,
      demo,
      hasApiKey: !!process.env.COMPANIES_HOUSE_API_KEY
    })

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const searchTerm = query.trim()
    const companiesHouse = getCompaniesHouseService()
    const results: unknown[] = []
    const sources = {
      cache: 0,
      api: 0,
      created: 0
    }

    // Step 1: Search local database first (if cache enabled)
    if (useCache) {
      // Search by company number (exact match)
      const { data: exactMatch } = await supabase
        .from('businesses')
        .select('*')
        .eq('company_number', searchTerm.toUpperCase())
        .single()

      if (exactMatch) {
        // Check if cache is still valid
        if (exactMatch.companies_house_last_updated && 
            companiesHouse.isCacheValid(exactMatch.companies_house_last_updated)) {
          results.push({
            ...exactMatch,
            source: 'cache',
            cache_age: getAgeInHours(exactMatch.companies_house_last_updated)
          })
          sources.cache++
        } else {
          // Cache expired, add to results but mark for refresh
          results.push({
            ...exactMatch,
            source: 'cache_expired',
            needs_refresh: true,
            cache_age: getAgeInHours(exactMatch.companies_house_last_updated)
          })
        }
      }

      // Search by name (partial match)
      if (results.length === 0) {
        const { data: nameMatches } = await supabase
          .from('businesses')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .limit(limit)
          .range(offset, offset + limit - 1)

        if (nameMatches && nameMatches.length > 0) {
          for (const match of nameMatches) {
            const isValidCache = match.companies_house_last_updated && 
              companiesHouse.isCacheValid(match.companies_house_last_updated)
            
            results.push({
              ...match,
              source: isValidCache ? 'cache' : 'cache_expired',
              needs_refresh: !isValidCache,
              cache_age: getAgeInHours(match.companies_house_last_updated)
            })
            
            if (isValidCache) {
              sources.cache++
            }
          }
        }
      }
    }

    // Step 2: If no cached results or cache disabled, search Companies House API
    if (results.length === 0 || !useCache) {
      try {
        let apiResults
        try {
          apiResults = await companiesHouse.searchCompanies(searchTerm, limit, offset)
        } catch (apiSearchError) {
          console.error('Companies House search API error:', {
            error: apiSearchError,
            message: apiSearchError instanceof Error ? apiSearchError.message : 'Unknown error',
            query: searchTerm
          })
          
          // If in demo mode, return mock data
          if (demo) {
            const mockResults = getMockCompanyResults(searchTerm)
            return NextResponse.json({
              success: true,
              results: mockResults,
              sources: { cache: 0, api: 0, created: 0, mock: mockResults.length },
              warning: 'Using demo data (Companies House API unavailable)',
              message: `Found ${mockResults.length} demo companies`
            })
          }
          
          // If API key is not configured or API fails, return cached results if any
          if (results.length > 0) {
            return NextResponse.json({
              success: true,
              results,
              sources,
              warning: 'Companies House API unavailable, showing cached results only',
              message: `Found ${results.length} cached companies`
            })
          }
          // Return empty results if no cache and API fails
          const errorMessage = apiSearchError instanceof Error ? apiSearchError.message : 'Unknown error'
          return NextResponse.json({
            success: true,
            results: [],
            sources,
            warning: `Companies House API error: ${errorMessage}`,
            message: 'No results found'
          })
        }
        
        // Log API call for auditing (only if user is authenticated)
        if (user && !demo) {
          try {
            await supabase.from('api_audit_log').insert({
              api_name: 'companies_house',
              endpoint: '/search/companies',
              request_params: { query: searchTerm, limit, offset },
              response_status: 200,
              response_data: { total_results: apiResults.total_results },
              user_id: user.id
            })
          } catch (logError) {
            console.log('Failed to log API call:', logError)
            // Continue even if logging fails
          }
        }

        // Process API results
        for (const apiCompany of apiResults.items) {
          // Check if company already exists in database
          const { data: existing } = await supabase
            .from('businesses')
            .select('id')
            .eq('company_number', apiCompany.company_number)
            .single()

          if (existing) {
            // Update existing record with latest data
            const companyProfile = await companiesHouse.getCompanyProfile(apiCompany.company_number)
            const updates = companiesHouse.formatForDatabase(companyProfile)
            
            await supabase
              .from('businesses')
              .update(updates)
              .eq('id', existing.id)

            const { data: updated } = await supabase
              .from('businesses')
              .select('*')
              .eq('id', existing.id)
              .single()

            results.push({
              ...updated,
              source: 'api_updated',
              cache_age: 0
            })
            sources.api++
          } else {
            // Create new business record
            const companyProfile = await companiesHouse.getCompanyProfile(apiCompany.company_number)
            const newBusiness = companiesHouse.formatForDatabase(companyProfile)
            
            const { data: created, error } = await supabase
              .from('businesses')
              .insert({
                ...newBusiness,
                slug: generateSlug(companyProfile.company_name),
                verified_at: new Date().toISOString()
              })
              .select()
              .single()

            if (!error && created) {
              results.push({
                ...created,
                source: 'api_created',
                cache_age: 0
              })
              sources.created++
            }
          }
        }

        // Add pagination info
        const pagination = {
          total: apiResults.total_results,
          page: Math.floor(offset / limit) + 1,
          pages: Math.ceil(apiResults.total_results / limit),
          per_page: limit
        }

        return NextResponse.json({
          success: true,
          results,
          sources,
          pagination,
          message: `Found ${results.length} companies`
        })

      } catch (apiError) {
        console.error('Companies House API error:', apiError)
        
        // Log failed API call (only if user is authenticated)
        if (user && !demo) {
          try {
            await supabase.from('api_audit_log').insert({
              api_name: 'companies_house',
              endpoint: '/search/companies',
              request_params: { query: searchTerm, limit, offset },
              response_status: 500,
              error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
              user_id: user.id
            })
          } catch (logError) {
            console.log('Failed to log API error:', logError)
            // Continue even if logging fails
          }
        }

        // If API fails but we have cached results, return them
        if (results.length > 0) {
          return NextResponse.json({
            success: true,
            results,
            sources,
            warning: 'Companies House API unavailable, showing cached results only',
            message: `Found ${results.length} cached companies`
          })
        }

        return NextResponse.json(
          { error: 'Failed to search companies', details: apiError instanceof Error ? apiError.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // Return cached results if we have them
    return NextResponse.json({
      success: true,
      results,
      sources,
      message: `Found ${results.length} companies`
    })

  } catch (error) {
    console.error('Company search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for simple searches
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Forward to POST handler
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ query, limit, offset }),
      headers: request.headers
    })

    return POST(postRequest)
  } catch (error) {
    console.error('Company search GET error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}