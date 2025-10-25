/**
 * Health Check API Endpoint
 * Returns the health status of all critical services
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFailureDetector } from '@/lib/alerts/failure-detector'

/**
 * GET /api/health
 * Run health checks and return results
 */
export async function GET(request: NextRequest) {
  try {
    const detector = getFailureDetector()

    // Run all health checks
    const results = await detector.runHealthChecks()

    // Calculate overall health
    const allHealthy = results.every((r) => r.status === 'healthy')
    const anyDown = results.some((r) => r.status === 'down')

    const overallStatus = anyDown ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded'

    // Return health status
    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: results.map((r) => ({
          name: r.service,
          status: r.status,
          responseTimeMs: r.responseTimeMs,
          error: r.error,
        })),
      },
      {
        status: overallStatus === 'unhealthy' ? 503 : 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('[Health Check] Failed:', error)

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
