/**
 * RAG Health Check API
 * Check pgvector (Supabase) connection and system status
 *
 * GET /api/rag/health
 */

import { NextResponse } from 'next/server'
import { getPgVectorClient as getPineconeClient } from '@/lib/ai/rag/pgvector-client'

export async function GET() {
  try {
    const pinecone = getPineconeClient()

    // Check Pinecone health
    const health = await pinecone.healthCheck()

    if (health.healthy) {
      return NextResponse.json({
        status: 'healthy',
        pinecone: {
          connected: true,
          index: health.indexName,
          dimension: health.dimension
        },
        features: {
          indexing: true,
          query: true,
          rag: true
        },
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        {
          status: 'unhealthy',
          pinecone: {
            connected: false,
            error: health.error
          },
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('[RAG Health] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
