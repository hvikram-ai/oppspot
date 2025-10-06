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
import type { AdvancedFilters, Currency, FundingRound } from '@/types/filters'
import { FilterSection } from './filter-section'

interface FundingFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

const FUNDING_ROUNDS: { value: FundingRound; label: string }[] = [
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C' },
  { value: 'series_d', label: 'Series D' },
  { value: 'series_e', label: 'Series E' },
  { value: 'growth', label: 'Growth' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'debt', label: 'Debt' },
]

export function FundingFilterSection({ filters, onChange }: FundingFilterSectionProps) {
  const currency = filters.funding?.fundingCurrency || 'GBP'
  const latestRounds = filters.funding?.latestRound || []

  const handleRoundToggle = (round: FundingRound) => {
    const newRounds = latestRounds.includes(round)
      ? latestRounds.filter(r => r !== round)
      : [...latestRounds, round]

    onChange({
      ...filters,
      funding: {
        ...filters.funding,
        latestRound: newRounds,
      },
    })
  }

  const activeCount =
    (filters.funding?.fundingTotalMin || filters.funding?.fundingTotalMax ? 1 : 0) +
    (filters.funding?.fundingLatestMin || filters.funding?.fundingLatestMax ? 1 : 0) +
    latestRounds.length +
    (filters.funding?.investmentDateFrom || filters.funding?.investmentDateTo ? 1 : 0)

  return (
    <FilterSection title="Funding" activeCount={activeCount}>
      <div className="space-y-4">
        {/* Currency Selector */}
        <div className="flex items-center justify-end">
          <Select
            value={currency}
            onValueChange={(value: Currency) =>
              onChange({
                ...filters,
                funding: {
                  ...filters.funding,
                  fundingCurrency: value,
                },
              })
            }
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Total Funding */}
        <div className="space-y-2">
          <Label>Total $ raised (millions)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.funding?.fundingTotalMin || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  funding: {
                    ...filters.funding,
                    fundingTotalMin: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.funding?.fundingTotalMax || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  funding: {
                    ...filters.funding,
                    fundingTotalMax: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Latest Funding */}
        <div className="space-y-2">
          <Label>Latest $ raised (millions)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.funding?.fundingLatestMin || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  funding: {
                    ...filters.funding,
                    fundingLatestMin: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.funding?.fundingLatestMax || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  funding: {
                    ...filters.funding,
                    fundingLatestMax: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Latest Round */}
        <div className="space-y-2">
          <Label>Latest Round Raised</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {FUNDING_ROUNDS.map(round => (
              <div key={round.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`round-${round.value}`}
                  checked={latestRounds.includes(round.value)}
                  onCheckedChange={() => handleRoundToggle(round.value)}
                />
                <label htmlFor={`round-${round.value}`} className="text-sm cursor-pointer">
                  {round.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Investment Date Range */}
        <div className="space-y-2">
          <Label>Investment Date Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              placeholder="From"
              value={filters.funding?.investmentDateFrom || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  funding: {
                    ...filters.funding,
                    investmentDateFrom: e.target.value || undefined,
                  },
                })
              }
            />
            <Input
              type="date"
              placeholder="To"
              value={filters.funding?.investmentDateTo || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  funding: {
                    ...filters.funding,
                    investmentDateTo: e.target.value || undefined,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Include Unfunded */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-unfunded"
            checked={filters.funding?.includeUnfunded || false}
            onCheckedChange={checked =>
              onChange({
                ...filters,
                funding: {
                  ...filters.funding,
                  includeUnfunded: checked as boolean,
                },
              })
            }
          />
          <label htmlFor="include-unfunded" className="text-xs cursor-pointer">
            Include unfunded companies
          </label>
        </div>
      </div>
    </FilterSection>
  )
}
