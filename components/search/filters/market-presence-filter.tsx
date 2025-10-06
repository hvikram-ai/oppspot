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

interface MarketPresenceFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

export function MarketPresenceFilterSection({
  filters,
  onChange,
}: MarketPresenceFilterSectionProps) {
  const activeCount =
    (filters.marketPresence?.webPageViewsMin || filters.marketPresence?.webPageViewsMax ? 1 : 0) +
    (filters.marketPresence?.webTrafficRankMin || filters.marketPresence?.webTrafficRankMax
      ? 1
      : 0) +
    (filters.marketPresence?.sourcesCountMin || filters.marketPresence?.sourcesCountMax ? 1 : 0) +
    (filters.marketPresence?.conferenceCountMin || filters.marketPresence?.conferenceCountMax
      ? 1
      : 0)

  const PresenceField = ({
    label,
    tooltip,
    minKey,
    maxKey,
  }: {
    label: string
    tooltip: string
    minKey: keyof typeof filters.marketPresence
    maxKey: keyof typeof filters.marketPresence
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
          value={(filters.marketPresence?.[minKey] as number) || ''}
          onChange={e =>
            onChange({
              ...filters,
              marketPresence: {
                ...filters.marketPresence,
                [minKey]: parseFloat(e.target.value) || undefined,
              },
            })
          }
        />
        <Input
          type="number"
          placeholder="Max"
          className="h-8 text-xs"
          value={(filters.marketPresence?.[maxKey] as number) || ''}
          onChange={e =>
            onChange({
              ...filters,
              marketPresence: {
                ...filters.marketPresence,
                [maxKey]: parseFloat(e.target.value) || undefined,
              },
            })
          }
        />
      </div>
    </div>
  )

  return (
    <FilterSection title="Market Presence" activeCount={activeCount}>
      <div className="space-y-3">
        <PresenceField
          label="Webpage views"
          tooltip="Estimated monthly webpage views"
          minKey="webPageViewsMin"
          maxKey="webPageViewsMax"
        />

        <PresenceField
          label="Web traffic rank"
          tooltip="Global web traffic ranking (lower is better)"
          minKey="webTrafficRankMin"
          maxKey="webTrafficRankMax"
        />

        <PresenceField
          label="Sources count"
          tooltip="Number of data sources mentioning this company"
          minKey="sourcesCountMin"
          maxKey="sourcesCountMax"
        />

        <PresenceField
          label="Conference count"
          tooltip="Number of industry conferences attended or mentioned"
          minKey="conferenceCountMin"
          maxKey="conferenceCountMax"
        />
      </div>
    </FilterSection>
  )
}
