import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompaniesHouseService } from '@/lib/services/companies-house'
import { Database } from '@/types/database'

type Business = Database['public']['Tables']['businesses']['Row']

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('refresh') === 'true'
    const includeOfficers = searchParams.get('officers') === 'true'
    const includeFilings = searchParams.get('filings') === 'true'

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID or number is required' },
        { status: 400 }
      )
    }

    const companiesHouse = getCompaniesHouseService()
    let business: Business | null = null
    let isCompanyNumber = false

    // Check if ID is a UUID or company number
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    if (uuidRegex.test(id)) {
      // It's a UUID, fetch by ID
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .single()
      
      business = data
    } else {
      // It might be a company number
      isCompanyNumber = true
      const sanitizedNumber = id.replace(/\s/g, '').toUpperCase()
      
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('company_number', sanitizedNumber)
        .single()
      
      business = data
    }

    // If business not found in database, try to fetch from Companies House
    if (!business && isCompanyNumber) {
      try {
        const companyProfile = await companiesHouse.getCompanyProfile(id)
        const newBusiness = companiesHouse.formatForDatabase(companyProfile)
        
        // Create new business record
        const { data: created, error } = await supabase
          .from('businesses')
          .insert({
            ...newBusiness,
            slug: generateSlug(companyProfile.company_name),
            verified_at: new Date().toISOString()
          })
          .select()
          .single()

        if (!error && created) {
          business = created
          
          // Log API call
          await supabase.from('api_audit_log').insert({
            api_name: 'companies_house',
            endpoint: `/company/${id}`,
            request_params: { company_number: id },
            response_status: 200,
            user_id: user.id,
            business_id: created.id
          })
        }
      } catch (apiError) {
        console.error('Failed to fetch from Companies House:', apiError)
        
        // Log failed API call
        await supabase.from('api_audit_log').insert({
          api_name: 'companies_house',
          endpoint: `/company/${id}`,
          request_params: { company_number: id },
          response_status: 404,
          error_message: apiError instanceof Error ? apiError.message : 'Unknown error',
          user_id: user.id
        })

        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Check if we need to refresh data from Companies House
    const needsRefresh = forceRefresh || 
      !business.companies_house_last_updated || 
      !companiesHouse.isCacheValid(business.companies_house_last_updated)

    if (needsRefresh && business.company_number) {
      try {
        // Fetch fresh data from Companies House
        const companyProfile = await companiesHouse.getCompanyProfile(business.company_number)
        const updates = companiesHouse.formatForDatabase(companyProfile)
        
        // Update database
        const { data: updated, error } = await supabase
          .from('businesses')
          .update(updates)
          .eq('id', business.id)
          .select()
          .single()

        if (!error && updated) {
          business = updated
        }

        // Log API call
        await supabase.from('api_audit_log').insert({
          api_name: 'companies_house',
          endpoint: `/company/${business.company_number}`,
          request_params: { company_number: business.company_number, refresh: true },
          response_status: 200,
          user_id: user.id,
          business_id: business.id
        })
      } catch (refreshError) {
        console.warn('Failed to refresh Companies House data:', refreshError)
        // Continue with stale data if refresh fails
      }
    }

    // Fetch additional data if requested
    let officers = null
    let filings = null

    if (business.company_number && (includeOfficers || includeFilings)) {
      const additionalData = []

      if (includeOfficers) {
        additionalData.push(
          companiesHouse.getCompanyOfficers(business.company_number)
            .then(data => { officers = data.items })
            .catch(err => console.warn('Failed to fetch officers:', err))
        )
      }

      if (includeFilings) {
        additionalData.push(
          companiesHouse.getFilingHistory(business.company_number)
            .then(data => { filings = data.items })
            .catch(err => console.warn('Failed to fetch filings:', err))
        )
      }

      await Promise.all(additionalData)

      // Update database with additional data
      if (officers || filings) {
        const additionalUpdates: any = {}
        if (officers) additionalUpdates.officers = officers
        if (filings) additionalUpdates.filing_history = filings.slice(0, 10)

        await supabase
          .from('businesses')
          .update(additionalUpdates)
          .eq('id', business.id)
      }
    }

    // Calculate data completeness
    const completeness = calculateCompleteness(business)

    // Prepare response
    const response = {
      success: true,
      data: {
        ...business,
        officers: officers || business.officers,
        filing_history: filings || business.filing_history,
      },
      meta: {
        cache_age: business.companies_house_last_updated 
          ? getAgeInHours(business.companies_house_last_updated) 
          : null,
        cache_valid: business.companies_house_last_updated 
          ? companiesHouse.isCacheValid(business.companies_house_last_updated)
          : false,
        data_completeness: completeness,
        data_sources: Object.keys(business.data_sources || {}),
        last_refreshed: business.companies_house_last_updated,
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Get company details error:', error)
    return NextResponse.json(
      { error: 'Failed to get company details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Force refresh endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { enrichments = ['profile', 'officers', 'filings'] } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Fetch business
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single()

    if (!business || !business.company_number) {
      return NextResponse.json(
        { error: 'Company not found or no company number available' },
        { status: 404 }
      )
    }

    const companiesHouse = getCompaniesHouseService()
    const updates: any = {}
    const results: any = {}

    // Fetch requested data from Companies House
    for (const enrichment of enrichments) {
      try {
        switch (enrichment) {
          case 'profile':
            const profile = await companiesHouse.getCompanyProfile(business.company_number)
            Object.assign(updates, companiesHouse.formatForDatabase(profile))
            results.profile = 'Updated'
            break

          case 'officers':
            const officers = await companiesHouse.getCompanyOfficers(business.company_number)
            updates.officers = officers.items
            results.officers = `${officers.items.length} officers fetched`
            break

          case 'filings':
            const filings = await companiesHouse.getFilingHistory(business.company_number)
            updates.filing_history = filings.items.slice(0, 20)
            results.filings = `${filings.items.length} filings fetched`
            break
        }
      } catch (error) {
        console.error(`Failed to fetch ${enrichment}:`, error)
        results[enrichment] = 'Failed'
      }
    }

    // Update database
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', business.id)

      if (error) {
        throw error
      }
    }

    // Log API calls
    await supabase.from('api_audit_log').insert({
      api_name: 'companies_house',
      endpoint: '/company/refresh',
      request_params: { 
        company_number: business.company_number, 
        enrichments 
      },
      response_status: 200,
      response_data: results,
      user_id: user.id,
      business_id: business.id
    })

    return NextResponse.json({
      success: true,
      message: 'Company data refreshed',
      results,
      updated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Refresh company error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh company data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions
function getAgeInHours(timestamp: string | null): number {
  if (!timestamp) return Infinity
  const age = Date.now() - new Date(timestamp).getTime()
  return Math.floor(age / (1000 * 60 * 60))
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

function calculateCompleteness(business: Business): number {
  const fields = [
    business.name,
    business.description,
    business.company_number,
    business.website,
    business.phone_numbers && (business.phone_numbers as any[]).length > 0,
    business.emails && (business.emails as any[]).length > 0,
    business.address,
    business.categories && business.categories.length > 0,
    business.company_status,
    business.incorporation_date,
    business.sic_codes && business.sic_codes.length > 0,
  ]

  const completed = fields.filter(Boolean).length
  return Math.round((completed / fields.length) * 100)
}