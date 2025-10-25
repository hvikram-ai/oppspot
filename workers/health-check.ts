#!/usr/bin/env tsx

/**
 * Worker Health Check
 * Checks the health of all workers and queues
 */

import { isRedisHealthy, getRedisInfo } from '@/lib/queue/redis-client'
import { getQueuesHealth } from '@/lib/queue/queue-manager'

async function healthCheck() {
  console.log('🏥 Worker Health Check')
  console.log('='.repeat(60))

  // Check Redis
  console.log('\n📡 Redis Connection:')
  const redisHealthy = await isRedisHealthy()
  const redisInfo = getRedisInfo()

  console.log(`   Status: ${redisHealthy ? '✅ Healthy' : '❌ Unhealthy'}`)
  console.log(`   URL: ${redisInfo.url}`)
  console.log(`   Connected: ${redisInfo.connected ? 'Yes' : 'No'}`)
  console.log(`   State: ${redisInfo.status}`)

  if (!redisHealthy) {
    console.log('\n❌ Health check failed: Redis is not healthy')
    process.exit(1)
  }

  // Check Queues
  console.log('\n📊 Queue Statistics:')
  const queuesHealth = await getQueuesHealth()

  console.log(`   Overall Status: ${queuesHealth.healthy ? '✅ Healthy' : '⚠️  Degraded'}`)
  console.log(`   Timestamp: ${queuesHealth.timestamp}`)

  console.log('\n   Queue Details:')
  for (const queue of queuesHealth.queues) {
    const failureRate = queue.completed > 0
      ? ((queue.failed / (queue.completed + queue.failed)) * 100).toFixed(1)
      : '0.0'

    console.log(`\n   ${queue.name}:`)
    console.log(`     - Waiting: ${queue.waiting}`)
    console.log(`     - Active: ${queue.active}`)
    console.log(`     - Completed: ${queue.completed}`)
    console.log(`     - Failed: ${queue.failed} (${failureRate}%)`)
    console.log(`     - Delayed: ${queue.delayed}`)
    console.log(`     - Total: ${queue.total}`)
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  if (queuesHealth.healthy && redisHealthy) {
    console.log('✅ All systems healthy')
    process.exit(0)
  } else {
    console.log('⚠️  Some systems degraded')
    process.exit(1)
  }
}

// Run health check
if (require.main === module) {
  healthCheck().catch((error) => {
    console.error('\n❌ Health check error:', error)
    process.exit(1)
  })
}

export default healthCheck
