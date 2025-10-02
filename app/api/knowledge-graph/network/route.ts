/**
 * Knowledge Graph™ API - Entity Network
 * Get entity relationship network for visualization
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GraphQueryEngine } from '@/lib/knowledge-graph/query/graph-query-engine'
import type { GetEntityNetworkRequest } from '@/lib/knowledge-graph/types'

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
    const entityId = searchParams.get('entity_id')

    if (!entityId) {
      return NextResponse.json(
        { error: 'Missing required parameter: entity_id' },
        { status: 400 }
      )
    }

    const networkRequest: GetEntityNetworkRequest = {
      entity_id: entityId,
      max_depth: searchParams.get('max_depth')
        ? parseInt(searchParams.get('max_depth')!)
        : 1,
      max_nodes: searchParams.get('max_nodes')
        ? parseInt(searchParams.get('max_nodes')!)
        : 50,
      include_facts: searchParams.get('include_facts') === 'true'
    }

    // Get entity network
    const result = await GraphQueryEngine.getEntityNetwork(networkRequest, user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Entity network error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Network fetch failed' },
      { status: 500 }
    )
  }
}
