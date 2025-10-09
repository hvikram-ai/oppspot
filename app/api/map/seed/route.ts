import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sampleBusinesses } from './sample-data'
import type { Row } from '@/lib/supabase/helpers'

export async function POST() {
  try {
    const supabase = await createClient()

    // Check if user is authenticated (optional - you might want to restrict this)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Clear existing businesses (optional - comment out if you want to keep existing data)
    const { error: deleteError } = await supabase
      .from('businesses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all except impossible ID
    
    if (deleteError && deleteError.code !== 'PGRST116') { // Ignore "no rows" error
      console.error('Error clearing businesses:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing data' },
        { status: 500 }
      )
    }
    
    // Insert sample businesses
    const businessesToInsert = sampleBusinesses.map(business => ({
      ...business,
      slug: business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      social_links: {},
      metadata: {
        source: 'seed_api',
        created_at: new Date().toISOString(),
        created_by: user?.id || 'system'
      }
    }))
    
    const { data, error } = await supabase
      .from('businesses')
      // @ts-ignore - Supabase type inference issue
      .insert(businessesToInsert)
      .select()
    
    if (error) {
      console.error('Error inserting businesses:', error)
      return NextResponse.json(
        { error: 'Failed to insert businesses', details: error.message },
        { status: 500 }
      )
    }
    
    // Log statistics
    const categories = new Set<string>()
    const countries = new Set<string>()
    
    sampleBusinesses.forEach(b => {
      b.categories?.forEach(c => categories.add(c))
      if (b.address?.country) {
        countries.add(b.address.country)
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Sample businesses populated successfully',
      stats: {
        total: data?.length || 0,
        categories: Array.from(categories),
        countries: Array.from(countries)
      },
      businesses: data
    })
    
  } catch (error) {
    console.error('Seed API error:', error)
    return NextResponse.json(
      { error: 'Failed to seed businesses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { count, error } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('Error checking businesses:', error)
      return NextResponse.json(
        { error: 'Failed to check businesses' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      hasData: (count || 0) > 0,
      count: count || 0,
      message: count && count > 0 
        ? `Database has ${count} businesses` 
        : 'Database is empty. Use POST to seed sample data.'
    })
    
  } catch (error) {
    console.error('Check API error:', error)
    return NextResponse.json(
      { error: 'Failed to check database' },
      { status: 500 }
    )
  }
}