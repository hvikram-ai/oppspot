/**
 * Location Autocomplete API
 * GET /api/locations/autocomplete?q=London
 *
 * Provides location autocomplete for UK & Ireland
 * Uses Google Places Autocomplete or fallback to local data
 */

import { NextRequest, NextResponse } from 'next/server'

interface LocationSuggestion {
  id: string
  name: string
  type: 'city' | 'region' | 'country' | 'postcode'
  country: string
  region?: string
  formatted: string
}

// Mock location data for UK & Ireland when API is unavailable
const MOCK_LOCATIONS: LocationSuggestion[] = [
  // Major UK Cities
  { id: 'london', name: 'London', type: 'city', country: 'United Kingdom', region: 'Greater London', formatted: 'London, Greater London, United Kingdom' },
  { id: 'manchester', name: 'Manchester', type: 'city', country: 'United Kingdom', region: 'Greater Manchester', formatted: 'Manchester, Greater Manchester, United Kingdom' },
  { id: 'birmingham', name: 'Birmingham', type: 'city', country: 'United Kingdom', region: 'West Midlands', formatted: 'Birmingham, West Midlands, United Kingdom' },
  { id: 'glasgow', name: 'Glasgow', type: 'city', country: 'United Kingdom', region: 'Scotland', formatted: 'Glasgow, Scotland, United Kingdom' },
  { id: 'liverpool', name: 'Liverpool', type: 'city', country: 'United Kingdom', region: 'Merseyside', formatted: 'Liverpool, Merseyside, United Kingdom' },
  { id: 'leeds', name: 'Leeds', type: 'city', country: 'United Kingdom', region: 'West Yorkshire', formatted: 'Leeds, West Yorkshire, United Kingdom' },
  { id: 'edinburgh', name: 'Edinburgh', type: 'city', country: 'United Kingdom', region: 'Scotland', formatted: 'Edinburgh, Scotland, United Kingdom' },
  { id: 'bristol', name: 'Bristol', type: 'city', country: 'United Kingdom', region: 'South West England', formatted: 'Bristol, South West England, United Kingdom' },
  { id: 'cardiff', name: 'Cardiff', type: 'city', country: 'United Kingdom', region: 'Wales', formatted: 'Cardiff, Wales, United Kingdom' },
  { id: 'belfast', name: 'Belfast', type: 'city', country: 'United Kingdom', region: 'Northern Ireland', formatted: 'Belfast, Northern Ireland, United Kingdom' },
  { id: 'newcastle', name: 'Newcastle upon Tyne', type: 'city', country: 'United Kingdom', region: 'Tyne and Wear', formatted: 'Newcastle upon Tyne, Tyne and Wear, United Kingdom' },
  { id: 'sheffield', name: 'Sheffield', type: 'city', country: 'United Kingdom', region: 'South Yorkshire', formatted: 'Sheffield, South Yorkshire, United Kingdom' },
  { id: 'nottingham', name: 'Nottingham', type: 'city', country: 'United Kingdom', region: 'Nottinghamshire', formatted: 'Nottingham, Nottinghamshire, United Kingdom' },
  { id: 'southampton', name: 'Southampton', type: 'city', country: 'United Kingdom', region: 'Hampshire', formatted: 'Southampton, Hampshire, United Kingdom' },
  { id: 'cambridge', name: 'Cambridge', type: 'city', country: 'United Kingdom', region: 'Cambridgeshire', formatted: 'Cambridge, Cambridgeshire, United Kingdom' },
  { id: 'oxford', name: 'Oxford', type: 'city', country: 'United Kingdom', region: 'Oxfordshire', formatted: 'Oxford, Oxfordshire, United Kingdom' },

  // Ireland Cities
  { id: 'dublin', name: 'Dublin', type: 'city', country: 'Ireland', region: 'Leinster', formatted: 'Dublin, Leinster, Ireland' },
  { id: 'cork', name: 'Cork', type: 'city', country: 'Ireland', region: 'Munster', formatted: 'Cork, Munster, Ireland' },
  { id: 'galway', name: 'Galway', type: 'city', country: 'Ireland', region: 'Connacht', formatted: 'Galway, Connacht, Ireland' },
  { id: 'limerick', name: 'Limerick', type: 'city', country: 'Ireland', region: 'Munster', formatted: 'Limerick, Munster, Ireland' },

  // UK Regions
  { id: 'england', name: 'England', type: 'region', country: 'United Kingdom', formatted: 'England, United Kingdom' },
  { id: 'scotland', name: 'Scotland', type: 'region', country: 'United Kingdom', formatted: 'Scotland, United Kingdom' },
  { id: 'wales', name: 'Wales', type: 'region', country: 'United Kingdom', formatted: 'Wales, United Kingdom' },
  { id: 'northern-ireland', name: 'Northern Ireland', type: 'region', country: 'United Kingdom', formatted: 'Northern Ireland, United Kingdom' },
  { id: 'greater-london', name: 'Greater London', type: 'region', country: 'United Kingdom', formatted: 'Greater London, United Kingdom' },
  { id: 'south-east', name: 'South East England', type: 'region', country: 'United Kingdom', formatted: 'South East England, United Kingdom' },
  { id: 'north-west', name: 'North West England', type: 'region', country: 'United Kingdom', formatted: 'North West England, United Kingdom' },

  // Countries
  { id: 'uk', name: 'United Kingdom', type: 'country', country: 'United Kingdom', formatted: 'United Kingdom' },
  { id: 'ireland', name: 'Ireland', type: 'country', country: 'Ireland', formatted: 'Ireland' },
]

function searchMockLocations(query: string): LocationSuggestion[] {
  const lowerQuery = query.toLowerCase()
  return MOCK_LOCATIONS.filter(location =>
    location.name.toLowerCase().includes(lowerQuery) ||
    location.formatted.toLowerCase().includes(lowerQuery) ||
    location.region?.toLowerCase().includes(lowerQuery)
  ).slice(0, 10)
}

async function searchGooglePlaces(query: string): Promise<LocationSuggestion[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('Google Maps API key not configured, using mock data')
    return searchMockLocations(query)
  }

  try {
    const params = new URLSearchParams({
      input: query,
      key: apiKey,
      types: '(cities)',
      components: 'country:gb|country:ie', // Restrict to UK and Ireland
    })

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
    )

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.predictions) {
      console.warn('Google Places API returned no results, using mock data')
      return searchMockLocations(query)
    }

    // Map Google Places predictions to our format
    const suggestions: LocationSuggestion[] = data.predictions.map((prediction: any) => {
      const terms = prediction.terms || []
      const name = terms[0]?.value || prediction.description
      const region = terms[1]?.value
      const country = terms[terms.length - 1]?.value

      // Determine type based on prediction types
      let type: 'city' | 'region' | 'country' | 'postcode' = 'city'
      if (prediction.types?.includes('postal_code')) {
        type = 'postcode'
      } else if (prediction.types?.includes('administrative_area_level_1')) {
        type = 'region'
      } else if (prediction.types?.includes('country')) {
        type = 'country'
      }

      return {
        id: prediction.place_id,
        name,
        type,
        country: country || 'United Kingdom',
        region,
        formatted: prediction.description,
      }
    })

    return suggestions
  } catch (error) {
    console.error('Google Places autocomplete error:', error)
    console.warn('Falling back to mock location data')
    return searchMockLocations(query)
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || searchParams.get('query')
    const useMock = searchParams.get('mock') === 'true'

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    // Use mock data if requested or for demo
    if (useMock) {
      const results = searchMockLocations(query)
      return NextResponse.json({
        success: true,
        results,
        source: 'mock',
        message: `Found ${results.length} locations`
      })
    }

    // Try Google Places first, fallback to mock
    const results = await searchGooglePlaces(query)

    return NextResponse.json({
      success: true,
      results,
      source: results === searchMockLocations(query) ? 'mock' : 'google_places',
      message: `Found ${results.length} locations`
    })
  } catch (error) {
    console.error('Location autocomplete error:', error)

    // Return mock data as fallback on error
    const query = request.nextUrl.searchParams.get('q') || request.nextUrl.searchParams.get('query') || ''
    const results = searchMockLocations(query)

    return NextResponse.json({
      success: true,
      results,
      source: 'mock',
      warning: 'Using fallback location data',
      message: `Found ${results.length} locations`
    })
  }
}
