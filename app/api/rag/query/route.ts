/**
 * RAG Query API
 * Query with user context from Pinecone
 *
 * POST /api/rag/query
 * Body: {
 *   query: string
 *   use_rag?: boolean
 *   max_context?: number
 *   include_explanation?: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRAGQueryService } from '@/lib/ai/rag/rag-query-service'
import { getErrorMessage } from '@/lib/utils/error-handler'
import { z } from 'zod'

const querySchema = z.object({
  query: z.string().min(1).max(500),
  use_rag: z.boolean().default(true),
  max_context: z.number().int().min(1).max(20).default(10),
  include_explanation: z.boolean().default(true),
  context_types: z.array(z.enum(['saved_company', 'won_deal', 'lost_deal', 'icp', 'research', 'follower'])).optional()
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

    // Parse and validate request
    const body = await request.json()
    const validated = querySchema.parse(body)

    console.log(`[RAG Query API] Query from user ${user.id}: "${validated.query}"`)

    const ragService = getRAGQueryService()

    // Query with or without RAG based on flag
    if (validated.use_rag) {
      const result = await ragService.queryWithContext({
        query: validated.query,
        userId: user.id,
        maxContextItems: validated.max_context,
        includeExplanation: validated.include_explanation,
        contextTypes: validated.context_types
      })

      return NextResponse.json({
        success: true,
        query: validated.query,
        response: result.response,
        context_used: result.contextUsed.map(c => ({
          type: c.type,
          content: c.content,
          similarity: c.similarity
        })),
        explanation: result.explanation,
        metadata: result.metadata,
        rag_enabled: true
      })
    } else {
      // Query without RAG (for comparison)
      const response = await ragService.queryWithoutContext(validated.query)

      return NextResponse.json({
        success: true,
        query: validated.query,
        response,
        context_used: [],
        rag_enabled: false
      })
    }
  } catch (error: unknown) {
    console.error('[RAG Query API] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.issues
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to process query',
        details: getErrorMessage(error)
      },
      { status: 500 }
    )
  }
}

// GET: Quick test endpoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || searchParams.get('query')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter required. Use ?q=your query' },
      { status: 400 }
    )
  }

  // Call POST internally
  return POST(
    new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ query })
    }) as NextRequest
  )
}
