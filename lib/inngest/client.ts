/**
 * Inngest Client
 * Durable workflow engine for background jobs
 *
 * Events:
 * - agent.execute - Run an agent
 * - agent.schedule - Schedule recurring agent execution
 * - company.embedding.generate - Generate embeddings
 * - signal.detected - Buying signal detected
 */

import { Inngest, EventSchemas } from 'inngest'

// Define event schemas for type safety
type Events = {
  // Agent execution
  'agent.execute': {
    data: {
      agentId: string
      orgId: string
      input?: Record<string, any>
    }
  }

  // Scheduled agent execution
  'agent.schedule': {
    data: {
      agentId: string
      orgId: string
      cronExpression: string
    }
  }

  // Embedding generation
  'company.embedding.generate': {
    data: {
      companyId: string
      priority?: 'high' | 'normal' | 'low'
      model?: string
    }
  }

  // Batch embedding generation
  'company.embedding.generate.batch': {
    data: {
      companyIds?: string[]
      generateAll?: boolean
      limit?: number
      model?: string
    }
  }

  // Buying signal detected
  'signal.detected': {
    data: {
      signalId: string
      companyId: string
      signalType: string
      confidence: number
    }
  }

  // Daily opportunity scan
  'opportunity.scan.daily': {
    data: {
      orgId: string
    }
  }

  // Daily signal monitoring
  'signals.monitor.daily': {
    data: {
      orgId: string
    }
  }
}

export const inngest = new Inngest({
  id: 'oppspot',
  name: 'oppSpot AI Platform',
  schemas: new EventSchemas().fromRecord<Events>(),
  // Event key for secure communication (optional in dev)
  eventKey: process.env.INNGEST_EVENT_KEY,
})

// Export event types for use in functions
export type InngestEvents = Events
