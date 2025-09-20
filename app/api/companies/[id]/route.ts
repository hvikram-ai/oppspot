import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompaniesHouseService } from '@/lib/services/companies-house'
import { Database } from '@/types/database'

type Business = Database['public']['Tables']['businesses']['Row']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
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
      // It's a UUID, look up by ID
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .single()

      business = data
    } else {
      // It's likely a company number
      isCompanyNumber = true
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('company_number', id)
        .single()

      business = data
    }

    // If not found in DB or force refresh requested, try Companies House API
    if ((!business || forceRefresh) && companiesHouse.isConfigured()) {
      const companyNumber = business?.company_number || (isCompanyNumber ? id : null)

      if (companyNumber) {
        try {
          const companyData = await companiesHouse.getCompany(companyNumber)

          if (companyData) {
            // Prepare enriched data
            const enrichedData = {
              company_number: companyData.company_number,
              name: companyData.company_name,
              company_status: companyData.company_status,
              company_type: companyData.type,
              date_of_creation: companyData.date_of_creation,
              registered_office_address: companyData.registered_office_address,
              sic_codes: companyData.sic_codes,
              has_been_liquidated: companyData.has_been_liquidated,
              has_charges: companyData.has_charges,
              has_insolvency_history: companyData.has_insolvency_history,
              jurisdiction: companyData.jurisdiction,
              accounts: companyData.accounts,
              confirmation_statement: companyData.confirmation_statement,
              enriched_at: new Date().toISOString(),
              enrichment_source: 'companies_house'
            }

            if (business) {
              // Update existing record
              const { data: updated } = await supabase
                .from('businesses')
                .update(enrichedData)
                .eq('id', business.id)
                .select()
                .single()

              business = updated
            } else {
              // Create new record
              const { data: created } = await supabase
                .from('businesses')
                .insert({
                  ...enrichedData,
                  id: crypto.randomUUID(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single()

              business = created
            }
          }
        } catch (apiError) {
          console.error('Companies House API error:', apiError)
        }
      }
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Optionally fetch additional data
    let officers = null
    let filings = null

    if (includeOfficers && business.company_number && companiesHouse.isConfigured()) {
      try {
        officers = await companiesHouse.getOfficers(business.company_number)
      } catch (error) {
        console.error('Error fetching officers:', error)
      }
    }

    if (includeFilings && business.company_number && companiesHouse.isConfigured()) {
      try {
        filings = await companiesHouse.getFilingHistory(business.company_number)
      } catch (error) {
        console.error('Error fetching filing history:', error)
      }
    }

    return NextResponse.json({
      company: business,
      officers,
      filings,
      source: business.enrichment_source || 'database'
    })

  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}