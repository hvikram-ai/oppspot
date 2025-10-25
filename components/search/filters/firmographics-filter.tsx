'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { AdvancedFilters, OwnershipType } from '@/types/filters'
import { FilterSection } from './filter-section'
import { LocationAutocomplete } from '../location-autocomplete'

interface FirmographicsFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

interface Location {
  id: string
  name: string
  type: 'city' | 'region' | 'country' | 'postcode'
  country: string
  region?: string
  formatted: string
}

const OWNERSHIP_TYPES: { value: OwnershipType; label: string }[] = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
  { value: 'vc_backed', label: 'VC Backed' },
  { value: 'pe_backed', label: 'PE Backed' },
  { value: 'family_owned', label: 'Family Owned' },
  { value: 'government', label: 'Government' },
  { value: 'nonprofit', label: 'Non-Profit' },
]

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Construction',
  'Real Estate',
  'Education',
  'Transportation',
  'Energy',
]

export function FirmographicsFilterSection({
  filters,
  onChange,
}: FirmographicsFilterSectionProps) {
  const ownership = filters.firmographics?.ownership || []
  const industries = filters.firmographics?.industries || []
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([])

  // Initialize selected locations from filter
  useEffect(() => {
    const locationStrings = filters.firmographics?.locations || []
    if (locationStrings.length > 0 && selectedLocations.length === 0) {
      // Convert location strings to Location objects
      const locations = locationStrings.map((loc, idx) => ({
        id: `location-${idx}`,
        name: loc,
        type: 'city' as const,
        country: 'United Kingdom',
        formatted: loc,
      }))
      setSelectedLocations(locations)
    }
  }, [filters.firmographics?.locations]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocationsChange = (locations: Location[]) => {
    setSelectedLocations(locations)

    // Extract formatted location strings for filter
    const locationStrings = locations.map(l => l.formatted)
    onChange({
      ...filters,
      firmographics: {
        ...filters.firmographics,
        locations: locationStrings,
      },
    })
  }

  const handleOwnershipToggle = (type: OwnershipType) => {
    const newOwnership = ownership.includes(type)
      ? ownership.filter(o => o !== type)
      : [...ownership, type]

    onChange({
      ...filters,
      firmographics: {
        ...filters.firmographics,
        ownership: newOwnership,
      },
    })
  }

  const handleIndustryToggle = (industry: string) => {
    const newIndustries = industries.includes(industry)
      ? industries.filter(i => i !== industry)
      : [...industries, industry]

    onChange({
      ...filters,
      firmographics: {
        ...filters.firmographics,
        industries: newIndustries,
      },
    })
  }

  const activeCount =
    selectedLocations.length +
    ownership.length +
    industries.length +
    (filters.firmographics?.foundedYearMin ? 1 : 0) +
    (filters.firmographics?.foundedYearMax ? 1 : 0)

  return (
    <FilterSection title="Firmographics" activeCount={activeCount}>
      <div className="space-y-4">
        {/* Location */}
        <div className="space-y-2">
          <Label>Location</Label>
          <LocationAutocomplete
            selectedLocations={selectedLocations}
            onLocationsChange={handleLocationsChange}
            placeholder="City, region, or country"
            maxSelections={10}
          />
          <p className="text-xs text-muted-foreground">
            Search for cities, regions, or countries in UK & Ireland
          </p>
        </div>

        {/* Ownership */}
        <div className="space-y-2">
          <Label>Ownership</Label>
          <div className="space-y-2">
            {OWNERSHIP_TYPES.map(type => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`ownership-${type.value}`}
                  checked={ownership.includes(type.value)}
                  onCheckedChange={() => handleOwnershipToggle(type.value)}
                />
                <label
                  htmlFor={`ownership-${type.value}`}
                  className="text-sm cursor-pointer"
                >
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label>Industry</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {INDUSTRIES.map(industry => (
              <div key={industry} className="flex items-center space-x-2">
                <Checkbox
                  id={`industry-${industry}`}
                  checked={industries.includes(industry)}
                  onCheckedChange={() => handleIndustryToggle(industry)}
                />
                <label
                  htmlFor={`industry-${industry}`}
                  className="text-sm cursor-pointer"
                >
                  {industry}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Founded Year */}
        <div className="space-y-2">
          <Label>Founded Year</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.firmographics?.foundedYearMin || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  firmographics: {
                    ...filters.firmographics,
                    foundedYearMin: parseInt(e.target.value) || undefined,
                  },
                })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.firmographics?.foundedYearMax || ''}
              onChange={e =>
                onChange({
                  ...filters,
                  firmographics: {
                    ...filters.firmographics,
                    foundedYearMax: parseInt(e.target.value) || undefined,
                  },
                })
              }
            />
          </div>
        </div>
      </div>
    </FilterSection>
  )
}
