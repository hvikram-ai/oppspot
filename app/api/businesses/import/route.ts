import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGooglePlacesClient } from '@/lib/google-places/client'
import { Database } from '@/lib/supabase/database.types'
import type { Row } from '@/lib/supabase/helpers'

type BusinessInsert = Database['public']['Tables']['businesses']['Insert']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, location, radius = 5000, type, limit = 20 } = body

    if (!query && !location) {
      return NextResponse.json(
        { error: 'Either query or location is required' },
        { status: 400 }
      )
    }

    const placesClient = getGooglePlacesClient()

    // Search for places
    const searchOptions = {
      query,
      location: location ? { lat: location.lat, lng: location.lng } : undefined,
      radius,
      type
    }

    const searchResults = await placesClient.searchPlaces(searchOptions)
    
    if (!searchResults.results || searchResults.results.length === 0) {
      return NextResponse.json({
        message: 'No businesses found',
        imported: 0
      })
    }

    // Limit results
    const placesToImport = searchResults.results.slice(0, limit)
    
    // Get detailed information for each place
    const businessesToInsert: BusinessInsert[] = []
    const errors: string[] = []

    for (const place of placesToImport) {
      try {
        // Check if business already exists
        const { data: existing } = await supabase
          .from('businesses')
          .select('id')
          .eq('google_place_id', place.place_id)
          .single() as { data: Pick<Row<'businesses'>, 'id'> | null; error: any }

        if (existing) {
          console.log(`Business already exists: ${place.name}`)
          continue
        }

        // Get detailed place information
        const details = await placesClient.getPlaceDetails(place.place_id)
        
        if (!details) {
          errors.push(`Failed to get details for ${place.name}`)
          continue
        }

        // Convert to our business format
        const business = placesClient.convertToBusinessEntity(details)
        businessesToInsert.push(business)

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`Error processing place ${place.name}:`, error)
        errors.push(`Error processing ${place.name}`)
      }
    }

    // Insert businesses into database
    let insertedCount = 0
    if (businessesToInsert.length > 0) {
      const { data, error } = await supabase
        .from('businesses')
        // @ts-ignore - Supabase type inference issue
        .insert(businessesToInsert as Database['public']['Tables']['businesses']['Insert'][])
        .select()

      if (error) {
        console.error('Database insert error:', error)
        return NextResponse.json(
          { error: 'Failed to insert businesses', details: error.message },
          { status: 500 }
        )
      }

      insertedCount = data?.length || 0
    }

    // @ts-ignore - Supabase type inference issue
    // Log the import event
    await supabase.from('events').insert({
      user_id: user.id,
      event_type: 'businesses_imported',
      event_data: {
        query,
        location,
        imported_count: insertedCount,
        errors_count: errors.length
      }
    } as Database['public']['Tables']['events']['Insert'])

    return NextResponse.json({
      message: 'Import completed',
      imported: insertedCount,
      skipped: placesToImport.length - businessesToInsert.length,
      errors: errors.length > 0 ? errors : undefined,
      next_page_token: searchResults.next_page_token
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check import status or get suggestions
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get import statistics
    const { count: totalBusinesses } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })

    const { count: verifiedBusinesses } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true)

    // Get recent imports by this user
    const { data: recentImports } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_type', 'businesses_imported')
      .order('created_at', { ascending: false })
      .limit(5)

    // Suggested search queries for UK & Ireland
    const suggestions = [
      { query: 'tech startups London', location: { lat: 51.5074, lng: -0.1278 } },
      { query: 'restaurants Dublin', location: { lat: 53.3498, lng: -6.2603 } },
      { query: 'professional services Manchester', location: { lat: 53.4808, lng: -2.2426 } },
      { query: 'healthcare Edinburgh', location: { lat: 55.9533, lng: -3.1883 } },
      { query: 'retail Birmingham', location: { lat: 52.4862, lng: -1.8904 } },
      { query: 'finance Cardiff', location: { lat: 51.4816, lng: -3.1791 } },
      { query: 'education Oxford', location: { lat: 51.7520, lng: -1.2577 } },
      { query: 'manufacturing Belfast', location: { lat: 54.5973, lng: -5.9301 } }
    ]

    return NextResponse.json({
      statistics: {
        total_businesses: totalBusinesses || 0,
        verified_businesses: verifiedBusinesses || 0
      },
      recent_imports: recentImports || [],
      suggestions
    })

  } catch (error) {
    console.error('Error fetching import data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch import data' },
      { status: 500 }
    )
  }
}