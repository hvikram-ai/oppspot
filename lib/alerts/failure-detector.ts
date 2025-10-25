/**
 * Failure Detector Service
 * Monitors critical systems and triggers alerts when failures are detected
 */

import { createClient } from '@/lib/supabase/server'
import { AlertService } from './alert-service'

export type ServiceStatus = 'healthy' | 'degraded' | 'down'

export interface HealthCheckResult {
  service: string
  status: ServiceStatus
  responseTimeMs: number
  error?: string
  metadata?: Record<string, unknown>
  checkedAt: Date
}

/**
 * Failure Detector - Monitors critical system health
 */
export class FailureDetector {
  private alertService = new AlertService()
  private healthCheckInterval: NodeJS.Timeout | null = null

  // Track consecutive failures for alerting
  private consecutiveFailures = new Map<string, number>()

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      console.warn('[FailureDetector] Monitoring already started')
      return
    }

    console.log('[FailureDetector] Starting health monitoring...')

    // Run immediate check
    this.runHealthChecks()

    // Schedule periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks()
    }, intervalMs)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      console.log('[FailureDetector] Health monitoring stopped')
    }
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const checks = [
      this.checkDatabase(),
      this.checkSupabaseAuth(),
      this.checkOpenRouter(),
      this.checkResend(),
    ]

    const results = await Promise.allSettled(checks)

    const healthResults: HealthCheckResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          service: ['database', 'supabase_auth', 'openrouter', 'resend'][index],
          status: 'down' as ServiceStatus,
          responseTimeMs: 0,
          error: result.reason?.message || 'Unknown error',
          checkedAt: new Date(),
        }
      }
    })

    // Store results and trigger alerts if needed
    await this.processHealthCheckResults(healthResults)

    return healthResults
  }

  /**
   * Check database connectivity
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const supabase = await createClient()

      // Simple query to check connection
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      const responseTime = Date.now() - startTime

      if (error) {
        return {
          service: 'database',
          status: 'down',
          responseTimeMs: responseTime,
          error: error.message,
          checkedAt: new Date(),
        }
      }

      // Check if response time is degraded
      const status: ServiceStatus = responseTime > 2000 ? 'degraded' : 'healthy'

      return {
        service: 'database',
        status,
        responseTimeMs: responseTime,
        checkedAt: new Date(),
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        service: 'database',
        status: 'down',
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : String(error),
        checkedAt: new Date(),
      }
    }
  }

  /**
   * Check Supabase Auth service
   */
  async checkSupabaseAuth(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const supabase = await createClient()

      // Check auth session (non-destructive)
      const { error } = await supabase.auth.getSession()

      const responseTime = Date.now() - startTime

      if (error) {
        return {
          service: 'supabase_auth',
          status: 'down',
          responseTimeMs: responseTime,
          error: error.message,
          checkedAt: new Date(),
        }
      }

      return {
        service: 'supabase_auth',
        status: 'healthy',
        responseTimeMs: responseTime,
        checkedAt: new Date(),
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        service: 'supabase_auth',
        status: 'down',
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : String(error),
        checkedAt: new Date(),
      }
    }
  }

  /**
   * Check OpenRouter API
   */
  async checkOpenRouter(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const apiKey = process.env.OPENROUTER_API_KEY

      if (!apiKey) {
        return {
          service: 'openrouter',
          status: 'down',
          responseTimeMs: 0,
          error: 'OpenRouter API key not configured',
          checkedAt: new Date(),
        }
      }

      // Simple health check to OpenRouter
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        return {
          service: 'openrouter',
          status: 'down',
          responseTimeMs: responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          checkedAt: new Date(),
        }
      }

      const status: ServiceStatus = responseTime > 3000 ? 'degraded' : 'healthy'

      return {
        service: 'openrouter',
        status,
        responseTimeMs: responseTime,
        checkedAt: new Date(),
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        service: 'openrouter',
        status: 'down',
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : String(error),
        checkedAt: new Date(),
      }
    }
  }

  /**
   * Check Resend email service
   */
  async checkResend(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const apiKey = process.env.RESEND_API_KEY

      if (!apiKey) {
        return {
          service: 'resend',
          status: 'down',
          responseTimeMs: 0,
          error: 'Resend API key not configured',
          checkedAt: new Date(),
        }
      }

      // Check API keys endpoint (non-destructive)
      const response = await fetch('https://api.resend.com/api-keys', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        return {
          service: 'resend',
          status: 'down',
          responseTimeMs: responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          checkedAt: new Date(),
        }
      }

      return {
        service: 'resend',
        status: 'healthy',
        responseTimeMs: responseTime,
        checkedAt: new Date(),
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        service: 'resend',
        status: 'down',
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : String(error),
        checkedAt: new Date(),
      }
    }
  }

  /**
   * Process health check results and trigger alerts
   */
  private async processHealthCheckResults(
    results: HealthCheckResult[]
  ): Promise<void> {
    // Store results in database
    await this.storeHealthChecks(results)

    // Check for failures and trigger alerts
    for (const result of results) {
      await this.evaluateHealthResult(result)
    }
  }

  /**
   * Store health check results
   */
  private async storeHealthChecks(results: HealthCheckResult[]): Promise<void> {
    try {
      const supabase = await createClient()

      const records = results.map((result) => ({
        service_name: result.service,
        check_type: this.getCheckType(result.service),
        status: result.status,
        response_time_ms: result.responseTimeMs,
        error_message: result.error,
        metadata: result.metadata || {},
        checked_at: result.checkedAt.toISOString(),
      }))

      await supabase.from('service_health_checks').insert(records)
    } catch (error) {
      console.error('[FailureDetector] Failed to store health checks:', error)
    }
  }

  /**
   * Evaluate health result and trigger alerts if needed
   */
  private async evaluateHealthResult(result: HealthCheckResult): Promise<void> {
    const { service, status } = result

    // Track consecutive failures
    if (status === 'down') {
      const failures = (this.consecutiveFailures.get(service) || 0) + 1
      this.consecutiveFailures.set(service, failures)

      // Trigger alert after 3 consecutive failures
      if (failures >= 3) {
        await this.triggerServiceFailureAlert(result)
      }
    } else {
      // Reset failure count on success
      this.consecutiveFailures.delete(service)
    }

    // Alert on degraded performance (if consistent)
    if (status === 'degraded') {
      const degradedCount = (this.consecutiveFailures.get(`${service}_degraded`) || 0) + 1
      this.consecutiveFailures.set(`${service}_degraded`, degradedCount)

      // Alert after 5 consecutive degraded checks
      if (degradedCount >= 5) {
        await this.triggerDegradedPerformanceAlert(result)
        this.consecutiveFailures.delete(`${service}_degraded`)
      }
    } else {
      this.consecutiveFailures.delete(`${service}_degraded`)
    }
  }

  /**
   * Trigger service failure alert
   */
  private async triggerServiceFailureAlert(result: HealthCheckResult): Promise<void> {
    const severity = this.getFailureSeverity(result.service)
    const category = this.getFailureCategory(result.service)

    await this.alertService.triggerAlert({
      severity,
      category,
      title: `${this.formatServiceName(result.service)} Service Failure`,
      message: result.error || `${result.service} health check failed`,
      sourceService: result.service,
      context: {
        responseTimeMs: result.responseTimeMs,
        consecutiveFailures: this.consecutiveFailures.get(result.service),
        checkedAt: result.checkedAt.toISOString(),
      },
      tags: ['health_check', 'service_failure'],
    })

    // Reset counter after alerting
    this.consecutiveFailures.delete(result.service)
  }

  /**
   * Trigger degraded performance alert
   */
  private async triggerDegradedPerformanceAlert(result: HealthCheckResult): Promise<void> {
    await this.alertService.triggerAlert({
      severity: 'P2',
      category: 'performance_degradation',
      title: `${this.formatServiceName(result.service)} Performance Degraded`,
      message: `${result.service} is experiencing slow response times`,
      sourceService: result.service,
      context: {
        responseTimeMs: result.responseTimeMs,
        checkedAt: result.checkedAt.toISOString(),
      },
      tags: ['health_check', 'performance'],
    })
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private getCheckType(service: string): string {
    if (service.includes('database')) return 'database'
    if (service.includes('auth')) return 'auth'
    return 'external_service'
  }

  private getFailureSeverity(service: string): 'P0' | 'P1' | 'P2' {
    // Critical services get P0
    if (service === 'database' || service === 'supabase_auth') {
      return 'P0'
    }
    // External services get P1
    return 'P1'
  }

  private getFailureCategory(service: string): 'database_failure' | 'auth_failure' | 'external_service_failure' {
    if (service === 'database') return 'database_failure'
    if (service === 'supabase_auth') return 'auth_failure'
    return 'external_service_failure'
  }

  private formatServiceName(service: string): string {
    return service
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}

// Singleton instance
let failureDetectorInstance: FailureDetector | null = null

/**
 * Get or create FailureDetector instance
 */
export function getFailureDetector(): FailureDetector {
  if (!failureDetectorInstance) {
    failureDetectorInstance = new FailureDetector()
  }
  return failureDetectorInstance
}
