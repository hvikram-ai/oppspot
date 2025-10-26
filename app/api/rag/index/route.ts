/**
 * RAG Indexing API
 * Indexes user context into Pinecone
 *
 * POST /api/rag/index
 * Body: { force_refresh?: boolean, types?: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContextIndexer } from '@/lib/ai/rag/user-context-indexer'
import { getErrorMessage } from '@/lib/utils/error-handler'

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
    const body = await request.json().catch(() => ({}))
    const { force_refresh = false, types } = body

    console.log(`[RAG Index API] Starting indexing for user ${user.id}`)

    // Index user context
    const indexer = getUserContextIndexer()
    const result = await indexer.indexUserContext(user.id, {
      forceRefresh: force_refresh,
      includeTypes: types
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Indexing failed',
          details: result.errors
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      items_indexed: result.itemsIndexed,
      duration_ms: result.duration_ms,
      message: `Successfully indexed ${result.itemsIndexed.total} items`
    })
  } catch (error) {
    console.error('[RAG Index API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to index user context',
        details: getErrorMessage(error)
      },
      { status: 500 }
    )
  }
}

// GET: Check indexing status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get Pinecone stats
    const { getPineconeClient } = await import('@/lib/ai/rag/pinecone-client')
    const pinecone = getPineconeClient()

    const stats = await pinecone.getNamespaceStats(user.id)

    return NextResponse.json({
      user_id: user.id,
      namespace: stats.namespace,
      vectors_count: stats.vectorCount,
      status: stats.vectorCount > 0 ? 'indexed' : 'not_indexed'
    })
  } catch (error) {
    console.error('[RAG Index API] Error getting stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to get indexing status',
        details: getErrorMessage(error)
      },
      { status: 500 }
    )
  }
}
