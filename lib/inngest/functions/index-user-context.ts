/**
 * Index User Context Function
 * Background job to index user data into Pinecone for RAG
 *
 * Triggers:
 * - User saves company
 * - Deal closed
 * - Research completed
 * - ICP updated
 * - Manual trigger
 */

import { inngest } from '@/lib/inngest/client'
import { getUserContextIndexer, type IndexingOptions } from '@/lib/ai/rag/user-context-indexer'
import { createClient } from '@/lib/supabase/server'

// Rate limit: 1 index per user per minute
const INDEX_COOLDOWN_KEY = (userId: string) => `rag-index-cooldown-${userId}`

export const indexUserContextFunction = inngest.createFunction(
  {
    id: 'rag-index-user-context',
    name: 'Index User Context for RAG',
    retries: 3,
    rateLimit: {
      limit: 60, // 60 indexing jobs per minute across all users
      period: '1m'
    }
  },
  { event: 'rag/index.requested' },
  async ({ event, step }) => {
    const { userId, types, forceRefresh = false } = event.data as {
      userId: string
      types?: Array<'saved_companies' | 'deals' | 'icp' | 'research' | 'followers'>
      forceRefresh?: boolean
    }

    // Step 1: Check cooldown (prevent duplicate jobs)
    const canIndex = await step.run('check-cooldown', async () => {
      if (forceRefresh) return true // Skip cooldown for manual refresh

      const supabase = await createClient()

      // Check last indexed time
      const { data: profile } = await supabase
        .from('profiles')
        .select('rag_indexed_at')
        .eq('id', userId)
        .single() as { data: { rag_indexed_at: string | null } | null }

      if (!profile?.rag_indexed_at) return true // Never indexed

      const lastIndexed = new Date(profile.rag_indexed_at)
      const now = new Date()
      const diffSeconds = (now.getTime() - lastIndexed.getTime()) / 1000

      // Allow re-index only after 60 seconds
      if (diffSeconds < 60) {
        console.log(`[RAG Index] Skipping - indexed ${diffSeconds.toFixed(0)}s ago`)
        return false
      }

      return true
    })

    if (!canIndex) {
      return {
        userId,
        skipped: true,
        reason: 'Indexed too recently (cooldown active)'
      }
    }

    // Step 2: Index user context
    const result = await step.run('index-context', async () => {
      const indexer = getUserContextIndexer()

      const options: IndexingOptions = {
        forceRefresh,
        includeTypes: types
      }

      return await indexer.indexUserContext(userId, options)
    })

    // Step 3: Update user metadata
    await step.run('update-metadata', async () => {
      const supabase = await createClient()

      await supabase
        .from('profiles')
        .update({
          rag_indexed_at: new Date().toISOString(),
          rag_indexed_count: result.itemsIndexed.total
        } as { rag_indexed_at: string; rag_indexed_count: number })
        .eq('id', userId)
    })

    // Step 4: Log result
    await step.run('log-result', async () => {
      console.log(`[RAG Index] User ${userId}: Indexed ${result.itemsIndexed.total} items in ${result.duration_ms}ms`)

      if (result.errors.length > 0) {
        console.error(`[RAG Index] Errors:`, result.errors)
      }
    })

    return {
      userId,
      success: result.success,
      itemsIndexed: result.itemsIndexed,
      duration_ms: result.duration_ms,
      errors: result.errors
    }
  }
)

/**
 * Batch Index Function
 * Index multiple users in batch (for migrations or admin operations)
 */
export const batchIndexUserContextFunction = inngest.createFunction(
  {
    id: 'rag-batch-index-users',
    name: 'Batch Index Users for RAG',
    retries: 1
  },
  { event: 'rag/batch-index.requested' },
  async ({ event, step }) => {
    const { userIds, types } = event.data as {
      userIds: string[]
      types?: Array<'saved_companies' | 'deals' | 'icp' | 'research' | 'followers'>
    }

    console.log(`[RAG Batch Index] Starting batch index for ${userIds.length} users`)

    // Send individual index events (Inngest will handle rate limiting)
    const results = await step.run('send-index-events', async () => {
      const promises = userIds.map(userId =>
        inngest.send({
          name: 'rag/index.requested',
          data: { userId, types, forceRefresh: true }
        })
      )

      return await Promise.allSettled(promises)
    })

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[RAG Batch Index] Completed: ${succeeded} succeeded, ${failed} failed`)

    return {
      total: userIds.length,
      succeeded,
      failed,
      results
    }
  }
)
