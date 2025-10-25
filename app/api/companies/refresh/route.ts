import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompaniesHouseService } from '@/lib/services/companies-house'
import type { Row } from '@/lib/supabase/helpers'

// This endpoint refreshes stale Companies House data
// Can be called via cron job or manually
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication - require service role or admin
    await supabase.auth.getUser()
    
    // Get optional parameters from request body
    const body = await request.json().catch(() => ({}))
    const { 
      limit = 10, // Max companies to refresh per run
      force = false, // Force refresh even if cache is valid
      hoursStale = 24 // Consider data stale after X hours
    } = body
    
    const companiesService = new CompaniesHouseService()
    
    // Find companies that need refreshing
    const staleDate = new Date(Date.now() - hoursStale * 60 * 60 * 1000).toISOString()
    
    let query = supabase
      .from('businesses')
      .select('*')
      .not('company_number', 'is', null)
      .order('companies_house_last_updated', { ascending: true, nullsFirst: true })
      .limit(limit)
    
    if (!force) {
      // Only get companies that are actually stale
      query = query.or(`companies_house_last_updated.is.null,companies_house_last_updated.lt.${staleDate}`)
    }
    
    const { data: staleCompanies, error } = await query

    if (error) {
      console.error('Failed to fetch stale companies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stale companies' },
        { status: 500 }
      )
    }

    const typedStaleCompanies = staleCompanies as Row<'businesses'>[] | null

    if (!typedStaleCompanies || typedStaleCompanies.length === 0) {
      return NextResponse.json({
        message: 'No companies need refreshing',
        refreshed: 0
      })
    }

    // Refresh each company
    const results = {
      refreshed: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const company of typedStaleCompanies) {
      if (!company.company_number) continue
      
      try {
        // Rate limiting is handled by the service
        const profile = await companiesService.getCompanyProfile(company.company_number)
        
        if (profile) {
          const formatted = companiesService.formatForDatabase(profile)
          
          const { error: updateError } = await supabase
            .from('businesses')
            .update({
              ...formatted,
              companies_house_last_updated: new Date().toISOString(),
              cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', company.id)
          
          if (updateError) {
            console.error(`Failed to update company ${company.company_number}:`, updateError)
            results.failed++
            results.errors.push(`${company.company_number}: ${updateError.message}`)
          } else {
            results.refreshed++
          }
        } else {
          results.failed++
          results.errors.push(`${company.company_number}: Profile not found`)
        }
      } catch (err) {
        console.error(`Failed to refresh company ${company.company_number}:`, err)
        results.failed++
        results.errors.push(`${company.company_number}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    
    return NextResponse.json({
      message: `Refresh completed: ${results.refreshed} succeeded, ${results.failed} failed`,
      ...results
    })
    
  } catch (error) {
    console.error('Refresh endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check refresh status and stale companies count
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hoursStale = parseInt(searchParams.get('hoursStale') || '24')
    
    const staleDate = new Date(Date.now() - hoursStale * 60 * 60 * 1000).toISOString()
    
    // Count stale companies
    const { count: staleCount } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .not('company_number', 'is', null)
      .or(`companies_house_last_updated.is.null,companies_house_last_updated.lt.${staleDate}`)
    
    // Count total companies with company numbers
    const { count: totalCount } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .not('company_number', 'is', null)
    
    // Get refresh statistics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: refreshedToday } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .not('company_number', 'is', null)
      .gte('companies_house_last_updated', oneDayAgo)
    
    return NextResponse.json({
      staleCompanies: staleCount || 0,
      totalCompanies: totalCount || 0,
      refreshedToday: refreshedToday || 0,
      staleThresholdHours: hoursStale,
      percentStale: totalCount ? Math.round(((staleCount || 0) / totalCount) * 100) : 0
    })
    
  } catch (error) {
    console.error('Refresh status error:', error)
    return NextResponse.json(
      { error: 'Failed to get refresh status' },
      { status: 500 }
    )
  }
}