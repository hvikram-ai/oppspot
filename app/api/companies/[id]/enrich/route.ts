import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompaniesHouseService } from '@/lib/services/companies-house'

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

    const { id: companyNumber } = await params

    if (!companyNumber) {
      return NextResponse.json(
        { error: 'Company number is required' },
        { status: 400 }
      )
    }

    // Check if enriched data already exists in database
    const { data: existingCompany } = await supabase
      .from('businesses')
      .select('*')
      .eq('company_number', companyNumber)
      .single()

    if (existingCompany && existingCompany.enriched_at) {
      // Check if data is recent (less than 24 hours old)
      const enrichedDate = new Date(existingCompany.enriched_at)
      const hoursSinceEnrichment = (Date.now() - enrichedDate.getTime()) / (1000 * 60 * 60)

      if (hoursSinceEnrichment < 24) {
        return NextResponse.json({
          exists: true,
          enriched: true,
          company: existingCompany,
          enriched_at: existingCompany.enriched_at
        })
      }
    }

    return NextResponse.json({
      exists: !!existingCompany,
      enriched: false,
      company: existingCompany
    })

  } catch (error) {
    console.error('Error checking enrichment status:', error)
    return NextResponse.json(
      { error: 'Failed to check enrichment status' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const { id: companyNumber } = await params

    if (!companyNumber) {
      return NextResponse.json(
        { error: 'Company number is required' },
        { status: 400 }
      )
    }

    // Get Companies House service
    const companiesHouse = getCompaniesHouseService()

    // Check if API is configured
    if (!companiesHouse.isConfigured()) {
      // Return demo data if API is not configured
      const demoCompany = {
        company_number: companyNumber,
        name: `Demo Company ${companyNumber}`,
        company_status: 'active',
        company_type: 'ltd',
        date_of_creation: '2000-01-01',
        registered_office_address: {
          address_line_1: '123 Demo Street',
          locality: 'London',
          postal_code: 'SW1A 1AA',
          country: 'United Kingdom'
        },
        sic_codes: ['62020', '62090'],
        enriched_at: new Date().toISOString(),
        is_demo: true
      }

      return NextResponse.json({
        company: demoCompany,
        source: 'demo',
        message: 'Companies House API not configured. Returning demo data.'
      })
    }

    try {
      // Fetch company profile from Companies House
      const companyData = await companiesHouse.getCompany(companyNumber)

      if (!companyData) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }

      // Prepare data for database
      const enrichedCompany = {
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

      // Check if company exists in database
      const { data: existingCompany } = await supabase
        .from('businesses')
        .select('id')
        .eq('company_number', companyNumber)
        .single()

      if (existingCompany) {
        // Update existing company
        const { data: updatedCompany, error: updateError } = await supabase
          .from('businesses')
          .update(enrichedCompany)
          .eq('company_number', companyNumber)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating company:', updateError)
          return NextResponse.json({
            company: enrichedCompany,
            source: 'api',
            saved: false,
            error: 'Failed to save to database'
          })
        }

        return NextResponse.json({
          company: updatedCompany,
          source: 'api',
          saved: true,
          updated: true
        })
      } else {
        // Insert new company
        const { data: newCompany, error: insertError } = await supabase
          .from('businesses')
          .insert({
            ...enrichedCompany,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting company:', insertError)
          return NextResponse.json({
            company: enrichedCompany,
            source: 'api',
            saved: false,
            error: 'Failed to save to database'
          })
        }

        return NextResponse.json({
          company: newCompany,
          source: 'api',
          saved: true,
          created: true
        })
      }
    } catch (apiError) {
      console.error('Companies House API error:', apiError)

      // Return demo data on API error
      const demoCompany = {
        company_number: companyNumber,
        name: `Company ${companyNumber}`,
        company_status: 'active',
        company_type: 'ltd',
        date_of_creation: '2000-01-01',
        registered_office_address: {
          address_line_1: '123 Business Street',
          locality: 'London',
          postal_code: 'EC1A 1BB',
          country: 'United Kingdom'
        },
        sic_codes: ['62020'],
        enriched_at: new Date().toISOString(),
        is_demo: true
      }

      return NextResponse.json({
        company: demoCompany,
        source: 'demo',
        error: 'API error - returning demo data',
        message: apiError instanceof Error ? apiError.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('Error enriching company:', error)
    return NextResponse.json(
      { error: 'Failed to enrich company data' },
      { status: 500 }
    )
  }
}