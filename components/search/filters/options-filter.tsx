'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { AdvancedFilters } from '@/types/filters'
import { FilterSection } from './filter-section'

interface OptionsFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

export function OptionsFilterSection({ filters, onChange }: OptionsFilterSectionProps) {
  const activeCount =
    (filters.options?.profilePlusOnly ? 1 : 0) +
    (filters.options?.activeCompaniesOnly ? 1 : 0) +
    (filters.options?.companiesWithContactInfoOnly ? 1 : 0)

  return (
    <FilterSection title="Options" activeCount={activeCount} defaultExpanded>
      <div className="space-y-4">
        {/* Profile+ Only */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="profile-plus-only" className="text-sm font-medium">
              PROFILE+ only
            </Label>
            <p className="text-xs text-muted-foreground">
              Show only premium profile companies
            </p>
          </div>
          <Switch
            id="profile-plus-only"
            checked={filters.options?.profilePlusOnly || false}
            onCheckedChange={checked =>
              onChange({
                ...filters,
                options: {
                  ...filters.options,
                  profilePlusOnly: checked,
                },
              })
            }
          />
        </div>

        {/* Active Companies Only */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="active-companies-only" className="text-sm font-medium">
              Active companies only
            </Label>
            <p className="text-xs text-muted-foreground">
              Exclude dormant or inactive companies
            </p>
          </div>
          <Switch
            id="active-companies-only"
            checked={filters.options?.activeCompaniesOnly ?? true}
            onCheckedChange={checked =>
              onChange({
                ...filters,
                options: {
                  ...filters.options,
                  activeCompaniesOnly: checked,
                },
              })
            }
          />
        </div>

        {/* Companies with Contact Info Only */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="contact-info-only" className="text-sm font-medium">
              Companies w/contact info only
            </Label>
            <p className="text-xs text-muted-foreground">
              Show only companies with available contact details
            </p>
          </div>
          <Switch
            id="contact-info-only"
            checked={filters.options?.companiesWithContactInfoOnly || false}
            onCheckedChange={checked =>
              onChange({
                ...filters,
                options: {
                  ...filters.options,
                  companiesWithContactInfoOnly: checked,
                },
              })
            }
          />
        </div>
      </div>
    </FilterSection>
  )
}
