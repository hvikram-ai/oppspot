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
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Navbar } from '@/components/layout/navbar'

interface BusinessPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: BusinessPageProps) {
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

export default async function BusinessPage({ params }: BusinessPageProps) {
  const supabase = await createClient()
  
  // Fetch business details
  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !business) {
    notFound()
  }

  // Fetch related businesses (same category, nearby)
  const { data: relatedBusinesses } = await supabase
    .from('businesses')
    .select('*')
    .contains('categories', business.categories?.[0] ? [business.categories[0]] : [])
    .neq('id', params.id)
    .limit(6)

  // Log view event
  try {
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
          </div>
        </div>
      </div>
    </div>
  )
}