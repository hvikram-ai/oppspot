/**
 * RAG User Preferences API
 * Manage user's RAG settings
 *
 * GET  /api/user/rag-preferences - Get current settings
 * PUT  /api/user/rag-preferences - Update settings
 * POST /api/user/rag-preferences/reindex - Trigger manual reindex
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPineconeClient } from '@/lib/ai/rag/pinecone-client'
import { triggerUserIndexing } from '@/lib/ai/rag/trigger-indexing'
import { z } from 'zod'

const preferencesSchema = z.object({
  rag_enabled: z.boolean().optional(),
  rag_auto_index: z.boolean().optional()
})

/**
 * GET: Get user's RAG preferences and stats
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('rag_enabled, rag_auto_index, rag_indexed_at, rag_indexed_count')
      .eq('id', user.id)
      .single() as {
        data: {
          rag_enabled: boolean
          rag_auto_index: boolean
          rag_indexed_at: string | null
          rag_indexed_count: number
        } | null
      }

    // Get Pinecone stats
    let vectorCount = 0
    try {
      const pinecone = getPineconeClient()
      const stats = await pinecone.getNamespaceStats(user.id)
      vectorCount = stats.vectorCount
    } catch (error) {
      console.error('[RAG Preferences] Error getting Pinecone stats:', error)
    }

    return NextResponse.json({
      rag_enabled: profile?.rag_enabled ?? true, // Default true
      rag_auto_index: profile?.rag_auto_index ?? true, // Default true
      indexed_items: vectorCount,
      last_indexed_at: profile?.rag_indexed_at,
      status: vectorCount > 0 ? 'indexed' : 'not_indexed'
    })
  } catch (error) {
    console.error('[RAG Preferences] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Update user's RAG preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const preferences = preferencesSchema.parse(body)

    // Update preferences
    const { error: updateError } = await supabase
      .from('profiles')
      .update(preferences as { rag_enabled?: boolean; rag_auto_index?: boolean })
      .eq('id', user.id)

    if (updateError) {
      console.error('[RAG Preferences] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    // If RAG was just enabled, trigger indexing
    if (preferences.rag_enabled === true) {
      await triggerUserIndexing(user.id, undefined, true) // Full reindex
    }

    return NextResponse.json({
      success: true,
      preferences,
      message: preferences.rag_enabled === true
        ? 'RAG enabled. Indexing your data in the background.'
        : 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('[RAG Preferences] PUT error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

/**
 * POST: Trigger manual reindex
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Trigger reindex
    await triggerUserIndexing(user.id, undefined, true) // All types, force refresh

    return NextResponse.json({
      success: true,
      message: 'Reindexing started. This may take a few seconds.',
      user_id: user.id
    })
  } catch (error) {
    console.error('[RAG Preferences] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger reindex' },
      { status: 500 }
    )
  }
}
