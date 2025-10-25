/**
 * Agent Trigger Helper
 * Helper functions to trigger agents via Inngest
 */

import { inngest } from './client'

/**
 * Trigger an agent to run in the background
 */
export async function triggerAgent(
  agentId: string,
  orgId: string,
  input?: Record<string, unknown>
) {
  await inngest.send({
    name: 'agent.execute',
    data: {
      agentId,
      orgId,
      input
    }
  })

  console.log(`[Inngest] Triggered agent ${agentId}`)
}

/**
 * Trigger embedding generation for a company
 */
export async function triggerEmbeddingGeneration(
  companyId: string,
  options?: {
    priority?: 'high' | 'normal' | 'low'
    model?: string
  }
) {
  await inngest.send({
    name: 'company.embedding.generate',
    data: {
      companyId,
      priority: options?.priority,
      model: options?.model
    }
  })

  console.log(`[Inngest] Triggered embedding generation for company ${companyId}`)
}

/**
 * Trigger batch embedding generation
 */
export async function triggerBatchEmbeddings(
  options: {
    companyIds?: string[]
    generateAll?: boolean
    limit?: number
    model?: string
  }
) {
  await inngest.send({
    name: 'company.embedding.generate.batch',
    data: options
  })

  console.log(`[Inngest] Triggered batch embedding generation`)
}
