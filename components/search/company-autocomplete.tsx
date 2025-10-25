'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, X, Loader2, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface CompanyAutocompleteProps {
  selectedCompanies: Company[]
  onCompaniesChange: (companies: Company[]) => void
  placeholder?: string
  maxSelections?: number
  className?: string
}

export function CompanyAutocomplete({
  selectedCompanies,
  onCompaniesChange,
  placeholder = 'Type to search companies...',
  maxSelections,
  className,
}: CompanyAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<Company[]>([])
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchCompanies = useCallback(async (searchQuery: string) => {
    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch('/api/companies/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10,
          useCache: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to search companies')
      }

      const data = await response.json()

      if (data.success && data.results) {
        // Map results to Company interface
        const companies: Company[] = data.results.map((result: any) => ({
          id: result.id || `company-${result.company_number}`,
          company_number: result.company_number,
          name: result.name || result.title,
          company_status: result.company_status,
          registered_office_address: result.registered_office_address || result.address,
        }))

        // Filter out already selected companies
        const selectedIds = new Set(selectedCompanies.map(c => c.id))
        const filteredResults = companies.filter(c => !selectedIds.has(c.id))

        setResults(filteredResults)
        setShowResults(true)
      } else {
        setResults([])
        setError(data.warning || 'No results found')
      }
    } catch (err) {
      console.error('Company search error:', err)
      setError('Failed to search companies')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [selectedCompanies])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    const timeoutId = setTimeout(() => {
      searchCompanies(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, searchCompanies])

  const handleSelectCompany = (company: Company) => {
    if (maxSelections && selectedCompanies.length >= maxSelections) {
      return
    }

    onCompaniesChange([...selectedCompanies, company])
    setQuery('')
    setResults([])
    setShowResults(false)
    inputRef.current?.focus()
  }

  const handleRemoveCompany = (companyId: string) => {
    onCompaniesChange(selectedCompanies.filter(c => c.id !== companyId))
  }

  const isMaxReached = maxSelections && selectedCompanies.length >= maxSelections

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected Companies */}
      {selectedCompanies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCompanies.map(company => (
            <Badge key={company.id} variant="secondary" className="gap-1 pr-1">
              <Building2 className="h-3 w-3" />
              <span className="max-w-[200px] truncate">{company.name}</span>
              <button
                onClick={() => handleRemoveCompany(company.id)}
                className="hover:bg-muted rounded-full p-0.5 ml-1"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={isMaxReached ? `Maximum ${maxSelections} companies` : placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowResults(true)
            }}
            disabled={isMaxReached || false}
            className="pl-9 pr-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results Dropdown */}
        {showResults && query.length >= 2 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg"
          >
            {results.length > 0 ? (
              <ScrollArea className="max-h-[300px]">
                <div className="p-1">
                  {results.map(company => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm transition-colors"
                      type="button"
                    >
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {company.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {company.company_number && (
                              <span>#{company.company_number}</span>
                            )}
                            {company.registered_office_address?.locality && (
                              <>
                                <span>•</span>
                                <span>{company.registered_office_address.locality}</span>
                              </>
                            )}
                            {company.company_status && (
                              <>
                                <span>•</span>
                                <span className={cn(
                                  company.company_status === 'active'
                                    ? 'text-green-600'
                                    : 'text-muted-foreground'
                                )}>
                                  {company.company_status}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {error || 'No companies found'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {maxSelections && (
        <p className="text-xs text-muted-foreground">
          {selectedCompanies.length} of {maxSelections} companies selected
        </p>
      )}
    </div>
  )
}
