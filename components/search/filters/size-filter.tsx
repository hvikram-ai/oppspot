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
import type { AdvancedFilters, Currency, EmployeeRange } from '@/types/filters'
import { FilterSection } from './filter-section'

interface SizeFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

const EMPLOYEE_RANGES: EmployeeRange[] = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001+',
]

export function SizeFilterSection({ filters, onChange }: SizeFilterSectionProps) {
  const currency = filters.size?.revenueCurrency || 'GBP'
  const employeeRanges = filters.size?.employeeRanges || []

  const handleRangeToggle = (range: EmployeeRange) => {
    const newRanges = employeeRanges.includes(range)
      ? employeeRanges.filter(r => r !== range)
      : [...employeeRanges, range]

    onChange({
      ...filters,
      size: {
        ...filters.size,
        employeeRanges: newRanges,
      },
    })
  }

  const activeCount =
    (filters.size?.employeeCountMin ? 1 : 0) +
    (filters.size?.employeeCountMax ? 1 : 0) +
    employeeRanges.length +
    (filters.size?.revenueMin ? 1 : 0) +
    (filters.size?.revenueMax ? 1 : 0)

  return (
    <FilterSection title="Size" activeCount={activeCount}>
      <div className="space-y-4">
        {/* Employee Count */}
        <div className="space-y-2">
          <Label>Employee Count</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.size?.employeeCountMin || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    employeeCountMin: parseInt(e.target.value) || undefined,
                  },
                })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.size?.employeeCountMax || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    employeeCountMax: parseInt(e.target.value) || undefined,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Employee Ranges */}
        <div className="space-y-2">
          <Label>Employee Range</Label>
          <div className="space-y-2">
            {EMPLOYEE_RANGES.map(range => (
              <div key={range} className="flex items-center space-x-2">
                <Checkbox
                  id={`range-${range}`}
                  checked={employeeRanges.includes(range)}
                  onCheckedChange={() => handleRangeToggle(range)}
                />
                <label htmlFor={`range-${range}`} className="text-sm cursor-pointer">
                  {range}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Estimated Revenue (millions)</Label>
            <Select
              value={currency}
              onValueChange={(value: Currency) =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    revenueCurrency: value,
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
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.size?.revenueMin || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    revenueMin: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.size?.revenueMax || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    revenueMax: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-revenue-unreported"
              checked={filters.size?.includeRevenueUnreported || false}
              onCheckedChange={checked =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    includeRevenueUnreported: checked as boolean,
                  },
                })
              }
            />
            <label
              htmlFor="include-revenue-unreported"
              className="text-xs cursor-pointer text-muted-foreground"
            >
              Include unreported
            </label>
          </div>
        </div>

        {/* Valuation */}
        <div className="space-y-2">
          <Label>Latest Valuation (millions)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.size?.valuationMin || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    valuationMin: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.size?.valuationMax || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    valuationMax: parseFloat(e.target.value) || undefined,
                  },
                })
              }
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-valuation-unreported"
              checked={filters.size?.includeValuationUnreported || false}
              onCheckedChange={checked =>
                onChange({
                  ...filters,
                  size: {
                    ...filters.size,
                    includeValuationUnreported: checked as boolean,
                  },
                })
              }
            />
            <label
              htmlFor="include-valuation-unreported"
              className="text-xs cursor-pointer text-muted-foreground"
            >
              Include unreported
            </label>
          </div>
        </div>
      </div>
    </FilterSection>
  )
}
