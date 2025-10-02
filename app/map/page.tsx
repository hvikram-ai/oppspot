'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { MapView } from '@/components/map/map-view'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { MapSidebar } from '@/components/map/map-sidebar'
import { MapControls } from '@/components/map/map-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

export interface Business {
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
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  website?: string
  categories?: string[]
  rating?: number
  verified?: boolean
}

export interface MapFilters {
  categories?: string[]
  minRating?: number
  verified?: boolean
  searchQuery?: string
}

export default function MapPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [mapBounds, setMapBounds] = useState<{
    north: number
    south: number
    east: number
    west: number
  } | null>(null)
  const [filters, setFilters] = useState<MapFilters>({})
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([53.5, -2.5]) // Center of UK
  const [mapZoom, setMapZoom] = useState(6)

  // Fetch businesses based on map bounds and filters
  const fetchBusinesses = useCallback(async () => {
    if (!mapBounds) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        north: mapBounds.north.toString(),
        south: mapBounds.south.toString(),
        east: mapBounds.east.toString(),
        west: mapBounds.west.toString(),
        ...(filters.searchQuery && { q: filters.searchQuery }),
        ...(filters.categories?.length && { categories: filters.categories.join(',') }),
        ...(filters.minRating && { minRating: filters.minRating.toString() }),
        ...(filters.verified && { verified: 'true' })
      })

      const response = await fetch(`/api/map/businesses?${params}`)
      if (!response.ok) throw new Error('Failed to fetch businesses')

      const data = await response.json()
      setBusinesses(data.businesses || [])
    } catch (error) {
      console.error('Error fetching businesses:', error)
      toast.error('Failed to load businesses')
    } finally {
      setLoading(false)
    }
  }, [mapBounds, filters])

  // Fetch businesses when bounds or filters change
  useEffect(() => {
    if (mapBounds) {
      fetchBusinesses()
    }
  }, [mapBounds, filters, fetchBusinesses])

  // Handle search
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, searchQuery: searchInput }))
  }

  // Handle location search (geocoding)
  const handleLocationSearch = async (location: string) => {
    try {
      // This would use a geocoding service in production
      // For now, we'll use predefined locations
      const locations: Record<string, [number, number]> = {
        'london': [51.5074, -0.1278],
        'manchester': [53.4808, -2.2426],
        'edinburgh': [55.9533, -3.1883],
        'dublin': [53.3498, -6.2603],
        'birmingham': [52.4862, -1.8904],
        'glasgow': [55.8642, -4.2518],
        'cardiff': [51.4816, -3.1791],
        'belfast': [54.5973, -5.9301]
      }

      const searchKey = location.toLowerCase()
      if (locations[searchKey]) {
        setMapCenter(locations[searchKey])
        setMapZoom(12)
        toast.success(`Showing ${location}`)
      } else {
        toast.error('Location not found. Try: London, Manchester, Edinburgh, Dublin')
      }
    } catch (error) {
      console.error('Location search error:', error)
      toast.error('Failed to search location')
    }
  }

  return (
    <ProtectedLayout>
      <div className="h-screen flex flex-col">
        {/* Map Header */}
        <div className="border-b bg-card z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold">Business Map</h1>
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search businesses or locations..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchInput.startsWith('@')) {
                      handleLocationSearch(searchInput.slice(1))
                    } else {
                      handleSearch()
                    }
                  }
                }}
                className="pl-10 pr-4"
              />
            </div>
            <Button 
              onClick={handleSearch}
              size="sm"
            >
              Search
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {businesses.length} businesses in view
            </span>
            <MapControls 
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 flex relative">
        {/* Sidebar */}
        {sidebarOpen && (
          <MapSidebar
            businesses={businesses}
            selectedBusiness={selectedBusiness}
            onBusinessSelect={setSelectedBusiness}
            onClose={() => setSelectedBusiness(null)}
            loading={loading}
          />
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            businesses={businesses}
            selectedBusiness={selectedBusiness}
            onBusinessSelect={setSelectedBusiness}
            onBoundsChange={setMapBounds}
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
          />
        </div>
      </div>
      </div>
    </ProtectedLayout>
  )
}