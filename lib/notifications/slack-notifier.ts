/**
 * Slack Notifier Service
 *
 * Sends alert notifications to Slack channels via incoming webhooks.
 * Supports rich formatting, color coding by severity, and threaded updates.
 *
 * @module lib/notifications/slack-notifier
 */

import { createClient } from '@/lib/supabase/server'

// Severity color mapping for Slack attachments
const SEVERITY_COLORS: Record<string, string> = {
  P0: '#dc2626', // Red (Tailwind red-600)
  P1: '#ea580c', // Orange (Tailwind orange-600)
  P2: '#ca8a04', // Yellow (Tailwind yellow-600)
  P3: '#16a34a', // Green (Tailwind green-600)
}

// Emoji indicators for severity
const SEVERITY_EMOJI: Record<string, string> = {
  P0: '🔴',
  P1: '🟠',
  P2: '🟡',
  P3: '🟢',
}

// Category emoji indicators
const CATEGORY_EMOJI: Record<string, string> = {
  database_failure: '🗄️',
  api_failure: '⚡',
  external_service_failure: '🌐',
  auth_failure: '🔐',
  data_integrity: '📊',
  performance_degradation: '🐌',
  security_incident: '🚨',
  rate_limit_exceeded: '🚦',
  job_failure: '⚙️',
  custom: '📌',
}

export interface SlackAlert {
  id: string
  severity: 'P0' | 'P1' | 'P2' | 'P3'
  category: string
  title: string
  message: string
  sourceService: string
  occurrenceCount?: number
  createdAt: Date
  dashboardUrl?: string
}

export interface SlackConfig {
  enabled: boolean
  webhookUrl: string
  channel?: string
  mentionOn?: string[] // Severities that trigger @channel mention
  username?: string
  iconEmoji?: string
}

export class SlackNotifier {
  private config: SlackConfig | null = null

  /**
   * Load Slack configuration from database
   */
  async loadConfig(): Promise<SlackConfig | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('alert_configurations')
        .select('config_value')
        .eq('config_key', 'slack_settings')
        .single()

      if (error || !data) {
        console.log('[SlackNotifier] No Slack configuration found')
        return null
      }

      const config = data.config_value as unknown as SlackConfig

      if (!config.enabled || !config.webhookUrl) {
        console.log('[SlackNotifier] Slack disabled or no webhook URL')
        return null
      }

      this.config = config
      return config
    } catch (error) {
      console.error('[SlackNotifier] Failed to load config:', error)
      return null
    }
  }

  /**
   * Send alert notification to Slack
   */
  async sendAlert(alert: SlackAlert): Promise<boolean> {
    try {
      // Load config if not already loaded
      if (!this.config) {
        await this.loadConfig()
      }

      if (!this.config || !this.config.enabled) {
        console.log('[SlackNotifier] Slack notifications disabled')
        return false
      }

      const payload = this.buildSlackPayload(alert)

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Slack API error: ${response.status} - ${errorText}`)
      }

      console.log(`[SlackNotifier] Alert sent to Slack: ${alert.id}`)
      return true
    } catch (error) {
      console.error('[SlackNotifier] Failed to send alert:', error)
      return false
    }
  }

  /**
   * Build Slack message payload with rich formatting
   */
  private buildSlackPayload(alert: SlackAlert): Record<string, unknown> {
    const severityEmoji = SEVERITY_EMOJI[alert.severity] || '⚪'
    const categoryEmoji = CATEGORY_EMOJI[alert.category] || '📌'
    const color = SEVERITY_COLORS[alert.severity] || '#6b7280'

    // Check if we should mention the channel
    const shouldMention = this.config?.mentionOn?.includes(alert.severity) ?? false
    const mentionText = shouldMention ? '<!channel> ' : ''

    // Build dashboard URL
    const dashboardUrl =
      alert.dashboardUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://oppspot-one.vercel.app'}/admin/alerts`

    // Main text
    const text = `${mentionText}${severityEmoji} *${alert.severity} Alert*: ${alert.title}`

    // Build attachment with details
    const attachment = {
      color,
      fallback: `${alert.severity}: ${alert.title}`,
      pretext: mentionText,
      author_name: 'oppSpot Alert System',
      title: `${categoryEmoji} ${alert.title}`,
      title_link: dashboardUrl,
      text: alert.message,
      fields: [
        {
          title: 'Severity',
          value: `${severityEmoji} ${alert.severity}`,
          short: true,
        },
        {
          title: 'Category',
          value: this.formatCategory(alert.category),
          short: true,
        },
        {
          title: 'Service',
          value: alert.sourceService,
          short: true,
        },
        {
          title: 'Occurrences',
          value: alert.occurrenceCount ? `${alert.occurrenceCount}x` : '1x',
          short: true,
        },
      ],
      footer: 'oppSpot Alert System',
      footer_icon: 'https://oppspot-one.vercel.app/favicon.ico',
      ts: Math.floor(alert.createdAt.getTime() / 1000),
      actions: [
        {
          type: 'button',
          text: '🔍 View Dashboard',
          url: dashboardUrl,
          style: alert.severity === 'P0' ? 'danger' : 'primary',
        },
      ],
    }

    return {
      text,
      attachments: [attachment],
      username: this.config?.username || 'oppSpot Alerts',
      icon_emoji: this.config?.iconEmoji || ':warning:',
      channel: this.config?.channel, // Optional override
    }
  }

  /**
   * Send alert resolution notification
   */
  async sendResolution(
    alert: SlackAlert,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      if (!this.config) {
        await this.loadConfig()
      }

      if (!this.config || !this.config.enabled) {
        return false
      }

      const severityEmoji = SEVERITY_EMOJI[alert.severity] || '⚪'
      const text = `✅ *Alert Resolved*: ${alert.title}`

      const attachment = {
        color: '#16a34a', // Green
        title: `${severityEmoji} ${alert.title}`,
        text: resolutionNotes || 'Alert has been resolved',
        fields: [
          {
            title: 'Resolved By',
            value: resolvedBy,
            short: true,
          },
          {
            title: 'Original Severity',
            value: alert.severity,
            short: true,
          },
        ],
        footer: 'oppSpot Alert System',
        ts: Math.floor(Date.now() / 1000),
      }

      const payload = {
        text,
        attachments: [attachment],
        username: this.config?.username || 'oppSpot Alerts',
        icon_emoji: ':white_check_mark:',
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`)
      }

      console.log(`[SlackNotifier] Resolution sent to Slack: ${alert.id}`)
      return true
    } catch (error) {
      console.error('[SlackNotifier] Failed to send resolution:', error)
      return false
    }
  }

  /**
   * Send a test message to Slack
   */
  async sendTestMessage(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        await this.loadConfig()
      }

      if (!this.config || !this.config.enabled) {
        return {
          success: false,
          error: 'Slack notifications are not configured or disabled',
        }
      }

      const payload = {
        text: '✅ *Test Message*: Slack Integration Working!',
        attachments: [
          {
            color: '#16a34a',
            title: 'oppSpot Alert System - Test',
            text: 'This is a test message to verify your Slack integration is working correctly.',
            fields: [
              {
                title: 'Status',
                value: '✅ Connected',
                short: true,
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true,
              },
            ],
            footer: 'oppSpot Alert System',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
        username: this.config?.username || 'oppSpot Alerts',
        icon_emoji: ':white_check_mark:',
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Slack API error: ${response.status} - ${errorText}`,
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Format category name for display
   */
  private formatCategory(category: string): string {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Check if Slack is configured and enabled
   */
  async isConfigured(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig()
    }
    return !!(this.config && this.config.enabled && this.config.webhookUrl)
  }
}

// Singleton instance
let slackNotifier: SlackNotifier | null = null

/**
 * Get SlackNotifier singleton instance
 */
export function getSlackNotifier(): SlackNotifier {
  if (!slackNotifier) {
    slackNotifier = new SlackNotifier()
  }
  return slackNotifier
}
