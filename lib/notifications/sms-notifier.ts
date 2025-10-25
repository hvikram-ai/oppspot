/**
 * SMS Notifier Service
 *
 * Sends alert notifications via SMS using Twilio.
 * Includes rate limiting to prevent excessive SMS costs.
 *
 * @module lib/notifications/sms-notifier
 */

import { createClient } from '@/lib/supabase/server'

export interface SmsAlert {
  id: string
  severity: 'P0' | 'P1' | 'P2' | 'P3'
  title: string
  message: string
  sourceService: string
  createdAt: Date
}

export interface SmsConfig {
  enabled: boolean
  accountSid: string
  authToken: string
  fromNumber: string
  toNumbers: string[] // List of recipient phone numbers
  severityLevels?: string[] // Only send for these severities (default: P0, P1)
  maxPerHour?: number // Rate limit per recipient (default: 5)
}

export class SmsNotifier {
  private config: SmsConfig | null = null
  private rateLimitCache = new Map<string, number[]>() // phone -> timestamps

  /**
   * Load SMS configuration from database
   */
  async loadConfig(): Promise<SmsConfig | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('alert_configurations')
        .select('config_value')
        .eq('config_key', 'sms_settings')
        .single()

      if (error || !data) {
        console.log('[SmsNotifier] No SMS configuration found')
        return null
      }

      const config = data.config_value as unknown as SmsConfig

      if (!config.enabled || !config.accountSid || !config.authToken || !config.fromNumber) {
        console.log('[SmsNotifier] SMS not properly configured')
        return null
      }

      this.config = config
      return config
    } catch (error) {
      console.error('[SmsNotifier] Failed to load config:', error)
      return null
    }
  }

  /**
   * Send alert notification via SMS
   */
  async sendAlert(alert: SmsAlert): Promise<boolean> {
    try {
      // Load config if not already loaded
      if (!this.config) {
        await this.loadConfig()
      }

      if (!this.config || !this.config.enabled) {
        console.log('[SmsNotifier] SMS notifications disabled')
        return false
      }

      // Check if this severity should be sent
      const severityLevels = this.config.severityLevels || ['P0', 'P1']
      if (!severityLevels.includes(alert.severity)) {
        console.log(`[SmsNotifier] Skipping ${alert.severity} alert (not in configured levels)`)
        return false
      }

      // Build SMS message (max 160 chars for standard SMS)
      const message = this.buildMessage(alert)

      // Send to all configured recipients
      let successCount = 0
      const toNumbers = this.config.toNumbers || []

      for (const phoneNumber of toNumbers) {
        // Check rate limit
        if (!this.checkRateLimit(phoneNumber)) {
          console.log(`[SmsNotifier] Rate limit exceeded for ${phoneNumber}`)
          continue
        }

        try {
          const sent = await this.sendSms(phoneNumber, message)
          if (sent) {
            successCount++
            this.recordSent(phoneNumber)
          }
        } catch (error) {
          console.error(`[SmsNotifier] Failed to send to ${phoneNumber}:`, error)
        }
      }

      const allSent = successCount === toNumbers.length
      console.log(`[SmsNotifier] Sent to ${successCount}/${toNumbers.length} recipients`)

      return allSent
    } catch (error) {
      console.error('[SmsNotifier] Failed to send alert:', error)
      return false
    }
  }

  /**
   * Build SMS message (keep under 160 chars for standard SMS)
   */
  private buildMessage(alert: SmsAlert): string {
    const severityEmoji = {
      P0: '🔴',
      P1: '🟠',
      P2: '🟡',
      P3: '🟢',
    }[alert.severity] || '⚪'

    // Build concise message
    const parts = [
      `${severityEmoji} ${alert.severity}`,
      alert.title.substring(0, 50), // Truncate if needed
      `from ${alert.sourceService}`,
      `- oppSpot Alerts`,
    ]

    let message = parts.join(' ')

    // Ensure under 160 characters
    if (message.length > 160) {
      message = message.substring(0, 157) + '...'
    }

    return message
  }

  /**
   * Send SMS via Twilio
   */
  private async sendSms(to: string, body: string): Promise<boolean> {
    if (!this.config) return false

    try {
      // Build Twilio API request
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`

      const formData = new URLSearchParams()
      formData.append('To', to)
      formData.append('From', this.config.fromNumber)
      formData.append('Body', body)

      // Basic auth with account SID and auth token
      const credentials = Buffer.from(
        `${this.config.accountSid}:${this.config.authToken}`
      ).toString('base64')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Twilio API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`[SmsNotifier] SMS sent successfully. SID: ${result.sid}`)

      return true
    } catch (error) {
      console.error('[SmsNotifier] Twilio request failed:', error)
      return false
    }
  }

  /**
   * Check rate limit for a phone number
   */
  private checkRateLimit(phoneNumber: string): boolean {
    const maxPerHour = this.config?.maxPerHour || 5
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    // Get recent sends for this number
    const recentSends = this.rateLimitCache.get(phoneNumber) || []

    // Filter to only sends within the last hour
    const recentSendsInHour = recentSends.filter((timestamp) => timestamp > oneHourAgo)

    // Check if limit exceeded
    return recentSendsInHour.length < maxPerHour
  }

  /**
   * Record that an SMS was sent
   */
  private recordSent(phoneNumber: string): void {
    const recentSends = this.rateLimitCache.get(phoneNumber) || []
    recentSends.push(Date.now())

    // Keep only last 24 hours of data
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const filtered = recentSends.filter((timestamp) => timestamp > oneDayAgo)

    this.rateLimitCache.set(phoneNumber, filtered)
  }

  /**
   * Send test SMS
   */
  async sendTestMessage(
    to?: string,
    accountSid?: string,
    authToken?: string,
    fromNumber?: string
  ): Promise<{
    success: boolean
    error?: string
    messageSid?: string
  }> {
    try {
      const sid = accountSid || this.config?.accountSid
      const token = authToken || this.config?.authToken
      const from = fromNumber || this.config?.fromNumber
      const toNumber = to || this.config?.toNumbers?.[0]

      if (!sid || !token || !from || !toNumber) {
        return {
          success: false,
          error: 'SMS not configured or missing parameters',
        }
      }

      // Build test message
      const body = '🔔 Test message from oppSpot Alert System. SMS notifications are working!'

      // Send via Twilio
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`

      const formData = new URLSearchParams()
      formData.append('To', toNumber)
      formData.append('From', from)
      formData.append('Body', body)

      const credentials = Buffer.from(`${sid}:${token}`).toString('base64')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Twilio API error: ${response.status} - ${errorText}`,
        }
      }

      const result = await response.json()

      return {
        success: true,
        messageSid: result.sid,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get rate limit status for all numbers
   */
  getRateLimitStatus(): Record<
    string,
    { sentLastHour: number; remainingThisHour: number }
  > {
    const status: Record<string, { sentLastHour: number; remainingThisHour: number }> = {}
    const maxPerHour = this.config?.maxPerHour || 5
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    this.rateLimitCache.forEach((timestamps, phoneNumber) => {
      const sentLastHour = timestamps.filter((t) => t > oneHourAgo).length
      status[phoneNumber] = {
        sentLastHour,
        remainingThisHour: Math.max(0, maxPerHour - sentLastHour),
      }
    })

    return status
  }

  /**
   * Check if SMS is configured and enabled
   */
  async isConfigured(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig()
    }
    return !!(
      this.config &&
      this.config.enabled &&
      this.config.accountSid &&
      this.config.authToken &&
      this.config.fromNumber &&
      this.config.toNumbers &&
      this.config.toNumbers.length > 0
    )
  }
}

// Singleton instance
let smsNotifier: SmsNotifier | null = null

/**
 * Get SmsNotifier singleton instance
 */
export function getSmsNotifier(): SmsNotifier {
  if (!smsNotifier) {
    smsNotifier = new SmsNotifier()
  }
  return smsNotifier
}
