#!/usr/bin/env tsx

/**
 * Worker Process Entrypoint
 * Starts all Bull queue workers for background job processing
 */

import { startResearchWorker, stopResearchWorker } from '@/lib/queue/workers/research-worker'
import { startEnrichmentWorker, stopEnrichmentWorker } from '@/lib/queue/workers/enrichment-worker'
import { startScoringWorker, stopScoringWorker } from '@/lib/queue/workers/scoring-worker'
import { startSignalsWorker, stopSignalsWorker } from '@/lib/queue/workers/signals-worker'
import { closeRedisClient, isRedisHealthy } from '@/lib/queue/redis-client'
import { closeAllQueues } from '@/lib/queue/queue-manager'

// ============================================================================
// CONFIGURATION
// ============================================================================

interface WorkerConfig {
  name: string
  enabled: boolean
  concurrency: number
  start: (concurrency: number) => any
  stop: () => Promise<void>
}

const WORKER_CONFIGS: WorkerConfig[] = [
  {
    name: 'Research',
    enabled: process.env.ENABLE_RESEARCH_WORKER !== 'false',
    concurrency: parseInt(process.env.RESEARCH_WORKER_CONCURRENCY || '2'),
    start: startResearchWorker,
    stop: stopResearchWorker,
  },
  {
    name: 'Enrichment',
    enabled: process.env.ENABLE_ENRICHMENT_WORKER !== 'false',
    concurrency: parseInt(process.env.ENRICHMENT_WORKER_CONCURRENCY || '5'),
    start: startEnrichmentWorker,
    stop: stopEnrichmentWorker,
  },
  {
    name: 'Scoring',
    enabled: process.env.ENABLE_SCORING_WORKER !== 'false',
    concurrency: parseInt(process.env.SCORING_WORKER_CONCURRENCY || '10'),
    start: startScoringWorker,
    stop: stopScoringWorker,
  },
  {
    name: 'Signals',
    enabled: process.env.ENABLE_SIGNALS_WORKER !== 'false',
    concurrency: parseInt(process.env.SIGNALS_WORKER_CONCURRENCY || '5'),
    start: startSignalsWorker,
    stop: stopSignalsWorker,
  },
]

// ============================================================================
// WORKER MANAGER
// ============================================================================

class WorkerManager {
  private workers: Array<Record<string, unknown>> = []
  private isShuttingDown = false

  async start() {
    console.log('='.repeat(80))
    console.log('🚀 oppSpot Background Workers')
    console.log('='.repeat(80))

    // Check Redis connection
    console.log('\n📡 Checking Redis connection...')
    const redisHealthy = await isRedisHealthy()

    if (!redisHealthy) {
      console.error('❌ Redis is not available. Workers cannot start.')
      console.error('   Please ensure Redis is running at:', process.env.REDIS_URL || 'redis://localhost:6379')
      process.exit(1)
    }

    console.log('✅ Redis connection healthy')

    // Start workers
    console.log('\n🔧 Starting workers...\n')

    for (const config of WORKER_CONFIGS) {
      if (config.enabled) {
        try {
          const worker = config.start(config.concurrency)
          this.workers.push({ name: config.name, stop: config.stop })
          console.log(`✅ ${config.name} Worker started (concurrency: ${config.concurrency})`)
        } catch (error) {
          console.error(`❌ Failed to start ${config.name} Worker:`, error)
        }
      } else {
        console.log(`⏭️  ${config.name} Worker disabled`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log(`✨ Workers ready! Processing jobs from ${this.workers.length} queues`)
    console.log('='.repeat(80))
    console.log('\n💡 Press Ctrl+C to shutdown gracefully\n')

    // Setup graceful shutdown
    this.setupGracefulShutdown()

    // Start health monitoring
    this.startHealthMonitoring()
  }

  private setupGracefulShutdown() {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT']

    for (const signal of signals) {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          console.log('\n⚠️  Force shutdown requested. Exiting immediately.')
          process.exit(1)
        }

        this.isShuttingDown = true
        console.log(`\n\n🛑 Received ${signal}. Shutting down gracefully...`)
        await this.shutdown()
      })
    }

    process.on('uncaughtException', (error) => {
      console.error('\n❌ Uncaught Exception:', error)
      this.shutdown().then(() => process.exit(1))
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason)
      this.shutdown().then(() => process.exit(1))
    })
  }

  private async shutdown() {
    console.log('\n🔄 Stopping workers...')

    // Stop all workers
    for (const worker of this.workers) {
      try {
        console.log(`   Stopping ${worker.name} Worker...`)
        await (worker.stop as any)()
        console.log(`   ✅ ${worker.name} Worker stopped`)
      } catch (error) {
        console.error(`   ❌ Failed to stop ${worker.name} Worker:`, error)
      }
    }

    // Close all queues
    console.log('\n🔒 Closing queue connections...')
    await closeAllQueues()

    // Close Redis connection
    console.log('🔒 Closing Redis connection...')
    await closeRedisClient()

    console.log('\n✅ Shutdown complete. Goodbye!\n')
    process.exit(0)
  }

  private startHealthMonitoring() {
    // Log health check every 30 seconds
    setInterval(async () => {
      const healthy = await isRedisHealthy()
      if (!healthy) {
        console.error('⚠️  Health check failed: Redis connection lost')
      }
    }, 30000)
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Load environment variables
  if (process.env.NODE_ENV !== 'production') {
    try {
      const dotenv = await import('dotenv')
      dotenv.config()
    } catch {
      // dotenv not available in production, that's okay
    }
  }

  // Create and start worker manager
  const manager = new WorkerManager()
  await manager.start()
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error starting workers:', error)
    process.exit(1)
  })
}

export default main
