'use client'

import { useState, useCallback, useEffect } from 'react'
import { AdvancedSearchFilters } from '@/components/search/advanced-search-filters'
import { SearchResults } from '@/components/search/search-results'
import type { AdvancedFilters, FilteredSearchResponse } from '@/types/filters'
import { Loader2 } from 'lucide-react'

interface SavedSearch {
  id: string
  name: string
  description: string | null
  filters: AdvancedFilters
  is_favorite: boolean
  execution_count: number
  last_executed_at: string | null
  result_count: number | null
  created_at: string
  updated_at: string
}

export default function AdvancedSearchPage() {
  const [filters, setFilters] = useState<AdvancedFilters>({
    options: {
      activeCompaniesOnly: true, // Default to active companies
    },
  })
  const [results, setResults] = useState<FilteredSearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])

  // Auto-search on filter changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [filters])

  const handleSearch = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          pagination: {
            page: 1,
            perPage: 20,
          },
          sorting: {
            field: 'relevance',
            direction: 'desc',
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Search error:', error)
        throw new Error(error.message || 'Search failed')
      }

      const data: FilteredSearchResponse = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Failed to execute search:', error)
      // Show error toast/notification
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const handleSaveSearch = useCallback(
    async (name: string, searchFilters: AdvancedFilters, description?: string) => {
      try {
        const response = await fetch('/api/search/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            filters: searchFilters,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to save search')
        }

        const data = await response.json()
        if (data.success && data.search) {
          setSavedSearches(prev => [...prev, data.search])
          // Show success toast
          console.log('Search saved successfully:', data.search.name)
        }
      } catch (error) {
        console.error('Failed to save search:', error)
        // Show error toast/notification
        alert(error instanceof Error ? error.message : 'Failed to save search')
      }
    },
    []
  )

  const handleDeleteSearch = useCallback(
    async (searchId: string) => {
      try {
        const response = await fetch(`/api/search/saved/${searchId}`, {
          method: 'DELETE',
        })

        if (!response.ok) throw new Error('Failed to delete search')

        setSavedSearches(prev => prev.filter(s => s.id !== searchId))
        console.log('Search deleted successfully')
      } catch (error) {
        console.error('Failed to delete search:', error)
        alert('Failed to delete search')
      }
    },
    []
  )

  // Load saved searches on mount
  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        const response = await fetch('/api/search/saved')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.searches) {
            setSavedSearches(data.searches)
          }
        }
      } catch (error) {
        console.error('Failed to load saved searches:', error)
      }
    }
    loadSavedSearches()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Filter Sidebar */}
      <aside className="w-96 border-r bg-background">
        <AdvancedSearchFilters
          filters={filters}
          onChange={setFilters}
          onApply={handleSearch}
          resultCount={results?.total || 0}
          isLoading={isLoading}
          savedSearches={savedSearches}
          onSaveSearch={handleSaveSearch}
          onDeleteSearch={handleDeleteSearch}
        />
      </aside>

      {/* Results Area */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {isLoading && !results ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : results ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Search Results</h1>
                <p className="text-muted-foreground mt-1">
                  Found {results.total.toLocaleString()} businesses in{' '}
                  {results.executionTimeMs}ms
                </p>
              </div>
              <SearchResults businesses={results.businesses} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-lg font-medium mb-2">Start your search</p>
              <p className="text-muted-foreground">
                Apply filters on the left to find businesses
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
