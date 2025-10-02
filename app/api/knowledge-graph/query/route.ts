/**
 * Knowledge Graph™ API - Query
 * Natural language queries against the knowledge graph
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GraphQueryEngine } from '@/lib/knowledge-graph/query/graph-query-engine'
import type { GraphQueryRequest } from '@/lib/knowledge-graph/types'

export async function POST(request: NextRequest) {
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

    // Parse request
    const body: GraphQueryRequest = await request.json()

    if (!body.query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      )
    }

    // Execute query
    const result = await GraphQueryEngine.query(body, user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Knowledge query error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Query failed' },
      { status: 500 }
    )
  }
}
