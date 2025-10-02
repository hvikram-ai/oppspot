/**
 * Inngest HTTP Endpoint
 * Receives and processes background jobs
 *
 * This endpoint is called by Inngest to execute functions
 */

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'

// Import all Inngest functions
import { executeAgentFunction } from '@/lib/inngest/functions/execute-agent'
import { generateEmbeddingFunction } from '@/lib/inngest/functions/generate-embedding'
import { dailyOpportunityScanFunction } from '@/lib/inngest/functions/daily-opportunity-scan'
import { dailySignalMonitorFunction } from '@/lib/inngest/functions/daily-signal-monitor'

// Serve Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeAgentFunction,
    generateEmbeddingFunction,
    dailyOpportunityScanFunction,
    dailySignalMonitorFunction,
  ],
  streaming: 'allow', // Enable streaming for faster execution
})
