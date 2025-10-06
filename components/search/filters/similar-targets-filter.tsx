'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { AdvancedFilters } from '@/types/filters'
import { FilterSection } from './filter-section'
import { CompanyAutocomplete } from '../company-autocomplete'

interface SimilarTargetsFilterSectionProps {
  filters: AdvancedFilters
  onChange: (filters: AdvancedFilters) => void
}

interface Company {
  id: string
  company_number?: string
  name: string
  company_status?: string
  registered_office_address?: {
    locality?: string
    postal_code?: string
  }
}

export function SimilarTargetsFilterSection({
  filters,
  onChange,
}: SimilarTargetsFilterSectionProps) {
  const similarityThreshold = filters.similarTargets?.similarityThreshold || 0.7
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([])

  // Initialize selected companies from filter IDs
  // Note: In a real implementation, you might want to load full company details from IDs
  useEffect(() => {
    const companyIds = filters.similarTargets?.similarToCompanyIds || []
    // For now, we'll just create placeholder objects
    // In production, you might want to fetch full details from the API
    if (companyIds.length > 0 && selectedCompanies.length === 0) {
      const companies = companyIds.map(id => ({
        id,
        name: `Company ${id}`,
      }))
      setSelectedCompanies(companies)
    }
  }, [filters.similarTargets?.similarToCompanyIds])

  const handleCompaniesChange = (companies: Company[]) => {
    setSelectedCompanies(companies)

    // Extract IDs and update filter
    const companyIds = companies.map(c => c.id)
    onChange({
      ...filters,
      similarTargets: {
        ...filters.similarTargets,
        similarToCompanyIds: companyIds,
      },
    })
  }

  const activeCount = selectedCompanies.length

  return (
    <FilterSection title="Similar Targets" activeCount={activeCount}>
      <div className="space-y-4">
        {/* Company Search */}
        <div className="space-y-2">
          <Label>Find companies similar to</Label>
          <CompanyAutocomplete
            selectedCompanies={selectedCompanies}
            onCompaniesChange={handleCompaniesChange}
            placeholder="Type to search companies..."
            maxSelections={5}
          />
          <p className="text-xs text-muted-foreground">
            Search will find businesses similar to selected companies
          </p>
        </div>

        {/* Similarity Threshold */}
        {selectedCompanies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Similarity Threshold</Label>
              <span className="text-xs text-muted-foreground">
                {Math.round(similarityThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[similarityThreshold]}
              onValueChange={([value]) =>
                onChange({
                  ...filters,
                  similarTargets: {
                    ...filters.similarTargets,
                    similarityThreshold: value,
                  },
                })
              }
              min={0}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              Higher threshold = more similar companies (fewer results)
            </p>
          </div>
        )}
      </div>
    </FilterSection>
  )
}
