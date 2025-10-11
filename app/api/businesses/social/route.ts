import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebsiteScraper } from '@/lib/scraping/website-scraper'
import { SocialMediaScraper } from '@/lib/scraping/social-media-scraper'
import { Database } from '@/lib/supabase/database.types'
import type { Row } from '@/lib/supabase/helpers'

// POST: Scrape and save social media data for a business
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Social API] Error fetching profile:', profileError);
    }
    
    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { businessId, scrapeWebsite = true, scrapeSocial = true } = body
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }
    
    // Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }
    
    interface ScoreData {
      overall_score: number
      reach_score: number
      engagement_score: number
      activity_score: number
      growth_score: number
    }

    interface SocialResults {
      business: {
        id: string
        name: string | null
      }
      website: unknown
      social: unknown[]
      socialScore?: ScoreData
    }

    const results: SocialResults = {
      business: {
        id: business.id,
        name: business.name
      },
      website: null,
      social: []
    }
    
    // Scrape website if URL is available
    if (scrapeWebsite && business.website) {
      try {
        const websiteScraper = new WebsiteScraper()
        const websiteData = await websiteScraper.scrapeWebsite(business.website)
        
        // Save website data to database
        const { error: saveError } = await supabase
          .from('website_data')
          .upsert({
            business_id: businessId,
            website_url: business.website,
            title: websiteData.title,
            meta_description: websiteData.description,
            meta_keywords: websiteData.keywords,
            about_text: websiteData.about,
            services: websiteData.services,
            products: websiteData.products,
            team_members: websiteData.teamMembers,
            testimonials: websiteData.testimonials,
            technologies: websiteData.technologies,
            has_ssl: websiteData.hasSsl,
            mobile_friendly: websiteData.mobileFriendly,
            seo_score: websiteData.seoScore,
            structured_data: websiteData.structuredData,
            emails: websiteData.emails,
            phone_numbers: websiteData.phones,
            social_links: websiteData.socialLinks,
            has_online_store: websiteData.hasOnlineStore,
            payment_methods: websiteData.paymentMethods,
            business_hours: websiteData.businessHours,
            last_scraped_at: new Date().toISOString(),
            scrape_status: 'success'
          })
        
        if (saveError) {
          console.error('Error saving website data:', saveError)
        }
        
        results.website = websiteData
        
        // Extract social media profiles from website
        if (scrapeSocial && websiteData.socialLinks) {
          const socialScraper = new SocialMediaScraper()
          const profiles = await socialScraper.discoverSocialProfiles(business.website)
          
          // Save social profiles
          for (const profile of profiles) {
            const { error: profileError } = await supabase
              .from('social_media_profiles')
              .upsert({
                business_id: businessId,
                platform: profile.platform,
                profile_url: profile.profileUrl,
                username: profile.username,
                bio: profile.bio,
                profile_image_url: profile.profileImage,
                is_active: profile.isActive,
                last_scraped_at: new Date().toISOString(),
                scrape_status: 'success'
              })
            
            if (!profileError) {
              results.social.push(profile)
            }
          }
        }
      } catch (error) {
        console.error('Website scraping error:', error)
        results.website = { error: 'Failed to scrape website' }
      }
    }
    
    // Calculate and save social presence score
    try {
      const { data: scoreData, error: scoreError } = await supabase
        .rpc('calculate_social_presence_score', {
          target_business_id: businessId
        });

      if (scoreError) {
        console.error('[Social API] Error calculating social score:', scoreError);
      }

      if (scoreData && scoreData.length > 0) {
        const score = scoreData[0] as ScoreData
        
        // Determine insights based on scores
        const strengths: string[] = []
        const weaknesses: string[] = []
        const recommendations: string[] = []
        
        if (score.reach_score >= 70) {
          strengths.push('Strong follower base across platforms')
        } else if (score.reach_score < 30) {
          weaknesses.push('Limited social media reach')
          recommendations.push('Focus on growing follower base')
        }
        
        if (score.engagement_score >= 70) {
          strengths.push('High engagement rates')
        } else if (score.engagement_score < 30) {
          weaknesses.push('Low engagement with audience')
          recommendations.push('Create more engaging content')
        }
        
        if (score.activity_score >= 70) {
          strengths.push('Consistent posting schedule')
        } else if (score.activity_score < 30) {
          weaknesses.push('Infrequent posting')
          recommendations.push('Increase posting frequency')
        }
        
        // Save social presence score
        await supabase
          .from('social_presence_scores')
          .upsert({
            business_id: businessId,
            overall_score: score.overall_score,
            reach_score: score.reach_score,
            engagement_score: score.engagement_score,
            activity_score: score.activity_score,
            growth_score: score.growth_score,
            strengths,
            weaknesses,
            recommendations,
            calculated_at: new Date().toISOString()
          })
        
        results.socialScore = score
      }
    } catch (error) {
      console.error('Error calculating social score:', error)
    }
    
    // Log event
    await supabase.from('events').insert({
      user_id: user.id,
      event_type: 'social_data_scraped',
      event_data: {
        business_id: businessId,
        business_name: business.name,
        website_scraped: scrapeWebsite && !!business.website,
        social_profiles_found: results.social.length
      }
    } as Database['public']['Tables']['events']['Insert'])
    
    return NextResponse.json({
      message: 'Social data scraped successfully',
      results
    })
    
  } catch (error) {
    console.error('Social scraping error:', error)
    return NextResponse.json(
      { error: 'Failed to scrape social data' },
      { status: 500 }
    )
  }
}

// GET: Fetch social media data for a business
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }
    
    // Fetch social profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('social_media_profiles')
      .select('*')
      .eq('business_id', businessId)
    
    if (profilesError) throw profilesError
    
    // Fetch website data
    const { data: websiteData, error: websiteDataError } = await supabase
      .from('website_data')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (websiteDataError) {
      console.error('[Social API GET] Error fetching website data:', websiteDataError);
    }

    // Fetch social presence score
    const { data: socialScore, error: socialScoreError } = await supabase
      .from('social_presence_scores')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (socialScoreError) {
      console.error('[Social API GET] Error fetching social score:', socialScoreError);
    }
    
    // Fetch recent metrics history
    const { data: metricsHistory, error: metricsHistoryError } = await supabase
      .from('social_metrics_history')
      .select('*')
      .eq('business_id', businessId)
      .order('metric_date', { ascending: false })
      .limit(30)
    
    return NextResponse.json({
      profiles: profiles || [],
      website: websiteData,
      socialScore,
      metricsHistory: metricsHistory || []
    })
    
  } catch (error) {
    console.error('Error fetching social data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social data' },
      { status: 500 }
    )
  }
}

// PATCH: Update social media profile data
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { profileId, ...updates } = body
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }
    
    // Update profile
    const { data: updated, error } = await supabase
      .from('social_media_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updated
    })
    
  } catch (error) {
    console.error('Update social profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}