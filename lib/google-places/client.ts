import { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']
type BusinessInsert = Database['public']['Tables']['businesses']['Insert']

interface PlaceDetails {
  place_id: string
  name: string
  formatted_address?: string
  formatted_phone_number?: string
  website?: string
  rating?: number
  user_ratings_total?: number
  types?: string[]
  geometry?: {
    location: {
      lat: number
      lng: number
    }
  }
  opening_hours?: {
    open_now?: boolean
    periods?: Array<{
      open: { day: number; time: string }
      close?: { day: number; time: string }
    }>
    weekday_text?: string[]
  }
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  reviews?: Array<{
    author_name: string
    rating: number
    text: string
    time: number
  }>
  business_status?: string
  price_level?: number
  vicinity?: string
}

interface PlaceSearchResult {
  place_id: string
  name: string
  vicinity?: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types?: string[]
  rating?: number
  user_ratings_total?: number
  business_status?: string
  opening_hours?: {
    open_now?: boolean
  }
}

interface SearchOptions {
  query?: string
  location?: { lat: number; lng: number }
  radius?: number // in meters
  type?: string
  minprice?: number
  maxprice?: number
  opennow?: boolean
  pagetoken?: string
}

export class GooglePlacesClient {
  private apiKey: string
  private baseUrl = 'https://maps.googleapis.com/maps/api/place'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Search for places using text query
   */
  async searchPlaces(options: SearchOptions): Promise<{
    results: PlaceSearchResult[]
    next_page_token?: string
  }> {
    const params = new URLSearchParams({
      key: this.apiKey,
    })

    if (options.query) {
      params.append('query', options.query)
    }

    if (options.location) {
      params.append('location', `${options.location.lat},${options.location.lng}`)
    }

    if (options.radius) {
      params.append('radius', options.radius.toString())
    }

    if (options.type) {
      params.append('type', options.type)
    }

    if (options.opennow !== undefined) {
      params.append('opennow', options.opennow.toString())
    }

    if (options.pagetoken) {
      params.append('pagetoken', options.pagetoken)
    }

    const endpoint = options.query ? 'textsearch' : 'nearbysearch'
    const response = await fetch(`${this.baseUrl}/${endpoint}/json?${params}`)
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      results: data.results || [],
      next_page_token: data.next_page_token
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    const params = new URLSearchParams({
      key: this.apiKey,
      place_id: placeId,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'formatted_phone_number',
        'website',
        'rating',
        'user_ratings_total',
        'types',
        'geometry',
        'opening_hours',
        'photos',
        'reviews',
        'business_status',
        'price_level',
        'vicinity'
      ].join(',')
    })

    const response = await fetch(`${this.baseUrl}/details/json?${params}`)
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.status !== 'OK') {
      console.error('Place details error:', data.status)
      return null
    }

    return data.result
  }

  /**
   * Search for places near a location
   */
  async searchNearby(
    lat: number,
    lng: number,
    radius: number = 5000,
    type?: string
  ): Promise<PlaceSearchResult[]> {
    const results = await this.searchPlaces({
      location: { lat, lng },
      radius,
      type
    })

    return results.results
  }

  /**
   * Convert Google Place to our Business format
   */
  convertToBusinessEntity(place: PlaceDetails): BusinessInsert {
    const categories = this.mapGoogleTypesToCategories(place.types || [])
    
    return {
      google_place_id: place.place_id,
      name: place.name,
      description: null, // Will be enriched with AI later
      address: place.formatted_address ? {
        formatted: place.formatted_address,
        vicinity: place.vicinity
      } : null,
      latitude: place.geometry?.location.lat || null,
      longitude: place.geometry?.location.lng || null,
      phone_numbers: place.formatted_phone_number ? [place.formatted_phone_number] : [],
      emails: [], // Google Places doesn't provide emails
      website: place.website || null,
      categories,
      rating: place.rating || null,
      verified: place.business_status === 'OPERATIONAL',
      metadata: {
        google_data: {
          user_ratings_total: place.user_ratings_total,
          price_level: place.price_level,
          opening_hours: place.opening_hours,
          photos: place.photos?.slice(0, 5), // Limit to 5 photos
          reviews: place.reviews?.slice(0, 3), // Limit to 3 reviews
          business_status: place.business_status,
          types: place.types
        }
      }
    }
  }

  /**
   * Map Google Place types to our categories
   */
  private mapGoogleTypesToCategories(types: string[]): string[] {
    const categoryMap: Record<string, string> = {
      // Technology
      'electronics_store': 'Technology',
      'computer_store': 'Technology',
      'software_company': 'Technology',
      
      // Food & Beverage
      'restaurant': 'Food & Beverage',
      'cafe': 'Food & Beverage',
      'bar': 'Food & Beverage',
      'bakery': 'Food & Beverage',
      'food': 'Food & Beverage',
      
      // Retail
      'store': 'Retail',
      'shopping_mall': 'Retail',
      'clothing_store': 'Retail',
      'shoe_store': 'Retail',
      'jewelry_store': 'Retail',
      
      // Healthcare
      'hospital': 'Healthcare',
      'doctor': 'Healthcare',
      'dentist': 'Healthcare',
      'pharmacy': 'Healthcare',
      'health': 'Healthcare',
      
      // Professional Services
      'accounting': 'Professional Services',
      'lawyer': 'Professional Services',
      'insurance_agency': 'Professional Services',
      'real_estate_agency': 'Real Estate',
      'finance': 'Finance',
      
      // Education
      'school': 'Education',
      'university': 'Education',
      'library': 'Education',
      
      // Transportation
      'taxi_stand': 'Transportation',
      'car_rental': 'Transportation',
      'parking': 'Transportation',
      
      // Construction
      'general_contractor': 'Construction',
      'roofing_contractor': 'Construction',
      'plumber': 'Construction',
      'electrician': 'Construction',
    }

    const categories = new Set<string>()
    
    for (const type of types) {
      const category = categoryMap[type]
      if (category) {
        categories.add(category)
      }
    }

    // If no specific categories found, add a generic one
    if (categories.size === 0 && types.length > 0) {
      categories.add('Other')
    }

    return Array.from(categories)
  }

  /**
   * Get photo URL for a place photo
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `${this.baseUrl}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const params = new URLSearchParams({
      address,
      key: this.apiKey,
      region: 'uk' // Bias results to UK/Ireland
    })

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    )

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.[0]) {
      return null
    }

    const location = data.results[0].geometry.location
    return {
      lat: location.lat,
      lng: location.lng
    }
  }
}

// Create singleton instance
let placesClient: GooglePlacesClient | null = null

export function getGooglePlacesClient(): GooglePlacesClient {
  if (!placesClient) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      throw new Error('Google Maps API key not configured')
    }
    placesClient = new GooglePlacesClient(apiKey)
  }
  return placesClient
}