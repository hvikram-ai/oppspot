'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { AdvancedFilters, CRMSyncStatus } from '@/types/filters'
import { FilterSection } from './filter-section'

interface CRMFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

const CRM_STATUSES: { value: CRMSyncStatus; label: string }[] = [
  { value: 'synced', label: 'Synced with CRM' },
  { value: 'not_synced', label: 'Not synced with CRM' },
  { value: 'pending', label: 'Sync pending' },
  { value: 'failed', label: 'Sync failed' },
]

export function CRMFilterSection({ filters, onChange }: CRMFilterSectionProps) {
  const syncStatuses = filters.crm?.crmSyncStatus || []

  const handleStatusToggle = (status: CRMSyncStatus) => {
    const newStatuses = syncStatuses.includes(status)
      ? syncStatuses.filter(s => s !== status)
      : [...syncStatuses, status]

    onChange({
      ...filters,
      crm: {
        ...filters.crm,
        crmSyncStatus: newStatuses,
      },
    })
  }

  const activeCount = syncStatuses.length

  return (
    <FilterSection title="CRM" activeCount={activeCount}>
      <div className="space-y-2">
        <Label>CRM Sync Status</Label>
        <div className="space-y-2">
          {CRM_STATUSES.map(status => (
            <div key={status.value} className="flex items-center space-x-2">
              <Checkbox
                id={`crm-status-${status.value}`}
                checked={syncStatuses.includes(status.value)}
                onCheckedChange={() => handleStatusToggle(status.value)}
              />
              <label
                htmlFor={`crm-status-${status.value}`}
                className="text-sm cursor-pointer"
              >
                {status.label}
              </label>
            </div>
          ))}
        </div>
      </div>
    </FilterSection>
  )
}
