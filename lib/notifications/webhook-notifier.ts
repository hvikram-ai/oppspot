/**
 * Webhook Notifier Service
 *
 * Sends alert notifications to custom HTTP endpoints with retry logic.
 * Includes HMAC signature for security verification.
 *
 * @module lib/notifications/webhook-notifier
 */

import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

export interface WebhookAlert {
  id: string
  severity: 'P0' | 'P1' | 'P2' | 'P3'
  category: string
  title: string
  message: string
  sourceService: string
  occurrenceCount?: number
  createdAt: Date
  status: string
}

export interface WebhookConfig {
  enabled: boolean
  url: string
  secret?: string // For HMAC signature
  severityLevels?: string[] // Only send these severities
  retryAttempts?: number
  timeoutMs?: number
  headers?: Record<string, string>
}

export class WebhookNotifier {
  private config: WebhookConfig | null = null

  /**
   * Load webhook configuration from database
   */
  async loadConfig(): Promise<WebhookConfig | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('alert_configurations')
        .select('config_value')
        .eq('config_key', 'webhook_settings')
        .single()

      if (error || !data) {
        console.log('[WebhookNotifier] No webhook configuration found')
        return null
      }

      const config = data.config_value as unknown as WebhookConfig

      if (!config.enabled || !config.url) {
        console.log('[WebhookNotifier] Webhook disabled or no URL')
        return null
      }

      this.config = config
      return config
    } catch (error) {
      console.error('[WebhookNotifier] Failed to load config:', error)
      return null
    }
  }

  /**
   * Send alert notification to webhook
   */
  async sendAlert(alert: WebhookAlert): Promise<boolean> {
    try {
      // Load config if not already loaded
      if (!this.config) {
        await this.loadConfig()
      }

      if (!this.config || !this.config.enabled) {
        console.log('[WebhookNotifier] Webhook notifications disabled')
        return false
      }

      // Check if this severity should be sent
      if (
        this.config.severityLevels &&
        this.config.severityLevels.length > 0 &&
        !this.config.severityLevels.includes(alert.severity)
      ) {
        console.log(`[WebhookNotifier] Skipping ${alert.severity} alert (not in configured levels)`)
        return false
      }

      // Build payload
      const payload = this.buildPayload(alert)

      // Attempt to send with retries
      const maxAttempts = this.config.retryAttempts || 3
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const success = await this.sendRequest(payload, attempt)

          if (success) {
            console.log(`[WebhookNotifier] Alert sent to webhook: ${alert.id}`)
            return true
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error')
          console.error(`[WebhookNotifier] Attempt ${attempt}/${maxAttempts} failed:`, error)

          // Wait before retry (exponential backoff)
          if (attempt < maxAttempts) {
            await this.delay(Math.pow(2, attempt) * 1000) // 2s, 4s, 8s
          }
        }
      }

      // All attempts failed
      console.error('[WebhookNotifier] All retry attempts failed:', lastError)

      // Log failure to database
      await this.logWebhookCall(alert.id, this.config.url, null, lastError?.message, maxAttempts)

      return false
    } catch (error) {
      console.error('[WebhookNotifier] Failed to send alert:', error)
      return false
    }
  }

  /**
   * Build webhook payload
   */
  private buildPayload(alert: WebhookAlert): Record<string, unknown> {
    return {
      event: 'alert.triggered',
      timestamp: new Date().toISOString(),
      alert: {
        id: alert.id,
        severity: alert.severity,
        category: alert.category,
        title: alert.title,
        message: alert.message,
        sourceService: alert.sourceService,
        occurrenceCount: alert.occurrenceCount || 1,
        createdAt: alert.createdAt.toISOString(),
        status: alert.status,
      },
    }
  }

  /**
   * Send HTTP request to webhook
   */
  private async sendRequest(payload: Record<string, unknown>, attemptNumber: number): Promise<boolean> {
    if (!this.config) return false

    const payloadString = JSON.stringify(payload)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'oppSpot-Alerts/1.0',
      'X-oppSpot-Event': 'alert.triggered',
      'X-Attempt-Number': attemptNumber.toString(),
      ...this.config.headers,
    }

    // Add HMAC signature if secret is configured
    if (this.config.secret) {
      const signature = this.generateSignature(payloadString, this.config.secret)
      headers['X-oppSpot-Signature'] = signature
    }

    const timeoutMs = this.config.timeoutMs || 10000 // 10 second default

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      // Log successful call
      await this.logWebhookCall(
        payload.alert.id,
        this.config.url,
        response.status,
        undefined,
        attemptNumber
      )

      return true
    } catch (error) {
      clearTimeout(timeout)

      // Log failed call
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.logWebhookCall(
        payload.alert.id,
        this.config.url,
        null,
        errorMessage,
        attemptNumber
      )

      throw error
    }
  }

  /**
   * Generate HMAC signature for payload
   */
  private generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex')
  }

  /**
   * Log webhook call to database
   */
  private async logWebhookCall(
    alertId: string,
    webhookUrl: string,
    statusCode: number | null,
    errorMessage?: string,
    attemptNumber: number = 1
  ): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase.from('webhook_logs').insert({
        alert_id: alertId,
        webhook_url: webhookUrl,
        status_code: statusCode,
        error_message: errorMessage,
        attempt_number: attemptNumber,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[WebhookNotifier] Failed to log webhook call:', error)
    }
  }

  /**
   * Test webhook connection
   */
  async sendTestMessage(url?: string, secret?: string): Promise<{
    success: boolean
    statusCode?: number
    error?: string
    responseTime?: number
  }> {
    try {
      const webhookUrl = url || this.config?.url

      if (!webhookUrl) {
        return {
          success: false,
          error: 'Webhook URL not configured',
        }
      }

      const payload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        message: 'This is a test message from oppSpot Alert System',
      }

      const payloadString = JSON.stringify(payload)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'oppSpot-Alerts/1.0',
        'X-oppSpot-Event': 'webhook.test',
      }

      // Add HMAC signature if secret provided
      const webhookSecret = secret || this.config?.secret
      if (webhookSecret) {
        const signature = this.generateSignature(payloadString, webhookSecret)
        headers['X-oppSpot-Signature'] = signature
      }

      const startTime = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: payloadString,
          signal: controller.signal,
        })

        clearTimeout(timeout)
        const responseTime = Date.now() - startTime

        if (!response.ok) {
          const errorText = await response.text()
          return {
            success: false,
            statusCode: response.status,
            error: `HTTP ${response.status}: ${errorText}`,
            responseTime,
          }
        }

        return {
          success: true,
          statusCode: response.status,
          responseTime,
        }
      } catch (error) {
        clearTimeout(timeout)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get recent webhook logs
   */
  async getLogs(limit: number = 50): Promise<Array<Record<string, unknown>>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[WebhookNotifier] Failed to fetch logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[WebhookNotifier] Error fetching logs:', error)
      return []
    }
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Check if webhooks are configured and enabled
   */
  async isConfigured(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig()
    }
    return !!(this.config && this.config.enabled && this.config.url)
  }
}

// Singleton instance
let webhookNotifier: WebhookNotifier | null = null

/**
 * Get WebhookNotifier singleton instance
 */
export function getWebhookNotifier(): WebhookNotifier {
  if (!webhookNotifier) {
    webhookNotifier = new WebhookNotifier()
  }
  return webhookNotifier
}
