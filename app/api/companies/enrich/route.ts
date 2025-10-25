import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DataEnrichmentService } from '@/lib/services/data-enrichment'
import type { Row } from '@/lib/supabase/helpers'

// Enrich a single business or batch of businesses with data from multiple sources
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { 
      businessId,
      businessIds,
      sources,
      autoApply = true 
    } = body
    
    if (!businessId && !businessIds) {
      return NextResponse.json(
        { error: 'businessId or businessIds required' },
        { status: 400 }
      )
    }
    
    const enrichmentService = new DataEnrichmentService()
    
    // Single business enrichment
    if (businessId) {
      // Fetch the business
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()
      
      if (error || !business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        )
      }
      
      // Enrich the business
      const results = await enrichmentService.enrichBusiness(business, sources)
      
      // Apply enrichments if autoApply is true
      if (autoApply) {
        const merged = enrichmentService.mergeEnrichmentResults(results)
        if (Object.keys(merged).length > 0) {
          const { error: updateError } = await supabase
            .from('businesses')
            .update(merged)
            .eq('id', businessId)
          
          if (updateError) {
            console.error('Failed to apply enrichments:', updateError)
          }
        }
      }
      
      // Get updated business and stats
      const { data: updatedBusiness, error: updatedBusinessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()
      
      const stats = updatedBusiness 
        ? enrichmentService.getEnrichmentStats(updatedBusiness)
        : null
      
      return NextResponse.json({
        businessId,
        results,
        applied: autoApply,
        stats
      })
    }
    
    // Batch enrichment
    if (businessIds && Array.isArray(businessIds)) {
      const results = await enrichmentService.batchEnrich(businessIds, sources)
      
      // Get stats for all businesses
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('*')
        .in('id', businessIds)

      const typedBusinesses = businesses as Row<'businesses'>[] | null

      const statsMap: Record<string, unknown> = {}
      if (typedBusinesses) {
        for (const business of typedBusinesses) {
          statsMap[business.id] = enrichmentService.getEnrichmentStats(business)
        }
      }
      
      return NextResponse.json({
        businessIds,
        results: Object.fromEntries(results),
        applied: autoApply,
        stats: statsMap
      })
    }
    
  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json(
      { error: 'Enrichment failed' },
      { status: 500 }
    )
  }
}

// Get enrichment status for a business
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId required' },
        { status: 400 }
      )
    }
    
    // Fetch the business
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    const typedBusiness = business as Row<'businesses'> | null

    if (error || !typedBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const enrichmentService = new DataEnrichmentService()
    const stats = enrichmentService.getEnrichmentStats(typedBusiness)
    
    // Determine which sources can still be enriched
    const availableSources = []
    if (!typedBusiness.company_number || !typedBusiness.companies_house_last_updated) {
      availableSources.push('companies_house')
    }
    if (!typedBusiness.google_place_id) {
      availableSources.push('google_places')
    }
    if (!typedBusiness.social_links || Object.keys(typedBusiness.social_links as Record<string, unknown>).length === 0) {
      availableSources.push('social_media')
    }
    if (typedBusiness.website) {
      availableSources.push('web_scraping')
    }

    return NextResponse.json({
      businessId,
      stats,
      availableSources,
      enrichmentHistory: {
        companies_house: typedBusiness.companies_house_last_updated,
        last_enriched: stats.lastEnriched
      }
    })
    
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to get enrichment status' },
      { status: 500 }
    )
  }
}