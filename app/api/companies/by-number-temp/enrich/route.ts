import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompaniesHouseService } from '@/lib/services/companies-house'

// Helper function to generate URL-safe slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabase = await createClient()
    const companiesHouse = getCompaniesHouseService()

    // Get company number from request body
    const body = await request.json()
    const companyNumber = body.company_number?.toUpperCase()

    if (!companyNumber) {
      return NextResponse.json(
        { error: 'Company number required' },
        { status: 400 }
      )
    }

    console.log(`Enriching company: ${companyNumber}`)

    // Check if company already exists in database
    const { data: existing } = await supabase
      .from('businesses')
      .select('id, company_number, companies_house_last_updated, cache_expires_at')
      .eq('company_number', companyNumber)
      .single()

    // Check if cache is still valid
    if (existing?.cache_expires_at) {
      const cacheExpiry = new Date(existing.cache_expires_at)
      if (cacheExpiry > new Date()) {
        console.log(`Using cached data for ${companyNumber}`)

        // Return existing data
        const { data: cachedCompany } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', existing.id)
          .single()

        return NextResponse.json({
          success: true,
          source: 'cache',
          company: cachedCompany,
          message: 'Company data retrieved from cache'
        })
      }
    }

    // Fetch fresh company profile from Companies House
    try {
      console.log(`Fetching profile from Companies House: ${companyNumber}`)
      const companyProfile = await companiesHouse.getCompanyProfile(companyNumber)

      // Format for database
      const dbData = companiesHouse.formatForDatabase(companyProfile)

      // Add additional fields
      const businessData = {
        ...dbData,
        slug: generateSlug(companyProfile.company_name),
        verified_at: new Date().toISOString(),
      }

      let result

      if (existing) {
        // Update existing record
        console.log(`Updating existing record for ${companyNumber}`)
        const { data: updated, error: updateError } = await supabase
          .from('businesses')
          .update(businessData)
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) {
          console.error('Update error:', updateError)
          throw updateError
        }

        result = updated
      } else {
        // Create new record
        console.log(`Creating new record for ${companyNumber}`)
        const { data: created, error: createError } = await supabase
          .from('businesses')
          .insert(businessData)
          .select()
          .single()

        if (createError) {
          console.error('Create error:', createError)
          throw createError
        }

        result = created
      }

      // Try to fetch additional data (officers, filing history) - non-blocking
      Promise.allSettled([
        companiesHouse.getCompanyOfficers(companyNumber)
          .then(officers => {
            // Store officers data if needed
            console.log(`Fetched ${officers.items.length} officers for ${companyNumber}`)
          })
          .catch(err => console.log('Officers fetch failed:', err)),

        companiesHouse.getFilingHistory(companyNumber)
          .then(filings => {
            // Store filing history if needed
            console.log(`Fetched ${filings.items.length} filings for ${companyNumber}`)
          })
          .catch(err => console.log('Filing history fetch failed:', err))
      ])

      return NextResponse.json({
        success: true,
        source: existing ? 'api_updated' : 'api_created',
        company: result,
        message: `Company profile ${existing ? 'updated' : 'created'} successfully`
      })

    } catch (apiError) {
      console.error('Companies House API error:', apiError)

      // If API fails but we have existing data, return it
      if (existing) {
        const { data: fallbackCompany } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', existing.id)
          .single()

        return NextResponse.json({
          success: true,
          source: 'cache_expired',
          company: fallbackCompany,
          warning: 'Companies House API unavailable, returning cached data',
          error: apiError instanceof Error ? apiError.message : 'Unknown error'
        })
      }

      // No existing data and API failed
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch company profile',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Enrich error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to enrich company',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check enrichment status
export async function GET(
  request: NextRequest
) {
  try {
    const supabase = await createClient()

    // Get company number from query params
    const { searchParams } = new URL(request.url)
    const companyNumber = searchParams.get('company_number')?.toUpperCase()

    if (!companyNumber) {
      return NextResponse.json(
        { error: 'Company number required' },
        { status: 400 }
      )
    }

    // Check if company exists in database
    const { data: company, error } = await supabase
      .from('businesses')
      .select('id, company_number, name, companies_house_last_updated, cache_expires_at')
      .eq('company_number', companyNumber)
      .single()

    if (error || !company) {
      return NextResponse.json({
        exists: false,
        company_number: companyNumber,
        message: 'Company not in database'
      })
    }

    // Check cache status
    const cacheValid = company.cache_expires_at ?
      new Date(company.cache_expires_at) > new Date() : false

    return NextResponse.json({
      exists: true,
      company_number: companyNumber,
      name: company.name,
      cache_valid: cacheValid,
      last_updated: company.companies_house_last_updated,
      cache_expires_at: company.cache_expires_at
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}