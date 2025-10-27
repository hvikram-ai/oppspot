'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { Loader2, MapPin, Search, Building2, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportSuggestion {
  query: string
  location: { lat: number; lng: number }
}

interface ImportStatistics {
  total_businesses: number
  verified_businesses: number
}

export default function ImportBusinessesPage() {
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<ImportStatistics | null>(null)
  const [suggestions, setSuggestions] = useState<ImportSuggestion[]>([])
  interface RecentImport {
    id: string
    created_at: string
    import_type: string
    total_imported: number
    source: string
    metadata?: Record<string, unknown>
    event_data?: {
      errors_count?: number
      query?: string
      imported_count?: number
    }
  }
  
  const [recentImports, setRecentImports] = useState<RecentImport[]>([])
  
  // Form state
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [radius, setRadius] = useState(5000)
  const [businessType, setBusinessType] = useState('')
  const [limit, setLimit] = useState(20)
  
  const router = useRouter()
  const supabase = createClient()

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is admin (you might want to implement proper role checking)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (profile && profile.role !== 'admin' && profile.role !== 'owner') {
      toast.error('Admin access required')
      router.push('/dashboard')
    }
  }, [router, supabase])

  const fetchImportData = useCallback(async () => {
    try {
      const response = await fetch('/api/businesses/import')
      if (response.ok) {
        const data = await response.json()
        setStatistics(data.statistics)
        setSuggestions(data.suggestions)
        setRecentImports(data.recent_imports)
      }
    } catch (error) {
      console.error('Error fetching import data:', error)
    }
  }, [])

  useEffect(() => {
    checkAuth()
    fetchImportData()
  }, [checkAuth, fetchImportData])

  const handleImport = async () => {
    if (!query && !location) {
      toast.error('Please enter a search query or location')
      return
    }

    setLoading(true)
    
    try {
      // Parse location if provided
      let locationData = null
      if (location) {
        const coords = await geocodeAddress(location)
        if (coords) {
          locationData = coords
        }
      }

      const response = await fetch('/api/businesses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location: locationData,
          radius,
          type: businessType || undefined,
          limit
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Successfully imported ${data.imported} businesses`)
        if (data.skipped > 0) {
          toast.info(`Skipped ${data.skipped} existing businesses`)
        }
        if (data.errors?.length > 0) {
          toast.warning(`${data.errors.length} businesses had errors`)
        }
        
        // Refresh statistics
        fetchImportData()
        
        // Clear form
        setQuery('')
        setLocation('')
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import businesses')
    } finally {
      setLoading(false)
    }
  }

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()
      if (data.results?.[0]) {
        return {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
    return null
  }

  const handleSuggestionClick = (suggestion: ImportSuggestion) => {
    setQuery(suggestion.query)
    // You could also set the location from the suggestion
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import Business Data</h1>
        <p className="text-muted-foreground">
          Import real business data from Google Places to populate the OppSpot database
        </p>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_businesses.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.verified_businesses.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import Form */}
        <Card>
          <CardHeader>
            <CardTitle>Import New Businesses</CardTitle>
            <CardDescription>
              Search and import businesses from Google Places
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                placeholder="e.g., tech startups, restaurants, healthcare"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (City or Address)</Label>
              <Input
                id="location"
                placeholder="e.g., London, Dublin, Manchester"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Business Type (Optional)</Label>
              <Select value={businessType} onValueChange={setBusinessType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="store">Store</SelectItem>
                  <SelectItem value="doctor">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="real_estate_agency">Real Estate</SelectItem>
                  <SelectItem value="lawyer">Legal Services</SelectItem>
                  <SelectItem value="accounting">Accounting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search Radius: {(radius / 1000).toFixed(1)} km</Label>
              <Slider
                value={[radius]}
                onValueChange={([value]) => setRadius(value)}
                min={1000}
                max={50000}
                step={1000}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Import Limit: {limit} businesses</Label>
              <Slider
                value={[limit]}
                onValueChange={([value]) => setLimit(value)}
                min={5}
                max={50}
                step={5}
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleImport}
              disabled={loading || (!query && !location)}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Import Businesses
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Import Suggestions</CardTitle>
            <CardDescription>
              Click on a suggestion to quickly populate the search form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                  disabled={loading}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{suggestion.query}</span>
                    </div>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Imports */}
      {recentImports.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentImports.map((import_, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {(import_.event_data?.errors_count ?? 0) > 0 ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {import_.event_data?.query || 'Location search'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Imported {import_.event_data?.imported_count || 0} businesses
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(import_.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}