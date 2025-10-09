/**
 * Semantic Search API
 * Natural language search using vector embeddings
 *
 * POST /api/search/semantic
 * Body: { query: string, limit?: number, threshold?: number }
 *
 * Example queries:
 * - "fintech companies in London"
 * - "SaaS startups that raised Series A"
 * - "companies similar to Stripe"
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { z } from 'zod'
import { getErrorMessage } from '@/lib/utils/error-handler'
import type { Row } from '@/lib/supabase/helpers'

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7),
  includeDetails: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request
    const body = await request.json()
    const { query, limit, threshold, includeDetails } = searchSchema.parse(body)

    console.log(`[Semantic Search] Query: "${query}", limit: ${limit}, threshold: ${threshold}`)

    // Perform semantic search
    const results = await embeddingService.semanticSearch(query, {
      limit,
      threshold
    })

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        count: 0,
        results: [],
        message: 'No companies found matching your query. Try lowering the threshold or using different keywords.'
      })
    }

    // Fetch full company details if requested
    let enrichedResults = results

    if (includeDetails) {
      const companyIds = results.map(r => r.id)
      const { data: companies, error: fetchError } = await supabase
        .from('businesses')
        .select('id, name, description, website, categories, sic_codes, address, logo_url')
        .in('id', companyIds)

      if (fetchError) {
        console.error('[Semantic Search] Error fetching details:', fetchError)
        // Continue without details
      } else if (companies) {
        // Merge similarity scores with company data
        enrichedResults = companies.map(company => {
          const result = results.find(r => r.id === company.id)
          return {
            ...company,
            similarity: result?.similarity || 0
          }
        })

        // Sort by similarity (descending)
        enrichedResults.sort((a, b) => b.similarity - a.similarity)
      }
    }

    return NextResponse.json({
      success: true,
      query,
      count: enrichedResults.length,
      results: enrichedResults,
      metadata: {
        threshold,
        limit,
        averageSimilarity: enrichedResults.length > 0
          ? enrichedResults.reduce((sum, r) => sum + r.similarity, 0) / enrichedResults.length
          : 0
      }
    })
  } catch (error: unknown) {
    console.error('[Semantic Search] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Semantic search failed', message: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || searchParams.get('query')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter required. Use ?q=your search query' },
      { status: 400 }
    )
  }

  // Call POST endpoint internally
  const response = await POST(
    new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        query,
        limit: parseInt(searchParams.get('limit') || '20'),
        threshold: parseFloat(searchParams.get('threshold') || '0.7')
      })
    }) as NextRequest
  )

  return response
}
