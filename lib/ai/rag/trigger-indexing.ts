/**
 * RAG Indexing Triggers
 * Helper functions to trigger background indexing jobs
 *
 * Usage:
 * ```typescript
 * import { triggerUserIndexing } from '@/lib/ai/rag/trigger-indexing'
 *
 * // In your API route after user saves company:
 * await triggerUserIndexing(userId, ['saved_companies'])
 * ```
 */

import { inngest } from '@/lib/inngest/client'

export interface TriggerIndexingOptions {
  userId: string
  types?: Array<'saved_companies' | 'deals' | 'icp' | 'research' | 'followers'>
  forceRefresh?: boolean
}

/**
 * Trigger background indexing for a user
 * Non-blocking - returns immediately
 */
export async function triggerUserIndexing(
  userId: string,
  types?: Array<'saved_companies' | 'deals' | 'icp' | 'research' | 'followers'>,
  forceRefresh = false
): Promise<void> {
  try {
    await inngest.send({
      name: 'rag/index.requested',
      data: {
        userId,
        types,
        forceRefresh
      }
    })

    console.log(`[RAG] Triggered indexing for user ${userId}, types: ${types?.join(', ') || 'all'}`)
  } catch (error) {
    console.error('[RAG] Failed to trigger indexing:', error)
    // Don't throw - indexing failures shouldn't break main flow
  }
}

/**
 * Trigger batch indexing for multiple users
 * Useful for migrations or admin operations
 */
export async function triggerBatchIndexing(
  userIds: string[],
  types?: Array<'saved_companies' | 'deals' | 'icp' | 'research' | 'followers'>
): Promise<void> {
  try {
    await inngest.send({
      name: 'rag/batch-index.requested',
      data: {
        userIds,
        types
      }
    })

    console.log(`[RAG] Triggered batch indexing for ${userIds.length} users`)
  } catch (error) {
    console.error('[RAG] Failed to trigger batch indexing:', error)
  }
}

/**
 * Trigger indexing after company save
 * Use this in saved_businesses API
 */
export async function onCompanySaved(userId: string): Promise<void> {
  await triggerUserIndexing(userId, ['saved_companies'])
}

/**
 * Trigger indexing after deal close
 * Use this in deals API
 */
export async function onDealClosed(userId: string): Promise<void> {
  await triggerUserIndexing(userId, ['deals'])
}

/**
 * Trigger indexing after research complete
 * Use this in research API
 */
export async function onResearchCompleted(userId: string): Promise<void> {
  await triggerUserIndexing(userId, ['research'])
}

/**
 * Trigger indexing after ICP update
 * Use this in ICP API
 */
export async function onICPUpdated(userId: string, orgId: string): Promise<void> {
  // Get all users in org
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('org_id', orgId) as { data: { id: string }[] | null }

    if (users && users.length > 0) {
      await triggerBatchIndexing(users.map(u => u.id), ['icp'])
    }
  } catch (error) {
    console.error('[RAG] Failed to trigger ICP indexing:', error)
  }
}

/**
 * Trigger full re-index for a user
 * Use for manual refresh or settings change
 */
export async function onUserRequestsReindex(userId: string): Promise<void> {
  await triggerUserIndexing(userId, undefined, true) // All types, force refresh
}
