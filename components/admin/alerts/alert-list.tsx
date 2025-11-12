'use client'

/**
 * Alert List Component
 * Displays a filterable list of system alerts with bulk actions support
 */

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, AlertCircle, Loader2, Download } from 'lucide-react'
import { AlertCard } from './alert-card'
import { BulkActionsBar } from './bulk-actions-bar'
import { ExportDialog } from './export-dialog'
import { useAlertSubscription } from './use-alert-subscription'
import { useBulkSelection } from '@/hooks/use-bulk-selection'

interface AlertListProps {
  filter?: {
    severity?: string[]
    status?: string[]
    category?: string[]
  }
}

export function AlertList({ filter = {} }: AlertListProps) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Bulk selection state
  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
  } = useBulkSelection(alerts)

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()

      if (filter.severity?.length === 1) {
        params.append('severity', filter.severity[0])
      } else if (selectedSeverity !== 'all') {
        params.append('severity', selectedSeverity)
      }

      if (filter.status?.length) {
        // API expects single status, so we'll filter client-side for multiple
        if (filter.status.length === 1) {
          params.append('status', filter.status[0])
        }
      }

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      params.append('limit', '50')

      const response = await fetch(`/api/alerts?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      let fetchedAlerts = data.alerts || []

      // Client-side filtering for multiple statuses
      if (filter.status && filter.status.length > 1) {
        fetchedAlerts = fetchedAlerts.filter((alert: any) =>
          filter.status!.includes(alert.status)
        )
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        fetchedAlerts = fetchedAlerts.filter(
          (alert: any) =>
            alert.title?.toLowerCase().includes(query) ||
            alert.message?.toLowerCase().includes(query) ||
            alert.source_service?.toLowerCase().includes(query) ||
            alert.source_endpoint?.toLowerCase().includes(query)
        )
      }

      setAlerts(fetchedAlerts)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
      setAlerts([])
    } finally {
      setIsLoading(false)
    }
  }, [filter, selectedSeverity, selectedCategory, searchQuery])

  // Real-time subscription for alert updates
  const { isConnected } = useAlertSubscription(() => {
    console.log('[AlertList] Real-time update received, refreshing...')
    fetchAlerts()
  })

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchAlerts()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [fetchAlerts, searchQuery])

  const handleAlertUpdate = () => {
    fetchAlerts()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts by title, message, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Severity Filter */}
          {!filter.severity && (
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="P0">P0 - Critical</SelectItem>
                <SelectItem value="P1">P1 - High</SelectItem>
                <SelectItem value="P2">P2 - Medium</SelectItem>
                <SelectItem value="P3">P3 - Low</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="database_failure">Database</SelectItem>
              <SelectItem value="api_failure">API</SelectItem>
              <SelectItem value="external_service_failure">External Service</SelectItem>
              <SelectItem value="auth_failure">Authentication</SelectItem>
              <SelectItem value="performance_degradation">Performance</SelectItem>
              <SelectItem value="security_incident">Security</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(searchQuery || selectedSeverity !== 'all' || selectedCategory !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setSelectedSeverity('all')
                setSelectedCategory('all')
              }}
            >
              Clear Filters
            </Button>
          )}

          {/* Export Button */}
          <Button variant="outline" onClick={() => setShowExportDialog(true)} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && alerts.length === 0 && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No alerts found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {searchQuery || selectedSeverity !== 'all' || selectedCategory !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No system alerts at this time. The system is running smoothly!'}
            </p>
          </div>
        </Card>
      )}

      {/* Alerts List */}
      {!isLoading && alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={toggleAll}
                ref={(checkbox) => {
                  if (checkbox) {
                    // @ts-expect-error - indeterminate is a valid property
                    checkbox.indeterminate = isIndeterminate
                  }
                }}
                aria-label="Select all alerts"
              />
              <div className="text-sm text-muted-foreground">
                {selectedCount > 0 ? (
                  <span className="font-medium text-foreground">
                    {selectedCount} of {alerts.length} selected
                  </span>
                ) : (
                  <span>
                    Showing {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onUpdate={handleAlertUpdate}
              isSelected={isSelected(alert.id)}
              onToggleSelection={() => toggleSelection(alert.id)}
            />
          ))}
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCount}
        selectedIds={selectedIds}
        onClear={clearSelection}
        onComplete={() => {
          fetchAlerts()
          clearSelection()
        }}
      />

      {/* Export Dialog */}
      <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
    </div>
  )
}
