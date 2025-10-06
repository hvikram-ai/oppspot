'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, X, Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Location {
  id: string
  name: string
  type: 'city' | 'region' | 'country' | 'postcode'
  country: string
  region?: string
  formatted: string
}

interface LocationAutocompleteProps {
  selectedLocations: Location[]
  onLocationsChange: (locations: Location[]) => void
  placeholder?: string
  maxSelections?: number
  className?: string
}

export function LocationAutocomplete({
  selectedLocations,
  onLocationsChange,
  placeholder = 'Type to search locations...',
  maxSelections,
  className,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<Location[]>([])
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

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    const timeoutId = setTimeout(() => {
      searchLocations(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const searchLocations = useCallback(async (searchQuery: string) => {
    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/locations/autocomplete?q=${encodeURIComponent(searchQuery)}`
      )

      if (!response.ok) {
        throw new Error('Failed to search locations')
      }

      const data = await response.json()

      if (data.success && data.results) {
        // Filter out already selected locations
        const selectedIds = new Set(selectedLocations.map(l => l.id))
        const filteredResults = data.results.filter(
          (location: Location) => !selectedIds.has(location.id)
        )

        setResults(filteredResults)
        setShowResults(true)
      } else {
        setResults([])
        setError(data.warning || 'No locations found')
      }
    } catch (err) {
      console.error('Location search error:', err)
      setError('Failed to search locations')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [selectedLocations])

  const handleSelectLocation = (location: Location) => {
    if (maxSelections && selectedLocations.length >= maxSelections) {
      return
    }

    onLocationsChange([...selectedLocations, location])
    setQuery('')
    setResults([])
    setShowResults(false)
    inputRef.current?.focus()
  }

  const handleRemoveLocation = (locationId: string) => {
    onLocationsChange(selectedLocations.filter(l => l.id !== locationId))
  }

  const isMaxReached = maxSelections && selectedLocations.length >= maxSelections

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'city':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      case 'region':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
      case 'country':
        return 'bg-green-500/10 text-green-700 dark:text-green-400'
      case 'postcode':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected Locations */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLocations.map(location => (
            <Badge key={location.id} variant="secondary" className="gap-1 pr-1">
              <MapPin className="h-3 w-3" />
              <span className="max-w-[200px] truncate">{location.name}</span>
              {location.region && location.type === 'city' && (
                <span className="text-xs text-muted-foreground">
                  , {location.region}
                </span>
              )}
              <button
                onClick={() => handleRemoveLocation(location.id)}
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
            placeholder={
              isMaxReached
                ? `Maximum ${maxSelections} locations`
                : placeholder
            }
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowResults(true)
            }}
            disabled={isMaxReached}
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
                  {results.map(location => (
                    <button
                      key={location.id}
                      onClick={() => handleSelectLocation(location)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm transition-colors"
                      type="button"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm truncate">
                              {location.name}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs h-5 px-1.5',
                                getLocationTypeColor(location.type)
                              )}
                            >
                              {location.type}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {location.formatted}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {error || 'No locations found'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {maxSelections && (
        <p className="text-xs text-muted-foreground">
          {selectedLocations.length} of {maxSelections} locations selected
        </p>
      )}
    </div>
  )
}
