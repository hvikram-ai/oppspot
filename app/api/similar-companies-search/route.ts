/**
 * Direct Search API for Similar Companies - No database persistence
 * This endpoint directly searches for similar companies without saving to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { WebSearchService } from '@/lib/opp-scan/services/web-search-service'
import { CompanySearchQuery } from '@/lib/opp-scan/core/similarity-interfaces'

// Initialize services
let webSearchService: WebSearchService

function getWebSearchService(): WebSearchService {
  if (!webSearchService) {
    webSearchService = new WebSearchService()
  }
  return webSearchService
}

// POST: Search for similar companies directly
export async function POST(request: NextRequest) {
  try {
    console.log('[SEARCH API] Starting direct similar companies search')
    
    // Parse request body
    const body = await request.json()
    const {
      targetCompanyName,
      maxResults = 10
    } = body

    // Validate required fields
    if (!targetCompanyName || typeof targetCompanyName !== 'string') {
      return NextResponse.json(
        { error: 'Target company name is required and must be a string' },
        { status: 400 }
      )
    }

    if (targetCompanyName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    console.log(`[SEARCH API] Searching for companies similar to: ${targetCompanyName}`)

    // Create search query
    const searchQuery: CompanySearchQuery = {
      query: targetCompanyName.trim(),
      maxResults: maxResults
    }

    // Execute search
    const searchService = getWebSearchService()
    const searchResults = await searchService.searchCompanies(searchQuery)
    
    console.log(`[SEARCH API] Found ${searchResults.length} results`)
    
    // Log which sources returned results
    const sources = [...new Set(searchResults.map(r => r.source))]
    console.log(`[SEARCH API] Results from sources: ${sources.join(', ')}`)
    
    return NextResponse.json({
      success: true,
      targetCompany: targetCompanyName.trim(),
      totalResults: searchResults.length,
      sources: sources,
      results: searchResults.map(result => ({
        name: result.company.name,
        website: result.company.website,
        country: result.company.country,
        description: result.company.description,
        relevanceScore: result.relevanceScore,
        source: result.source,
        snippet: result.snippet,
        industryCodes: result.company.industryCodes,
        foundingYear: result.company.foundingYear,
        employees: result.company.employees,
        revenue: result.company.revenue
      }))
    })

  } catch (error) {
    console.error('[SEARCH API] Search error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search for similar companies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET: Test endpoint status
export async function GET() {
  // Check which APIs are configured
  const apis = {
    searchapi: !!process.env.SEARCHAPI_KEY,
    companiesHouse: !!process.env.COMPANIES_HOUSE_API_KEY,
    google: !!process.env.GOOGLE_SEARCH_API_KEY,
    bing: !!process.env.BING_SEARCH_API_KEY,
    clearbit: !!process.env.CLEARBIT_API_KEY,
    crunchbase: !!process.env.CRUNCHBASE_API_KEY
  }
  
  const configuredApis = Object.entries(apis)
    .filter(([, configured]) => configured)
    .map(([name]) => name)
  
  return NextResponse.json({
    status: 'ok',
    message: 'Similar Companies Search API is running',
    configuredApis,
    usage: 'POST to this endpoint with { targetCompanyName: "company name", maxResults: 10 }'
  })
}