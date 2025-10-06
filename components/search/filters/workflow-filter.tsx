'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AdvancedFilters, Priority } from '@/types/filters'
import { FilterSection } from './filter-section'
import { ListSelector } from '../list-selector'
import { TagSelector } from '../tag-selector'

interface WorkflowFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export function WorkflowFilterSection({ filters, onChange }: WorkflowFilterSectionProps) {
  const priorities = filters.workflow?.priority || []
  const selectedListIds = filters.workflow?.onLists || []
  const selectedTags = filters.workflow?.hasTags || []

  const handleListsChange = (listIds: string[]) => {
    onChange({
      ...filters,
      workflow: {
        ...filters.workflow,
        onLists: listIds,
      },
    })
  }

  const handleTagsChange = (tags: string[]) => {
    onChange({
      ...filters,
      workflow: {
        ...filters.workflow,
        hasTags: tags,
      },
    })
  }

  const handlePriorityToggle = (priority: Priority) => {
    const newPriorities = priorities.includes(priority)
      ? priorities.filter(p => p !== priority)
      : [...priorities, priority]

    onChange({
      ...filters,
      workflow: {
        ...filters.workflow,
        priority: newPriorities,
      },
    })
  }

  const activeCount =
    selectedListIds.length +
    selectedTags.length +
    (filters.workflow?.customScoreMin || filters.workflow?.customScoreMax ? 1 : 0) +
    priorities.length +
    (filters.workflow?.lastContactedFrom || filters.workflow?.lastContactedTo ? 1 : 0) +
    (filters.workflow?.taggedWithin ? 1 : 0)

  return (
    <FilterSection title="My Workflow" activeCount={activeCount}>
      <div className="space-y-4">
        {/* Lists */}
        <div className="space-y-2">
          <Label>Lists</Label>
          <ListSelector
            selectedListIds={selectedListIds}
            onListsChange={handleListsChange}
            placeholder="Search lists..."
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <TagSelector
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
            placeholder="Search tags..."
          />
        </div>

        {/* Tagged Within */}
        <div className="space-y-2">
          <Label htmlFor="tagged-within">Tagged Within</Label>
          <Select
            value={filters.workflow?.taggedWithin || ''}
            onValueChange={value =>
              onChange({
                ...filters,
                workflow: {
                  ...filters.workflow,
                  taggedWithin: value || undefined,
                },
              })
            }
          >
            <SelectTrigger id="tagged-within">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Score */}
        <div className="space-y-2">
          <Label>Custom Score</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.workflow?.customScoreMin || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  workflow: {
                    ...filters.workflow,
                    customScoreMin: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.workflow?.customScoreMax || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  workflow: {
                    ...filters.workflow,
                    customScoreMax: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Last Contacted Date */}
        <div className="space-y-2">
          <Label>Last Contacted Date</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              placeholder="From"
              value={filters.workflow?.lastContactedFrom || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  workflow: {
                    ...filters.workflow,
                    lastContactedFrom: e.target.value || undefined,
                  },
                })
              }
            />
            <Input
              type="date"
              placeholder="To"
              value={filters.workflow?.lastContactedTo || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  workflow: {
                    ...filters.workflow,
                    lastContactedTo: e.target.value || undefined,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label>Priority</Label>
          <div className="space-y-2">
            {PRIORITIES.map(priority => (
              <div key={priority.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority.value}`}
                  checked={priorities.includes(priority.value)}
                  onCheckedChange={() => handlePriorityToggle(priority.value)}
                />
                <label
                  htmlFor={`priority-${priority.value}`}
                  className="text-sm cursor-pointer"
                >
                  {priority.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FilterSection>
  )
}
