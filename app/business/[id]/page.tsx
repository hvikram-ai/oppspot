import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BusinessHeader } from '@/components/business/business-header'
import { BusinessInfo } from '@/components/business/business-info'
import { BusinessContact } from '@/components/business/business-contact'
import { BusinessLocation } from '@/components/business/business-location'
import { BusinessActions } from '@/components/business/business-actions'
import { LinkedInInfo } from '@/components/business/linkedin-info'
import { BusinessUpdates } from '@/components/business/business-updates'
import { SocialPresence } from '@/components/business/social-presence'
import { RelatedBusinesses } from '@/components/business/related-businesses'
import { BusinessStakeholders } from '@/components/business/business-stakeholders'
import { BANTScoreCard } from '@/components/bant/bant-score-card'
import { BenchmarkCard } from '@/components/benchmarking/benchmark-card'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { getMockCompany, getMockRelatedCompanies } from '@/lib/mock-data/companies'
import { Database } from '@/lib/supabase/database.types'
import { getCompaniesHouseService } from '@/lib/services/companies-house'

type Business = Database['public']['Tables']['businesses']['Row']

interface BusinessPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params: paramsPromise }: BusinessPageProps) {
  const params = await paramsPromise

  // Check if it's a mock/demo company first
  if (params.id.startsWith('mock-') || params.id.startsWith('demo-')) {
    const mockBusiness = getMockCompany(params.id)
    if (mockBusiness) {
      const location = mockBusiness.address?.city ? `, ${mockBusiness.address.city}` : ''
      return {
        title: `${mockBusiness.name}${location} - OppSpot (Demo)`,
        description: mockBusiness.description || `View details for ${mockBusiness.name} on OppSpot. Demo data for testing purposes.`,
        openGraph: {
          title: mockBusiness.name,
          description: mockBusiness.description || `Business profile for ${mockBusiness.name}`,
          type: 'website',
        }
      }
    }
  }

  const supabase = await createClient()

  // Handle API-prefixed IDs (from real-time search results)
  const businessId = params.id
  if (params.id.startsWith('api-')) {
    // Extract company number from api-12345678 format
    const companyNumber = params.id.replace('api-', '')
    const { data: business } = await supabase
      .from('businesses')
      .select('name, description, address')
      .eq('company_number', companyNumber)
      .single() as { data: any; error: unknown }

    if (business) {
      const location = business.address?.city ? `, ${business.address.city}` : ''
      return {
        title: `${business.name}${location} - OppSpot`,
        description: business.description || `View details for ${business.name} on OppSpot. Find contact information, location, and more.`,
        openGraph: {
          title: business.name,
          description: business.description || `Business profile for ${business.name}`,
          type: 'website',
        }
      }
    }
    // If not found, continue with default lookup
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, description, address')
    .eq('id', params.id)
    .single() as { data: any; error: unknown }

  if (!business) {
    return {
      title: 'Business Not Found - OppSpot',
      description: 'The requested business could not be found.'
    }
  }

  const location = business.address?.city ? `, ${business.address.city}` : ''

  return {
    title: `${business.name}${location} - OppSpot`,
    description: business.description || `View details for ${business.name} on OppSpot. Find contact information, location, and more.`,
    openGraph: {
      title: business.name,
      description: business.description || `Business profile for ${business.name}`,
      type: 'website',
    }
  }
}

export default async function BusinessPage({ params: paramsPromise }: BusinessPageProps) {
  const params = await paramsPromise
  let business: Business | null = null
  let relatedBusinesses: Business[] | null = null

  // Check if it's a mock/demo company first
  if (params.id.startsWith('mock-') || params.id.startsWith('demo-')) {
    business = getMockCompany(params.id) as Business
    if (!business) {
      notFound()
    }
    // Get mock related businesses
    relatedBusinesses = getMockRelatedCompanies(params.id, 6) as Business[]
  } else {
    // Fetch from database for real companies
    const supabase = await createClient()

    // Handle API-prefixed IDs (from real-time search results)
    let lookupId = params.id
    let lookupField: 'id' | 'company_number' = 'id'

    if (params.id.startsWith('api-')) {
      // Extract company number from api-12345678 format
      lookupId = params.id.replace('api-', '')
      lookupField = 'company_number'
    }

    // Fetch business details
    const { data: dbBusiness, error } = await supabase
      .from('businesses')
      .select('*')
      .eq(lookupField, lookupId)
      .single()

    if (error || !dbBusiness) {
      // If not in database and it's an API-prefixed ID, try fetching from Companies House
      if (params.id.startsWith('api-')) {
        try {
          const companiesHouse = getCompaniesHouseService()
          const companyNumber = params.id.replace('api-', '')
          const companyProfile = await companiesHouse.getCompanyProfile(companyNumber) as any

          // Format Companies House data to match business structure
          business = {
            id: params.id,
            company_number: companyProfile.company_number,
            name: companyProfile.company_name,
            company_status: companyProfile.company_status,
            company_type: companyProfile.type,
            incorporation_date: companyProfile.date_of_creation,
            description: null,
            registered_office_address: companyProfile.registered_office_address,
            address: companyProfile.registered_office_address ? {
              formatted: [
                companyProfile.registered_office_address.address_line_1,
                companyProfile.registered_office_address.address_line_2,
                companyProfile.registered_office_address.locality,
                companyProfile.registered_office_address.postal_code,
                companyProfile.registered_office_address.country
              ].filter(Boolean).join(', '),
              street: companyProfile.registered_office_address.address_line_1,
              city: companyProfile.registered_office_address.locality,
              postal_code: companyProfile.registered_office_address.postal_code,
              country: companyProfile.registered_office_address.country,
            } : null,
            sic_codes: companyProfile.sic_codes || [],
            website: null,
            phone: null,
            email: null,
            metadata: companyProfile,
            companies_house_data: companyProfile,
            companies_house_last_updated: new Date().toISOString(),
          } as Business

          relatedBusinesses = []
        } catch (apiError) {
          console.error('Failed to fetch from Companies House:', apiError)
          notFound()
        }
      } else {
        notFound()
      }
    } else {
      business = dbBusiness
    }

    // Only fetch related businesses if we got data from database
    if (dbBusiness && business) {
      // Fetch related businesses (same category, nearby)
      const { data: dbRelated } = await supabase
        .from('businesses')
        .select('*')
        .contains('categories', business.categories?.[0] ? [business.categories[0]] : [])
        .neq('id', params.id)
        .limit(6)

      relatedBusinesses = dbRelated
    }
  }

  // Log view event (only for non-mock/demo companies)
  if (!params.id.startsWith('mock-') && !params.id.startsWith('demo-')) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // @ts-expect-error - Supabase type inference issue
        await supabase.from('events').insert({
          user_id: user.id,
          event_type: 'business_view',
          event_data: {
            business_id: params.id,
            business_name: business.name,
          }
        })
      }
    } catch (e) {
      // Don't fail if event logging fails
      console.error('Failed to log view event:', e)
    }
  }

  return (
    <ProtectedLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Search', href: '/search' },
            { label: business.name }
          ]}
        />
      </div>

      <div className="container max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            <BusinessHeader business={business as any} />
            <BusinessInfo business={business as any} />
            <LinkedInInfo
              businessId={business.id}
              businessName={business.name}
              linkedinData={(() => {
                const metadata = business.metadata as Record<string, unknown> & { linkedin?: any } | null | undefined
                const socialLinks = business.social_links as Record<string, unknown> & { linkedin?: string } | null | undefined
                return metadata?.linkedin || socialLinks?.linkedin ? {
                  url: socialLinks?.linkedin,
                  ...metadata?.linkedin
                } : null
              })()}
              isAdmin={false}
            />
            <BusinessUpdates
              businessId={business.id}
              businessName={business.name}
            />
            <SocialPresence
              businessId={business.id}
              businessName={business.name}
              websiteUrl={business.website}
              isAdmin={false}
            />
            <BusinessLocation business={business as any} />

            {relatedBusinesses && relatedBusinesses.length > 0 && (
              <RelatedBusinesses
                businesses={relatedBusinesses as any}
                currentBusinessId={params.id}
              />
            )}
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            <BusinessContact business={business as any} />
            <BusinessActions business={business as any} />
            {!params.id.startsWith('mock-') && (
              <>
                <BusinessStakeholders
                  businessId={business.id}
                  businessName={business.name}
                />
                <BANTScoreCard
                  companyId={business.id}
                  companyName={business.name}
                />
                <BenchmarkCard
                  companyId={business.id}
                  companyName={business.name}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}