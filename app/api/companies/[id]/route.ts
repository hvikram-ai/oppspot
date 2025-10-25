import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompaniesHouseService } from '@/lib/services/companies-house'
import { Database } from '@/types/database'
import type { Row } from '@/lib/supabase/helpers'

type Business = Database['public']['Tables']['businesses']['Row']

interface CompanyProfile {
  company_number: string
  company_name: string
  company_status: string
  company_status_detail?: string
  date_of_incorporation?: string
  type: string
  jurisdiction?: string
  sic_codes?: string[]
  registered_office_address?: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    postal_code?: string
    country?: string
    region?: string
  }
  accounts?: {
    next_due?: string
    last_accounts?: {
      made_up_to?: string
      type?: string
    }
    accounting_reference_date?: {
      day?: string
      month?: string
    }
  }
  confirmation_statement?: {
    next_due?: string
    last_made_up_to?: string
  }
  etag?: string
  links?: {
    self?: string
    filing_history?: string
    officers?: string
    charges?: string
  }
}

interface CompanyOfficer {
  name: string
  officer_role: string
  appointed_on?: string
  resigned_on?: string
  date_of_birth?: {
    month?: number
    year?: number
  }
  nationality?: string
  country_of_residence?: string
  address?: {
    premises?: string
    address_line_1?: string
    locality?: string
    postal_code?: string
    country?: string
  }
}

interface FilingHistoryItem {
  category: string
  date: string
  description: string
  type: string
  links?: {
    self?: string
    document_metadata?: string
  }
}

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
        .single() as { data: Row<'businesses'> | null }

      business = data
    } else {
      // It's likely a company number
      isCompanyNumber = true
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('company_number', id)
        .single() as { data: Row<'businesses'> | null }

      business = data
    }

    // If not found in DB or force refresh requested, try Companies House API
    const isConfigured = process.env.COMPANIES_HOUSE_API_KEY !== undefined && process.env.COMPANIES_HOUSE_API_KEY !== ''
    if ((!business || forceRefresh) && isConfigured) {
      const companyNumber = business?.company_number || (isCompanyNumber ? id : null)

      if (companyNumber) {
        try {
          const companyData = await companiesHouse.getCompanyProfile(companyNumber)

          if (companyData) {
            // Prepare enriched data - map to database schema
            const enrichedData = {
              company_number: companyData.company_number,
              name: companyData.company_name,
              company_status: companyData.company_status,
              company_type: companyData.type,
              incorporation_date: companyData.date_of_incorporation,
              registered_office_address: companyData.registered_office_address as unknown,
              sic_codes: companyData.sic_codes || [],
              accounts: companyData.accounts as unknown,
              companies_house_data: companyData as unknown,
              companies_house_last_updated: new Date().toISOString(),
              data_sources: {
                companies_house: {
                  last_updated: new Date().toISOString(),
                  etag: companyData.etag,
                }
              } as unknown,
            }

            if (business) {
              // Update existing record
              const { data: updated, error: updatedError } = await supabase
                .from('businesses')
                .update(enrichedData as never)
                .eq('id', business.id)
                .select()
                .single() as { data: Row<'businesses'> | null; error: unknown }

              business = updated
            } else {
              // Create new record
              const { data: created, error: createdError } = await supabase
                .from('businesses')
                .insert({
                  ...enrichedData,
                  id: crypto.randomUUID(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                } as never)
                .select()
                .single() as { data: Row<'businesses'> | null; error: unknown }

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
    let officers: { items: CompanyOfficer[] } | null = null
    let filings: { items: FilingHistoryItem[] } | null = null

    if (includeOfficers && business?.company_number && isConfigured) {
      try {
        officers = await companiesHouse.getCompanyOfficers(business.company_number)
      } catch (error) {
        console.error('Error fetching officers:', error)
      }
    }

    if (includeFilings && business?.company_number && isConfigured) {
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
      source: business?.companies_house_last_updated ? 'companies_house' : 'database'
    })

  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}