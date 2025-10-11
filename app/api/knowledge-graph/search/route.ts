/**
 * Knowledge Graph™ API - Semantic Search
 * Vector-based semantic search across knowledge entities
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GraphQueryEngine } from '@/lib/knowledge-graph/query/graph-query-engine'
import type { SemanticSearchRequest } from '@/lib/knowledge-graph/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required parameter: q' },
        { status: 400 }
      )
    }

    const searchRequest: SemanticSearchRequest = {
      query,
      entity_type: (searchParams.get('entity_type') as 'company' | 'person' | 'product' | 'event' | null) || undefined,
      similarity_threshold: searchParams.get('threshold')
        ? parseFloat(searchParams.get('threshold')!)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined
    }

    // Execute semantic search
    const result = await GraphQueryEngine.semanticSearch(searchRequest, user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Semantic search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
