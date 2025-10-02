/**
 * Knowledge Graph™ API - Extract Knowledge
 * Extract entities, relationships, and facts from content
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EntityExtractor } from '@/lib/knowledge-graph/extraction/entity-extractor'
import type { ExtractKnowledgeRequest } from '@/lib/knowledge-graph/types'

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
    const body: ExtractKnowledgeRequest = await request.json()

    if (!body.content || !body.content_type) {
      return NextResponse.json(
        { error: 'Missing required fields: content, content_type' },
        { status: 400 }
      )
    }

    // Extract knowledge
    const result = await EntityExtractor.extractKnowledge(body, user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Knowledge extraction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    )
  }
}
