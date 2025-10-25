/**
 * Enrichment Worker
 * Processes data enrichment jobs from the queue
 */

import { Job } from 'bull'
import { getEnrichmentQueue } from '../queues/enrichment-queue'
import type { EnrichmentJobData, EnrichmentJobResult } from '@/types/jobs'
import { DataEnrichmentService } from '@/lib/services/data-enrichment'
import { createClient } from '@/lib/supabase/server'

/**
 * Process an enrichment job
 */
export async function processEnrichmentJob(
  job: Job<EnrichmentJobData>
): Promise<EnrichmentJobResult> {
  const startTime = Date.now()

  try {
    console.log(`[Enrichment Worker] Starting job ${job.id} for business ${job.data.business_name}`)

    // Update progress
    await job.progress(10)

    // Get supabase client
    const supabase = await createClient()

    // Fetch business
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', job.data.business_id)
      .single()

    if (fetchError || !business) {
      throw new Error(`Business not found: ${job.data.business_id}`)
    }

    // Update progress
    await job.progress(20)

    // Create enrichment service
    const enrichmentService = new DataEnrichmentService()

    // Get completeness before
    const statsBefore = enrichmentService.getEnrichmentStats(business as unknown)

    // Update progress
    await job.progress(30)

    // Enrich business
    console.log(
      `[Enrichment Worker] Enriching ${job.data.business_name} with sources: ${job.data.sources?.join(', ') || 'all'}`
    )

    const results = await enrichmentService.enrichBusiness(
      business as unknown,
      job.data.sources
    )

    // Update progress
    await job.progress(70)

    // Merge results
    const merged = enrichmentService.mergeEnrichmentResults(results)

    // Update database if we have enriched data
    if (Object.keys(merged).length > 0) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(merged)
        .eq('id', job.data.business_id)

      if (updateError) {
        console.error('[Enrichment Worker] Failed to update database:', updateError)
        throw updateError
      }
    }

    // Update progress
    await job.progress(90)

    // Get completeness after
    const { data: updatedBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', job.data.business_id)
      .single()

    const statsAfter = enrichmentService.getEnrichmentStats(updatedBusiness as unknown)

    // Update progress: Done
    await job.progress(100)

    console.log(`[Enrichment Worker] Enrichment completed for ${job.data.business_name}`)

    const processingTime = Date.now() - startTime

    return {
      business_id: job.data.business_id,
      success: true,
      sources_processed: results.map((r) => r.source),
      sources_successful: results.filter((r) => r.success).map((r) => r.source),
      sources_failed: results.filter((r) => !r.success).map((r) => r.source),
      fields_enriched: Object.keys(merged),
      completeness_before: statsBefore.completeness,
      completeness_after: statsAfter.completeness,
      processing_time_ms: processingTime,
    }
  } catch (error) {
    console.error(`[Enrichment Worker] Job ${job.id} failed:`, error)

    return {
      business_id: job.data.business_id,
      success: false,
      sources_processed: [],
      sources_successful: [],
      sources_failed: job.data.sources || [],
      fields_enriched: [],
      completeness_before: 0,
      completeness_after: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      processing_time_ms: Date.now() - startTime,
    }
  }
}

/**
 * Start the enrichment worker
 */
export function startEnrichmentWorker(concurrency: number = 5) {
  const queue = getEnrichmentQueue()

  console.log(`[Enrichment Worker] Starting worker with concurrency ${concurrency}`)

  // Process jobs
  queue.process('enrich', concurrency, async (job) => {
    return processEnrichmentJob(job)
  })

  // Event handlers
  queue.on('completed', (job, result: EnrichmentJobResult) => {
    console.log(
      `[Enrichment Worker] Job ${job.id} completed - ${result.fields_enriched.length} fields enriched (${result.processing_time_ms}ms)`
    )
  })

  queue.on('failed', (job, error) => {
    console.error(
      `[Enrichment Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      error.message
    )
  })

  queue.on('stalled', (job) => {
    console.warn(`[Enrichment Worker] Job ${job.id} stalled, will be retried`)
  })

  queue.on('error', (error) => {
    console.error('[Enrichment Worker] Queue error:', error)
  })

  console.log('[Enrichment Worker] Worker started and listening for jobs')

  return queue
}

/**
 * Graceful shutdown
 */
export async function stopEnrichmentWorker() {
  const queue = getEnrichmentQueue()
  console.log('[Enrichment Worker] Shutting down...')
  await queue.close()
  console.log('[Enrichment Worker] Shutdown complete')
}
