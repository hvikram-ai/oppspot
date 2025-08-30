'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { SearchBar } from '@/components/search/search-bar'
import { SearchFilters } from '@/components/search/search-filters'
import { SearchResults } from '@/components/search/search-results'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Filter, Download, Save } from 'lucide-react'
import { toast } from 'sonner'
import debounce from 'lodash/debounce'

interface SearchResult {
  id: string
  name: string
  description?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
  }
  phone?: string
  email?: string
  website?: string
  categories?: string[]
  rating?: number
  distance?: number
  relevance_score?: number
}

interface SearchFilters {
  categories?: string[]
  location?: string
  radius?: number
  minRating?: number
  verified?: boolean
  sortBy?: 'relevance' | 'distance' | 'rating' | 'name'
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance'
  })
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (query: string, searchFilters: SearchFilters) => {
      if (!query.trim() && !searchFilters.location) {
        setResults([])
        setTotalResults(0)
        return
      }

      setLoading(true)
      try {
        const params = new URLSearchParams({
          q: query,
          page: currentPage.toString(),
          limit: '20',
          ...Object.entries(searchFilters).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== '') {
              acc[key] = String(value)
            }
            return acc
          }, {} as Record<string, string>)
        })

        const response = await fetch(`/api/search?${params}`)
        if (!response.ok) throw new Error('Search failed')
        
        const data = await response.json()
        setResults(data.results || [])
        setTotalResults(data.total || 0)
        
        // Update URL with search params
        const newParams = new URLSearchParams()
        if (query) newParams.set('q', query)
        router.push(`/search?${newParams.toString()}`, { scroll: false })
      } catch (error) {
        console.error('Search error:', error)
        toast.error('Failed to perform search. Please try again.')
      } finally {
        setLoading(false)
      }
    }, 500),
    [currentPage, router]
  )

  // Effect to trigger search
  useEffect(() => {
    performSearch(searchQuery, filters)
  }, [searchQuery, filters, currentPage])

  // Handle save to list
  const handleSaveToList = async () => {
    if (selectedResults.size === 0) {
      toast.error('Please select businesses to save')
      return
    }

    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Search Results - ${new Date().toLocaleDateString()}`,
          businessIds: Array.from(selectedResults)
        })
      })

      if (!response.ok) throw new Error('Failed to save list')
      
      toast.success(`Saved ${selectedResults.size} businesses to list`)
      setSelectedResults(new Set())
    } catch (error) {
      console.error('Save to list error:', error)
      toast.error('Failed to save to list')
    }
  }

  // Handle export
  const handleExport = async () => {
    if (results.length === 0) {
      toast.error('No results to export')
      return
    }

    try {
      const dataToExport = selectedResults.size > 0 
        ? results.filter(r => selectedResults.has(r.id))
        : results

      const csv = convertToCSV(dataToExport)
      downloadCSV(csv, `search-results-${Date.now()}.csv`)
      toast.success('Results exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export results')
    }
  }

  // Convert results to CSV
  const convertToCSV = (data: SearchResult[]) => {
    const headers = ['Name', 'Description', 'Address', 'Phone', 'Email', 'Website', 'Categories']
    const rows = data.map(item => [
      item.name,
      item.description || '',
      `${item.address?.street || ''} ${item.address?.city || ''} ${item.address?.state || ''}`.trim(),
      item.phone || '',
      item.email || '',
      item.website || '',
      item.categories?.join('; ') || ''
    ])

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
  }

  // Download CSV file
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Search Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Search Businesses</h1>
                <p className="text-muted-foreground">
                  Find UK & Ireland businesses with AI-powered search
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={results.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button
                  onClick={handleSaveToList}
                  disabled={selectedResults.size === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save to List ({selectedResults.size})
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, category, or describe what you're looking for..."
              loading={loading}
            />

            {/* Quick Stats */}
            {totalResults > 0 && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{totalResults.toLocaleString()} results found</span>
                {loading && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Searching...
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <SearchFilters
              filters={filters}
              onChange={setFilters}
              resultCount={totalResults}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <SearchResults
              results={results}
              loading={loading}
              selectedResults={selectedResults}
              onSelectionChange={setSelectedResults}
              currentPage={currentPage}
              totalPages={Math.ceil(totalResults / 20)}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  )
}