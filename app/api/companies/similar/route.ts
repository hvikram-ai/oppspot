/**
 * Similar Companies API
 * Find companies similar to a given company using vector similarity
 *
 * GET /api/companies/similar?companyId=uuid&limit=20&threshold=0.7
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { z } from 'zod'
import { getErrorMessage } from '@/lib/utils/error-handler'
import type { Row } from '@/lib/supabase/helpers'

const querySchema = z.object({
  companyId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7)
})

export async function GET(request: NextRequest) {
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('companyId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const threshold = parseFloat(searchParams.get('threshold') || '0.7')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId query parameter required' },
        { status: 400 }
      )
    }

    const params = querySchema.parse({ companyId, limit, threshold })

    // Check if company has embedding
    const hasEmbedding = await embeddingService.hasEmbedding(params.companyId)

    if (!hasEmbedding) {
      return NextResponse.json(
        {
          error: 'Company does not have an embedding generated yet',
          companyId: params.companyId,
          suggestion: 'Generate embedding first using POST /api/embeddings/generate'
        },
        { status: 400 }
      )
    }

    // Find similar companies
    const results = await embeddingService.findSimilarCompanies(params.companyId, {
      limit: params.limit,
      threshold: params.threshold
    }) as Array<{ id: string; similarity: number }>

    // Fetch full company details
    const companyIds = results.map(r => r.id)
    const { data: companies, error: fetchError } = await supabase
      .from('businesses')
      .select('id, name, description, website, categories, sic_codes, address, logo_url')
      .in('id', companyIds)

    if (fetchError) {
      throw new Error(`Failed to fetch company details: ${fetchError.message}`)
    }

    // Merge similarity scores with company data
    const enrichedResults = companies?.map(company => {
      const result = results.find(r => r.id === company.id)
      return {
        ...company,
        similarity: result?.similarity || 0
      }
    }) || []

    // Sort by similarity (descending)
    enrichedResults.sort((a, b) => b.similarity - a.similarity)

    // Get the source company info
    const { data: sourceCompany, error: sourceCompanyError } = await supabase
      .from('businesses')
      .select('id, name, description, categories, sic_codes')
      .eq('id', params.companyId)
      .single()

    return NextResponse.json({
      success: true,
      sourceCompany,
      count: enrichedResults.length,
      results: enrichedResults,
      metadata: {
        threshold: params.threshold,
        limit: params.limit,
        averageSimilarity: enrichedResults.length > 0
          ? enrichedResults.reduce((sum, r) => sum + r.similarity, 0) / enrichedResults.length
          : 0
      }
    })
  } catch (error: unknown) {
    console.error('[Similar Companies] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to find similar companies', message: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
