/**
 * Export Dialog Component
 *
 * Dialog for exporting alerts to CSV or JSON with filtering options.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Download, Calendar as CalendarIcon, Loader2, FileText, FileJson } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { toast } = useToast()
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [isExporting, setIsExporting] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Filters
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  // Options
  const [includeContext, setIncludeContext] = useState(false)
  const [includeErrorStack, setIncludeErrorStack] = useState(false)

  // Stats
  const [stats, setStats] = useState<{
    totalAlerts: number
    severityBreakdown: Record<string, number>
    statusBreakdown: Record<string, number>
    estimatedFileSize: string
  } | null>(null)

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const filters: any = {}

      if (selectedSeverities.length > 0) filters.severity = selectedSeverities
      if (selectedStatuses.length > 0) filters.status = selectedStatuses
      if (selectedCategories.length > 0) filters.category = selectedCategories

      if (dateRange === 'today') {
        filters.startDate = new Date()
        filters.startDate.setHours(0, 0, 0, 0)
      } else if (dateRange === 'week') {
        filters.startDate = new Date()
        filters.startDate.setDate(filters.startDate.getDate() - 7)
      } else if (dateRange === 'month') {
        filters.startDate = new Date()
        filters.startDate.setMonth(filters.startDate.getMonth() - 1)
      } else if (dateRange === 'custom') {
        if (startDate) filters.startDate = startDate
        if (endDate) filters.endDate = endDate
      }

      const response = await fetch('/api/alerts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })

      if (!response.ok) throw new Error('Failed to load stats')

      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('[ExportDialog] Failed to load stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [selectedSeverities, selectedStatuses, selectedCategories, dateRange, startDate, endDate])

  // Load statistics when filters change
  useEffect(() => {
    if (open) {
      loadStats()
    }
  }, [open, loadStats])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append('format', format)

      if (selectedSeverities.length > 0) params.append('severity', selectedSeverities.join(','))
      if (selectedStatuses.length > 0) params.append('status', selectedStatuses.join(','))
      if (selectedCategories.length > 0) params.append('category', selectedCategories.join(','))

      if (dateRange === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        params.append('startDate', today.toISOString())
      } else if (dateRange === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        params.append('startDate', weekAgo.toISOString())
      } else if (dateRange === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        params.append('startDate', monthAgo.toISOString())
      } else if (dateRange === 'custom') {
        if (startDate) params.append('startDate', startDate.toISOString())
        if (endDate) params.append('endDate', endDate.toISOString())
      }

      if (includeContext) params.append('includeContext', 'true')
      if (includeErrorStack) params.append('includeErrorStack', 'true')

      // Fetch export file
      const response = await fetch(`/api/alerts/export?${params}`)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `alerts_export.${format}`

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export Successful',
        description: `Downloaded ${filename}`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('[ExportDialog] Export error:', error)
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export alerts',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const toggleSeverity = (severity: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    )
  }

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Alerts</DialogTitle>
          <DialogDescription>
            Export alerts to CSV or JSON format with optional filters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'csv' | 'json')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  CSV (Spreadsheet)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  JSON (Data)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateRange === 'custom' && (
              <div className="flex gap-4 mt-2">
                <div className="flex-1">
                  <Label className="text-xs">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1">
                  <Label className="text-xs">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* Severity Filter */}
          <div className="space-y-2">
            <Label>Severity (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {['P0', 'P1', 'P2', 'P3'].map((severity) => (
                <div key={severity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`severity-${severity}`}
                    checked={selectedSeverities.includes(severity)}
                    onCheckedChange={() => toggleSeverity(severity)}
                  />
                  <Label htmlFor={`severity-${severity}`} className="cursor-pointer">
                    {severity}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {['open', 'acknowledged', 'investigating', 'resolved', 'false_positive'].map(
                (status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <Label htmlFor={`status-${status}`} className="cursor-pointer capitalize">
                      {status.replace('_', ' ')}
                    </Label>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-2">
            <Label>Additional Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeContext"
                  checked={includeContext}
                  onCheckedChange={(checked) => setIncludeContext(checked as boolean)}
                />
                <Label htmlFor="includeContext" className="cursor-pointer">
                  Include context data (larger file)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeErrorStack"
                  checked={includeErrorStack}
                  onCheckedChange={(checked) => setIncludeErrorStack(checked as boolean)}
                />
                <Label htmlFor="includeErrorStack" className="cursor-pointer">
                  Include error stack traces (larger file)
                </Label>
              </div>
            </div>
          </div>

          {/* Export Preview */}
          {stats && !isLoadingStats && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="font-semibold">Export Preview</div>
              <div className="text-sm space-y-1">
                <div>Total Alerts: {stats.totalAlerts}</div>
                <div>Estimated File Size: {stats.estimatedFileSize}</div>
                {Object.keys(stats.severityBreakdown).length > 0 && (
                  <div>
                    Severity:{' '}
                    {Object.entries(stats.severityBreakdown)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {isLoadingStats && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !stats || stats.totalAlerts === 0}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {stats?.totalAlerts || 0} Alerts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
