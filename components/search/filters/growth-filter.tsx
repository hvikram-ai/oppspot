'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { AdvancedFilters } from '@/types/filters'
import { FilterSection } from './filter-section'

interface GrowthFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

export function GrowthFilterSection({ filters, onChange }: GrowthFilterSectionProps) {
  const activeCount =
    (filters.growth?.employeeGrowth3moMin || filters.growth?.employeeGrowth3moMax ? 1 : 0) +
    (filters.growth?.employeeGrowth6moMin || filters.growth?.employeeGrowth6moMax ? 1 : 0) +
    (filters.growth?.employeeGrowth12moMin || filters.growth?.employeeGrowth12moMax ? 1 : 0) +
    (filters.growth?.jobOpeningsMin || filters.growth?.jobOpeningsMax ? 1 : 0) +
    (filters.growth?.webTrafficRankChangePctMin || filters.growth?.webTrafficRankChangePctMax
      ? 1
      : 0)

  const GrowthField = ({
    label,
    tooltip,
    minKey,
    maxKey,
  }: {
    label: string
    tooltip: string
    minKey: keyof typeof filters.growth
    maxKey: keyof typeof filters.growth
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label className="text-xs">{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder="Min"
          className="h-8 text-xs"
          value={(filters.growth?.[minKey] as number) || ''}
          onChange={e =>
            onChange({
              ...filters,
              growth: {
                ...filters.growth,
                [minKey]: parseFloat(e.target.value) || undefined,
              },
            })
          }
        />
        <Input
          type="number"
          placeholder="Max"
          className="h-8 text-xs"
          value={(filters.growth?.[maxKey] as number) || ''}
          onChange={e =>
            onChange({
              ...filters,
              growth: {
                ...filters.growth,
                [maxKey]: parseFloat(e.target.value) || undefined,
              },
            })
          }
        />
      </div>
    </div>
  )

  return (
    <FilterSection title="Growth" activeCount={activeCount}>
      <div className="space-y-3">
        <GrowthField
          label="12 mo employee growth rate (%)"
          tooltip="Year-over-year employee growth percentage"
          minKey="employeeGrowth12moMin"
          maxKey="employeeGrowth12moMax"
        />

        <GrowthField
          label="6 mo employee growth rate (%)"
          tooltip="Half-year employee growth percentage"
          minKey="employeeGrowth6moMin"
          maxKey="employeeGrowth6moMax"
        />

        <GrowthField
          label="3 mo employee growth rate (%)"
          tooltip="Quarterly employee growth percentage"
          minKey="employeeGrowth3moMin"
          maxKey="employeeGrowth3moMax"
        />

        <GrowthField
          label="Job openings"
          tooltip="Number of active job postings"
          minKey="jobOpeningsMin"
          maxKey="jobOpeningsMax"
        />

        <GrowthField
          label="Web traffic rank change (%)"
          tooltip="Percentage change in web traffic ranking"
          minKey="webTrafficRankChangePctMin"
          maxKey="webTrafficRankChangePctMax"
        />
      </div>
    </FilterSection>
  )
}
