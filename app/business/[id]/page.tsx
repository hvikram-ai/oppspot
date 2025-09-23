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
import { Navbar } from '@/components/layout/navbar'
import { getMockCompany, getMockRelatedCompanies } from '@/lib/mock-data/companies'
import { Database } from '@/lib/supabase/database.types'

type Business = Database['public']['Tables']['businesses']['Row']

interface BusinessPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params: paramsPromise }: BusinessPageProps) {
  const params = await paramsPromise
  // Check if it's a mock company first
  if (params.id.startsWith('mock-')) {
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
  
  const { data: business } = await supabase
    .from('businesses')
    .select('name, description, address')
    .eq('id', params.id)
    .single()

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
  let business: Business | Record<string, unknown> | null = null
  let relatedBusinesses: (Business | Record<string, unknown>)[] | null = null

  // Check if it's a mock company first
  if (params.id.startsWith('mock-')) {
    business = getMockCompany(params.id) as Business
    if (!business) {
      notFound()
    }
    // Get mock related businesses
    relatedBusinesses = getMockRelatedCompanies(params.id, 6) as Business[]
  } else {
    // Fetch from database for real companies
    const supabase = await createClient()
    
    // Fetch business details
    const { data: dbBusiness, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !dbBusiness) {
      notFound()
    }
    business = dbBusiness

    // Fetch related businesses (same category, nearby)
    const { data: dbRelated } = await supabase
      .from('businesses')
      .select('*')
      .contains('categories', business.categories?.[0] ? [business.categories[0]] : [])
      .neq('id', params.id)
      .limit(6)
    
    relatedBusinesses = dbRelated
  }

  // Log view event (only for non-mock companies)
  if (!params.id.startsWith('mock-')) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
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
            <BusinessHeader business={business} />
            <BusinessInfo business={business} />
            <LinkedInInfo 
              businessId={business.id}
              businessName={business.name}
              linkedinData={business.metadata?.linkedin || business.social_links?.linkedin ? {
                url: business.social_links?.linkedin,
                ...business.metadata?.linkedin
              } : null}
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
            <BusinessLocation business={business} />
            
            {relatedBusinesses && relatedBusinesses.length > 0 && (
              <RelatedBusinesses 
                businesses={relatedBusinesses}
                currentBusinessId={params.id}
              />
            )}
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            <BusinessContact business={business} />
            <BusinessActions business={business} />
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
    </div>
  )
}