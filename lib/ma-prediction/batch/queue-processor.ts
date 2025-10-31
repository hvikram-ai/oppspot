/**
 * Queue Processor for M&A Predictions
 *
 * Background processor that polls ma_prediction_queue for pending jobs
 * and processes them automatically.
 *
 * - Polls every 60 seconds
 * - Processes up to 10 jobs per cycle
 * - Updates job status: pending → processing → completed/failed
 *
 * Part of T036 implementation
 */

import { processQueue } from './batch-processor';

let processorInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Start the queue processor
 * Polls every 60 seconds for pending jobs
 */
export function startQueueProcessor(): void {
  if (processorInterval) {
    console.log('[Queue Processor] Already running');
    return;
  }

  console.log('[Queue Processor] Starting...');

  // Process immediately on start
  processQueueCycle();

  // Then process every 60 seconds
  processorInterval = setInterval(() => {
    processQueueCycle();
  }, 60000); // 60 seconds

  console.log('[Queue Processor] Started successfully');
}

/**
 * Stop the queue processor
 */
export function stopQueueProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('[Queue Processor] Stopped');
  }
}

/**
 * Process one cycle of the queue
 */
async function processQueueCycle(): Promise<void> {
  // Skip if already processing
  if (isProcessing) {
    console.log('[Queue Processor] Skipping cycle - previous cycle still running');
    return;
  }

  isProcessing = true;

  try {
    const startTime = Date.now();
    const processedCount = await processQueue(10); // Process up to 10 jobs

    if (processedCount > 0) {
      const duration = Date.now() - startTime;
      console.log(`[Queue Processor] Processed ${processedCount} jobs in ${duration}ms`);
    }
  } catch (error) {
    console.error('[Queue Processor] Error during cycle:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Get processor status
 */
export function getProcessorStatus(): {
  running: boolean;
  currently_processing: boolean;
} {
  return {
    running: processorInterval !== null,
    currently_processing: isProcessing
  };
}
