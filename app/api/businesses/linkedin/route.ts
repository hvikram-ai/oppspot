import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LinkedInClient, ProxycurlClient } from '@/lib/linkedin/client'
import { Database } from '@/lib/supabase/database.types'
import type { Row } from '@/lib/supabase/helpers'

type Business = Database['public']['Tables']['businesses']['Row']

// Proxycurl API response interface
interface ProxycurlCompanyProfile {
  name?: string
  tagline?: string
  description?: string
  industry?: string
  company_size_on_linkedin?: string
  employee_count?: number
  hq?: {
    city?: string
    country?: string
  }
  founded_year?: number
  website?: string
  specialities?: string[]
  follower_count?: number
  locations?: Array<{
    city?: string
    country?: string
    is_headquarters?: boolean
  }>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: Pick<Row<'profiles'>, 'role'> | null; error: any }

    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, linkedinUrl, autoSearch = false } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Fetch the business
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single() as { data: Row<'businesses'> | null; error: any }

    if (fetchError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    let finalLinkedInUrl = linkedinUrl

    // If no LinkedIn URL provided and autoSearch is enabled, try to find it
    if (!finalLinkedInUrl && autoSearch) {
      const linkedInClient = new LinkedInClient()
      
      // Search for the company on LinkedIn
      const searchResult = await linkedInClient.searchCompany(
        business.name,
        business.address ? ((business.address as Record<string, unknown>).city as string) : undefined
      )

      if (searchResult && searchResult.linkedin_url) {
        finalLinkedInUrl = searchResult.linkedin_url
      } else {
        return NextResponse.json({
          message: 'LinkedIn profile not found',
          searched_for: business.name
        }, { status: 404 })
      }
    }

    if (!finalLinkedInUrl) {
      return NextResponse.json(
        { error: 'LinkedIn URL is required or enable autoSearch' },
        { status: 400 }
      )
    }

    // Get LinkedIn data
    interface LinkedInData {
      url: string
      name?: string
      tagline?: string
      description?: string
      industry?: string
      company_size?: string
      employee_count?: number
      headquarters?: string | null
      founded?: number
      website?: string
      specialties?: string[]
      followers?: number
      locations?: unknown[]
      data_source?: string
      last_updated?: string
    }

    let linkedInData: LinkedInData | null = null
    let dataSource = 'basic'

    // Try to use Proxycurl if available
    if (process.env.PROXYCURL_API_KEY) {
      try {
        const proxycurl = new ProxycurlClient(process.env.PROXYCURL_API_KEY)
        const profileData = await proxycurl.getCompanyProfile(finalLinkedInUrl) as ProxycurlCompanyProfile

        linkedInData = {
          url: finalLinkedInUrl,
          name: profileData.name || business.name,
          tagline: profileData.tagline,
          description: profileData.description,
          industry: profileData.industry,
          company_size: profileData.company_size_on_linkedin,
          employee_count: profileData.employee_count,
          headquarters: profileData.hq ? `${profileData.hq.city}, ${profileData.hq.country}` : null,
          founded: profileData.founded_year,
          website: profileData.website,
          specialties: profileData.specialities || [],
          followers: profileData.follower_count,
          locations: profileData.locations || []
        }
        dataSource = 'proxycurl'
      } catch (error) {
        console.error('Proxycurl error, falling back to basic:', error)
      }
    }

    // Fallback to basic LinkedIn client
    if (!linkedInData) {
      const linkedInClient = new LinkedInClient()
      const basicData = await linkedInClient.getCompanyData(finalLinkedInUrl)

      if (!basicData) {
        return NextResponse.json(
          { error: 'Failed to fetch LinkedIn data' },
          { status: 500 }
        )
      }

      // Convert LinkedInCompanyData to LinkedInData format
      linkedInData = {
        url: basicData.url || finalLinkedInUrl,
        name: basicData.name,
        tagline: basicData.tagline,
        description: basicData.description,
        industry: basicData.industry,
        company_size: basicData.company_size,
        employee_count: basicData.employee_count,
        headquarters: basicData.headquarters || null,
        founded: basicData.founded,
        website: basicData.website,
        specialties: basicData.specialties || [],
        followers: basicData.followers,
        locations: basicData.locations || []
      }
    }

    // Prepare updates for the business
    const updates: Partial<Business> = {
      metadata: {
        ...((business.metadata as Record<string, unknown>) || {}),
        linkedin: {
          ...linkedInData,
          data_source: dataSource,
          last_updated: new Date().toISOString()
        }
      } as Database['public']['Tables']['businesses']['Row']['metadata'],
      social_links: {
        ...((business.social_links as Record<string, unknown>) || {}),
        linkedin: finalLinkedInUrl
      } as Database['public']['Tables']['businesses']['Row']['social_links']
    }

    // Update description if LinkedIn has a better one
    if (linkedInData.description && 
        (!business.description || business.description.length < linkedInData.description.length)) {
      updates.description = linkedInData.description
    }

    // Update the business
    const { error: updateError } = await supabase
      .from('businesses')
      // @ts-expect-error - Supabase query builder typing issue
      .update(updates)
      .eq('id', businessId)

    if (updateError) {
      console.error('Failed to update business:', updateError)
      return NextResponse.json(
        { error: 'Failed to save LinkedIn data' },
        { status: 500 }
      )
    }

    // Log the enrichment event
    // @ts-ignore - Supabase query builder typing issue
    await supabase.from('events').insert({
      user_id: user.id,
      event_type: 'linkedin_enrichment',
      metadata: {
        business_id: businessId,
        business_name: business.name,
        linkedin_url: finalLinkedInUrl,
        data_source: dataSource,
        auto_searched: autoSearch
      }
    })

    return NextResponse.json({
      message: 'LinkedIn data enriched successfully',
      business_id: businessId,
      linkedin_url: finalLinkedInUrl,
      data_source: dataSource,
      linkedin_data: linkedInData
    })

  } catch (error) {
    console.error('LinkedIn enrichment error:', error)
    return NextResponse.json(
      { error: 'LinkedIn enrichment failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Bulk enrich multiple businesses with LinkedIn data
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: Pick<Row<'profiles'>, 'role'> | null; error: any }

    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { limit = 10, filter = 'no_linkedin' } = body

    // Build query based on filter
    let query = supabase.from('businesses').select('*')

    switch (filter) {
      case 'no_linkedin':
        query = query.is('social_links->linkedin', null)
        break
      case 'verified_only':
        query = query.eq('verified', true).is('social_links->linkedin', null)
        break
      default:
        query = query.is('social_links->linkedin', null)
    }

    query = query.limit(limit)

    const { data: businesses, error: fetchError } = await query as { data: Row<'businesses'>[] | null; error: any }

    if (fetchError || !businesses || businesses.length === 0) {
      return NextResponse.json({
        message: 'No businesses found to enrich',
        processed: 0
      })
    }

    const linkedInClient = new LinkedInClient()
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const business of businesses) {
      interface BusinessResult {
        id: string
        name: string | null
        status?: string
        linkedin_url?: string
        error?: string
      }

      const businessResult: BusinessResult = {
        id: business.id,
        name: business.name
      }

      try {
        // Search for LinkedIn profile
        const searchResult = await linkedInClient.searchCompany(
          business.name,
          business.address ? ((business.address as Record<string, unknown>).city as string) : undefined
        )

        if (searchResult && searchResult.linkedin_url) {
          // Get LinkedIn data
          const linkedInData = await linkedInClient.getCompanyData(searchResult.linkedin_url)

          if (linkedInData) {
            // Update business with LinkedIn data
            const updates: Partial<Business> = {
              metadata: {
                ...((business.metadata as Record<string, unknown>) || {}),
                linkedin: {
                  ...linkedInData,
                  data_source: 'bulk_search',
                  last_updated: new Date().toISOString()
                }
              } as Database['public']['Tables']['businesses']['Row']['metadata'],
              social_links: {
                ...((business.social_links as Record<string, unknown>) || {}),
                linkedin: searchResult.linkedin_url
              } as Database['public']['Tables']['businesses']['Row']['social_links']
            }

            const { error: updateError } = await supabase
              .from('businesses')
              // @ts-expect-error - Supabase query builder typing issue
              .update(updates)
              .eq('id', business.id)

            if (updateError) {
              throw updateError
            }

            businessResult.status = 'success'
            businessResult.linkedin_url = searchResult.linkedin_url
            successCount++
          } else {
            businessResult.status = 'no_data'
          }
        } else {
          businessResult.status = 'not_found'
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`Failed to enrich ${business.name}:`, error)
        businessResult.status = 'error'
        businessResult.error = error instanceof Error ? error.message : 'Unknown error'
        errorCount++
      }

      results.push(businessResult)
    }

    // Log the bulk enrichment event
    // @ts-ignore - Supabase query builder typing issue
    await supabase.from('events').insert({
      user_id: user.id,
      event_type: 'bulk_linkedin_enrichment',
      metadata: {
        filter,
        total_processed: businesses.length,
        success_count: successCount,
        error_count: errorCount
      }
    })

    return NextResponse.json({
      message: 'Bulk LinkedIn enrichment completed',
      processed: businesses.length,
      successful: successCount,
      errors: errorCount,
      results
    })

  } catch (error) {
    console.error('Bulk LinkedIn enrichment error:', error)
    return NextResponse.json(
      { error: 'Bulk enrichment failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Search for a company on LinkedIn
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const companyName = searchParams.get('company')
    const location = searchParams.get('location')

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    const linkedInClient = new LinkedInClient()
    
    // Search for the company
    const searchResult = await linkedInClient.searchCompany(
      companyName,
      location || undefined
    )

    if (!searchResult) {
      return NextResponse.json({
        message: 'No LinkedIn profile found',
        searched_for: companyName,
        location: location
      }, { status: 404 })
    }

    // Try to get additional data
    const companyData = await linkedInClient.getCompanyData(searchResult.linkedin_url)

    return NextResponse.json({
      found: true,
      linkedin_url: searchResult.linkedin_url,
      company_data: companyData,
      search_query: {
        company: companyName,
        location: location
      }
    })

  } catch (error) {
    console.error('LinkedIn search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}