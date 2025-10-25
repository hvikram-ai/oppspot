/**
 * Alert Export Service
 *
 * Exports alerts to CSV or JSON formats with filtering support.
 *
 * @module lib/alerts/export-service
 */

import { createClient } from '@/lib/supabase/server'
import { AlertSeverity, AlertCategory, AlertStatus } from './alert-service'

export interface ExportFilters {
  severity?: AlertSeverity[]
  status?: AlertStatus[]
  category?: AlertCategory[]
  startDate?: Date
  endDate?: Date
}

export interface ExportOptions {
  format: 'csv' | 'json'
  filters?: ExportFilters
  includeContext?: boolean
  includeErrorStack?: boolean
}

export class AlertExportService {
  /**
   * Export alerts to specified format
   */
  async export(options: ExportOptions): Promise<{ data: string; filename: string; mimeType: string }> {
    // Fetch alerts with filters
    const alerts = await this.fetchAlerts(options.filters)

    if (options.format === 'csv') {
      return this.exportToCSV(alerts, options)
    } else {
      return this.exportToJSON(alerts, options)
    }
  }

  /**
   * Fetch alerts from database with filters
   */
  private async fetchAlerts(filters?: ExportFilters): Promise<any[]> {
    try {
      const supabase = await createClient()

      let query = supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000) // Limit to prevent huge exports

      // Apply filters
      if (filters?.severity && filters.severity.length > 0) {
        query = query.in('severity', filters.severity)
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.category && filters.category.length > 0) {
        query = query.in('category', filters.category)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        console.error('[ExportService] Failed to fetch alerts:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[ExportService] Error fetching alerts:', error)
      return []
    }
  }

  /**
   * Export alerts to CSV format
   */
  private exportToCSV(
    alerts: any[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    if (alerts.length === 0) {
      return {
        data: 'No alerts found matching the criteria',
        filename: `alerts_export_${this.getTimestamp()}.csv`,
        mimeType: 'text/csv',
      }
    }

    // CSV headers
    const headers = [
      'ID',
      'Severity',
      'Status',
      'Category',
      'Title',
      'Message',
      'Source Service',
      'Source Endpoint',
      'Source Method',
      'Occurrence Count',
      'Created At',
      'First Occurred At',
      'Last Occurred At',
      'Acknowledged At',
      'Acknowledged By',
      'Resolved At',
      'Resolved By',
      'Resolution Notes',
      'Channels Notified',
      'Notification Sent At',
      'Notification Failed',
    ]

    if (options.includeContext) {
      headers.push('Context')
    }

    if (options.includeErrorStack) {
      headers.push('Error Stack')
    }

    // Build CSV rows
    const rows = alerts.map((alert) => {
      const row = [
        alert.id,
        alert.severity,
        alert.status,
        alert.category,
        this.escapeCSV(alert.title),
        this.escapeCSV(alert.message),
        alert.source_service || '',
        alert.source_endpoint || '',
        alert.source_method || '',
        alert.occurrence_count || 1,
        alert.created_at,
        alert.first_occurred_at || alert.created_at,
        alert.last_occurred_at || alert.created_at,
        alert.acknowledged_at || '',
        alert.acknowledged_by || '',
        alert.resolved_at || '',
        alert.resolved_by || '',
        this.escapeCSV(alert.resolution_notes || ''),
        Array.isArray(alert.channels_notified) ? alert.channels_notified.join(';') : '',
        alert.notification_sent_at || '',
        alert.notification_failed ? 'true' : 'false',
      ]

      if (options.includeContext) {
        row.push(this.escapeCSV(JSON.stringify(alert.context || {})))
      }

      if (options.includeErrorStack) {
        row.push(this.escapeCSV(alert.error_stack || ''))
      }

      return row
    })

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    return {
      data: csvContent,
      filename: `alerts_export_${this.getTimestamp()}.csv`,
      mimeType: 'text/csv',
    }
  }

  /**
   * Export alerts to JSON format
   */
  private exportToJSON(
    alerts: any[],
    options: ExportOptions
  ): { data: string; filename: string; mimeType: string } {
    // Transform alerts for export
    const exportData = alerts.map((alert) => {
      const exported: any = {
        id: alert.id,
        severity: alert.severity,
        status: alert.status,
        category: alert.category,
        title: alert.title,
        message: alert.message,
        sourceService: alert.source_service,
        sourceEndpoint: alert.source_endpoint,
        sourceMethod: alert.source_method,
        occurrenceCount: alert.occurrence_count,
        createdAt: alert.created_at,
        firstOccurredAt: alert.first_occurred_at || alert.created_at,
        lastOccurredAt: alert.last_occurred_at || alert.created_at,
        acknowledgedAt: alert.acknowledged_at,
        acknowledgedBy: alert.acknowledged_by,
        resolvedAt: alert.resolved_at,
        resolvedBy: alert.resolved_by,
        resolutionNotes: alert.resolution_notes,
        channelsNotified: alert.channels_notified,
        notificationSentAt: alert.notification_sent_at,
        notificationFailed: alert.notification_failed,
        fingerprint: alert.fingerprint,
        tags: alert.tags,
        relatedAlertIds: alert.related_alert_ids,
        runbookUrl: alert.runbook_url,
      }

      if (options.includeContext) {
        exported.context = alert.context
      }

      if (options.includeErrorStack) {
        exported.errorStack = alert.error_stack
      }

      return exported
    })

    const jsonContent = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalAlerts: alerts.length,
        filters: options.filters || {},
        alerts: exportData,
      },
      null,
      2
    )

    return {
      data: jsonContent,
      filename: `alerts_export_${this.getTimestamp()}.json`,
      mimeType: 'application/json',
    }
  }

  /**
   * Escape CSV special characters
   */
  private escapeCSV(value: string): string {
    if (!value) return ''

    // Convert to string if not already
    const str = String(value)

    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }

    return str
  }

  /**
   * Get timestamp for filename
   */
  private getTimestamp(): string {
    const now = new Date()
    return now
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .substring(0, 19)
  }

  /**
   * Get export statistics
   */
  async getExportStats(filters?: ExportFilters): Promise<{
    totalAlerts: number
    severityBreakdown: Record<string, number>
    statusBreakdown: Record<string, number>
    estimatedFileSize: string
  }> {
    const alerts = await this.fetchAlerts(filters)

    const severityBreakdown: Record<string, number> = {}
    const statusBreakdown: Record<string, number> = {}

    alerts.forEach((alert) => {
      severityBreakdown[alert.severity] = (severityBreakdown[alert.severity] || 0) + 1
      statusBreakdown[alert.status] = (statusBreakdown[alert.status] || 0) + 1
    })

    // Rough estimate of file size
    const avgAlertSize = 500 // bytes
    const estimatedBytes = alerts.length * avgAlertSize
    const estimatedFileSize =
      estimatedBytes < 1024
        ? `${estimatedBytes} B`
        : estimatedBytes < 1024 * 1024
          ? `${(estimatedBytes / 1024).toFixed(1)} KB`
          : `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`

    return {
      totalAlerts: alerts.length,
      severityBreakdown,
      statusBreakdown,
      estimatedFileSize,
    }
  }
}

// Singleton instance
let exportService: AlertExportService | null = null

/**
 * Get AlertExportService singleton instance
 */
export function getAlertExportService(): AlertExportService {
  if (!exportService) {
    exportService = new AlertExportService()
  }
  return exportService
}
