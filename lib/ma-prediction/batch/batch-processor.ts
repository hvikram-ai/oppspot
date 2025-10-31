/**
 * Batch Processor for M&A Predictions
 *
 * Processes companies in batches for nightly pre-computation:
 * - Processes 100 companies in parallel (configurable)
 * - Tracks progress (batch ID, total/processed/success/failed counts)
 * - Error handling with retry logic
 * - Queue-based processing for large batches
 *
 * Part of T023 implementation
 */

import { generatePrediction } from '../ma-prediction-service';
import { getQueuedCompanies, markQueueJobComplete, markQueueJobFailed, queueRecalculation } from '../repository/prediction-repository';
import { createClient } from '@/lib/supabase/server';

export interface BatchResult {
  batch_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_companies: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  progress_percentage: number;
  started_at: string;
  completed_at?: string;
  estimated_completion?: string;
  duration_seconds?: number;
  error_summary?: {
    insufficient_data: number;
    api_timeouts: number;
    unknown_errors: number;
  };
}

export interface BatchStatus extends BatchResult {}

/**
 * Process a batch of companies
 *
 * @param companyIds - Array of company UUIDs to process
 * @param batchSize - Number to process in parallel (default 100, max 500)
 * @returns Batch result with statistics
 */
export async function processBatch(
  companyIds: string[],
  batchSize: number = 100
): Promise<BatchResult> {
  const batchId = generateBatchId();
  const startTime = new Date();

  // Cap batch size
  const effectiveBatchSize = Math.min(Math.max(batchSize, 10), 500);

  const result: BatchResult = {
    batch_id: batchId,
    status: 'processing',
    total_companies: companyIds.length,
    processed_count: 0,
    success_count: 0,
    failed_count: 0,
    progress_percentage: 0,
    started_at: startTime.toISOString(),
    error_summary: {
      insufficient_data: 0,
      api_timeouts: 0,
      unknown_errors: 0
    }
  };

  // Store batch status in memory (in production, use Redis or database)
  batchStatusStore.set(batchId, result);

  // Process in chunks
  const chunks = chunkArray(companyIds, effectiveBatchSize);

  for (const chunk of chunks) {
    // Process chunk in parallel
    const chunkResults = await Promise.allSettled(
      chunk.map(companyId => processCompanyWithRetry(companyId))
    );

    // Update counts
    for (const chunkResult of chunkResults) {
      result.processed_count++;

      if (chunkResult.status === 'fulfilled') {
        result.success_count++;
      } else {
        result.failed_count++;

        // Categorize error
        const error = chunkResult.reason;
        if (error?.message?.includes('Insufficient data')) {
          result.error_summary!.insufficient_data++;
        } else if (error?.message?.includes('timeout') || error?.message?.includes('ECONNREFUSED')) {
          result.error_summary!.api_timeouts++;
        } else {
          result.error_summary!.unknown_errors++;
        }
      }
    }

    // Update progress
    result.progress_percentage = Math.round((result.processed_count / result.total_companies) * 100);
    batchStatusStore.set(batchId, result);
  }

  // Mark as completed
  const endTime = new Date();
  result.status = 'completed';
  result.completed_at = endTime.toISOString();
  result.duration_seconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  result.progress_percentage = 100;

  batchStatusStore.set(batchId, result);

  return result;
}

/**
 * Process all active companies in the database
 *
 * Fetches all companies and processes them in batches
 *
 * @returns Batch result
 */
export async function processAllCompanies(): Promise<BatchResult> {
  const supabase = await createClient();

  // Fetch all active company IDs
  const { data: companies, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('company_status', 'active')
    .not('revenue', 'is', null); // Only companies with some financial data

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`);
  }

  const companyIds = (companies || []).map(c => c.id);

  if (companyIds.length === 0) {
    throw new Error('No active companies found to process');
  }

  return await processBatch(companyIds, 100);
}

/**
 * Get batch processing status
 *
 * @param batchId - Batch ID to query
 * @returns Batch status or null if not found
 */
export async function getBatchStatus(batchId: string): Promise<BatchStatus | null> {
  return batchStatusStore.get(batchId) || null;
}

/**
 * Process queued companies from ma_prediction_queue
 *
 * Pulls pending jobs from queue and processes them
 *
 * @param batchSize - Number to process at once
 * @returns Number of companies processed
 */
export async function processQueue(batchSize: number = 100): Promise<number> {
  const companyIds = await getQueuedCompanies(batchSize);

  if (companyIds.length === 0) {
    return 0;
  }

  // Process each company
  const results = await Promise.allSettled(
    companyIds.map(companyId => processQueuedCompany(companyId))
  );

  return results.filter(r => r.status === 'fulfilled').length;
}

/**
 * Process a single company from the queue
 */
async function processQueuedCompany(companyId: string): Promise<void> {
  try {
    await generatePrediction(companyId);
    await markQueueJobComplete(companyId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await markQueueJobFailed(companyId, errorMessage);
    throw error;
  }
}

/**
 * Process a single company with retry logic
 */
async function processCompanyWithRetry(companyId: string, retries: number = 1): Promise<void> {
  try {
    await generatePrediction(companyId);
  } catch (error) {
    if (retries > 0) {
      // Retry once for temporary errors
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch')) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
        return await processCompanyWithRetry(companyId, retries - 1);
      }
    }

    // Re-throw error after retry attempts exhausted
    throw error;
  }
}

/**
 * Generate unique batch ID
 */
function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * In-memory batch status store
 * In production, replace with Redis or database table
 */
const batchStatusStore = new Map<string, BatchResult>();

// Clean up old batch statuses after 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [batchId, result] of batchStatusStore.entries()) {
    const startTime = new Date(result.started_at).getTime();
    if (now - startTime > 24 * 60 * 60 * 1000) {
      batchStatusStore.delete(batchId);
    }
  }
}, 60 * 60 * 1000); // Run every hour
