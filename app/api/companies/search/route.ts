import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompaniesHouseService } from '@/lib/services/companies-house'
import { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

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
      query, 
      useCache = true, 
      limit = 20,
      offset = 0 
    } = body

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const searchTerm = query.trim()
    const companiesHouse = new CompaniesHouseService()
    const results: any[] = []
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
        const apiResults = await companiesHouse.searchCompanies(searchTerm, limit, offset)
        
        // Log API call for auditing
        await supabase.from('api_audit_log').insert({
          api_name: 'companies_house',
          endpoint: '/search/companies',
          request_params: { query: searchTerm, limit, offset },
          response_status: 200,
          response_data: { total_results: apiResults.total_results },
          user_id: user.id
        })

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
        
        // Log failed API call
        await supabase.from('api_audit_log').insert({
          api_name: 'companies_house',
          endpoint: '/search/companies',
          request_params: { query: searchTerm, limit, offset },
          response_status: 500,
          error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
          user_id: user.id
        })

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