import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'
import type { Row } from '@/lib/supabase/helpers'

type DbClient = SupabaseClient<Database>

// GET: Fetch market analysis
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    
    const category = searchParams.get('category')
    const location = searchParams.get('location')
    const period = searchParams.get('period') || '30' // days
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }
    
    // Check for existing analysis
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))
    
    const { data: existingAnalysis } = await supabase
      .from('market_analysis')
      .select('*')
      .eq('category', category)
      .gte('period_end', endDate.toISOString().split('T')[0])
      .lte('period_start', startDate.toISOString().split('T')[0])
      .single()
    
    if (existingAnalysis) {
      return NextResponse.json({ analysis: existingAnalysis })
    }
    
    // Generate new analysis
    const analysis = await generateMarketAnalysis(
      supabase,
      category,
      location,
      parseInt(period)
    )
    
    // Save analysis
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('market_analysis')
      // @ts-expect-error - Supabase type inference issue with insert() method
      .insert(analysis)
      .select()
      .single()
    
    if (saveError) {
      console.error('Save analysis error:', saveError)
      // Return generated analysis even if save fails
      return NextResponse.json({ analysis })
    }
    
    return NextResponse.json({ analysis: savedAnalysis })
    
  } catch (error) {
    console.error('Market analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market analysis' },
      { status: 500 }
    )
  }
}

// POST: Generate SWOT analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { businessId, isPublic = false } = body
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }
    
    // Fetch business details
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single() as { data: Row<'businesses'> | null; error: any }
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }
    
    // Generate SWOT analysis
    const swot = await generateSWOTAnalysis(supabase, business)
    
    // Save SWOT analysis
    const { data: savedSwot, error: saveError } = await supabase
      .from('swot_analysis')
      // @ts-expect-error - Supabase type inference issue with insert() method
      .insert({
        business_id: businessId,
        user_id: user.id,
        ...swot,
        ai_generated: true,
        is_public: isPublic
      })
      .select()
      .single()

    if (saveError) throw saveError

    const businessData = business as any;

    return NextResponse.json({
      swot: savedSwot,
      business: {
        id: businessData.id,
        name: businessData.name
      }
    })
    
  } catch (error) {
    console.error('SWOT analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to generate SWOT analysis' },
      { status: 500 }
    )
  }
}

// Helper function to generate market analysis
async function generateMarketAnalysis(
  supabase: DbClient,
  category: string,
  location: string | null,
  periodDays: number
) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - periodDays)
  
  // Build location filter
  let query = supabase
    .from('businesses')
    .select('*')
    .contains('categories', [category])
  
  if (location) {
    query = query.ilike('address->city', `%${location}%`)
  }
  
  const { data: businesses } = await query
  
  if (!businesses || businesses.length === 0) {
    return {
      category,
      location: location ? { city: location } : null,
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      total_businesses: 0,
      trends: {},
      opportunities: [],
      threats: []
    }
  }
  
  // Calculate metrics
  const totalBusinesses = businesses.length
  const averageRating = businesses.reduce((sum, b: any) => sum + (b.rating || 0), 0) / totalBusinesses
  const averageReviews = businesses.reduce((sum, b: any) => sum + (b.review_count || 0), 0) / totalBusinesses

  // Identify top performers
  const topBusinesses = businesses
    .sort((a: any, b: any) => {
      const scoreA = (a.rating || 0) * Math.log10((a.review_count || 0) + 1)
      const scoreB = (b.rating || 0) * Math.log10((b.review_count || 0) + 1)
      return scoreB - scoreA
    })
    .slice(0, 5)
    .map((b: any) => ({
      id: b.id,
      name: b.name,
      rating: b.rating,
      review_count: b.review_count,
      score: (b.rating || 0) * Math.log10((b.review_count || 0) + 1)
    }))
  
  // Identify emerging businesses (created recently with good ratings)
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - 90)
  
  const emergingBusinesses = businesses
    .filter((b: any) => new Date(b.created_at) > recentDate && (b.rating || 0) >= 4.0)
    .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5)
    .map((b: any) => ({
      id: b.id,
      name: b.name,
      rating: b.rating,
      days_old: Math.floor((Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24))
    }))

  // Identify declining businesses (low ratings or few reviews)
  const decliningBusinesses = businesses
    .filter((b: any) => (b.rating || 0) < 3.5 || (b.review_count || 0) < 10)
    .slice(0, 5)
    .map((b: any) => ({
      id: b.id,
      name: b.name,
      rating: b.rating,
      review_count: b.review_count
    }))
  
  // Generate trends
  const trends = {
    market_saturation: totalBusinesses > 50 ? 'high' : totalBusinesses > 20 ? 'medium' : 'low',
    quality_level: averageRating >= 4.0 ? 'high' : averageRating >= 3.5 ? 'medium' : 'low',
    engagement_level: averageReviews > 100 ? 'high' : averageReviews > 50 ? 'medium' : 'low',
    growth_potential: emergingBusinesses.length > 3 ? 'high' : 'medium'
  }
  
  // Generate opportunities
  const opportunities = []
  if (trends.market_saturation === 'low') {
    opportunities.push('Low market saturation presents entry opportunities')
  }
  if (trends.quality_level === 'low') {
    opportunities.push('Quality gap in market can be exploited')
  }
  if (decliningBusinesses.length > 3) {
    opportunities.push('Multiple competitors showing weakness')
  }
  if (trends.engagement_level === 'high') {
    opportunities.push('High customer engagement indicates strong demand')
  }
  
  // Generate threats
  const threats = []
  if (trends.market_saturation === 'high') {
    threats.push('High competition in saturated market')
  }
  if (topBusinesses.some(b => b.score > 20)) {
    threats.push('Dominant market leaders present')
  }
  if (emergingBusinesses.length > 3) {
    threats.push('New competitors entering market rapidly')
  }
  
  return {
    category,
    location: location ? { city: location } : null,
    period_start: startDate.toISOString().split('T')[0],
    period_end: endDate.toISOString().split('T')[0],
    total_businesses: totalBusinesses,
    average_rating: parseFloat(averageRating.toFixed(2)),
    average_reviews: Math.round(averageReviews),
    market_growth_rate: calculateGrowthRate(businesses, periodDays),
    top_businesses: topBusinesses,
    emerging_businesses: emergingBusinesses,
    declining_businesses: decliningBusinesses,
    trends,
    opportunities,
    threats
  }
}

// Helper function to generate SWOT analysis
interface BusinessSWOT {
  id: string
  rating?: number
  review_count?: number
  verified?: boolean
  website?: string
  categories?: string[]
  description?: string
  photos?: unknown[]
  created_at: string
}

async function generateSWOTAnalysis(supabase: DbClient, business: BusinessSWOT) {
  const strengths = []
  const weaknesses = []
  const opportunities = []
  const threats = []
  
  // Analyze strengths
  const businessData = business as any;
  if (businessData.rating >= 4.5) {
    strengths.push('Exceptional customer satisfaction ratings')
  }
  if (businessData.rating >= 4.0) {
    strengths.push('Strong customer ratings')
  }
  if (businessData.review_count > 200) {
    strengths.push('Large customer base with high review volume')
  } else if (businessData.review_count > 100) {
    strengths.push('Good review volume indicating customer engagement')
  }
  if (businessData.verified) {
    strengths.push('Verified business status builds trust')
  }
  if (businessData.website) {
    strengths.push('Established online presence')
  }
  if (businessData.categories?.length > 2) {
    strengths.push('Diverse service offerings')
  }

  // Analyze weaknesses
  if (businessData.rating < 3.5) {
    weaknesses.push('Below average customer ratings')
  }
  if (businessData.review_count < 20) {
    weaknesses.push('Limited customer reviews and social proof')
  }
  if (!business.website) {
    weaknesses.push('No website presence')
  }
  if (!business.description) {
    weaknesses.push('Lacks detailed business description')
  }
  if (!business.photos || business.photos.length === 0) {
    weaknesses.push('No visual content to attract customers')
  }
  
  // Fetch market context for opportunities and threats
  const { data: competitors } = await supabase
    .from('businesses')
    .select('rating, review_count')
    .contains('categories', business.categories?.[0] ? [business.categories[0]] : [])
    .neq('id', business.id)
    .limit(20)
  
  if (competitors && competitors.length > 0) {
    const avgCompetitorRating = competitors.reduce((sum, c: any) => sum + (c.rating || 0), 0) / competitors.length
    const avgCompetitorReviews = competitors.reduce((sum, c: any) => sum + (c.review_count || 0), 0) / competitors.length

    // Opportunities based on market position
    if ((businessData.rating || 0) > avgCompetitorRating) {
      opportunities.push('Above-average ratings provide competitive advantage')
    }
    if (avgCompetitorRating < 3.8) {
      opportunities.push('Overall market quality is low, opportunity to differentiate')
    }
    if (avgCompetitorReviews < 50) {
      opportunities.push('Low market engagement presents growth opportunity')
    }

    // Threats based on competition
    if ((businessData.rating || 0) < avgCompetitorRating) {
      threats.push('Below market average in customer satisfaction')
    }
    if (competitors.some((c: any) => c.rating >= 4.8)) {
      threats.push('Highly-rated competitors in market')
    }
    if (competitors.length > 15) {
      threats.push('Highly competitive market with many alternatives')
    }
  }
  
  // General opportunities
  opportunities.push('Expand digital marketing presence')
  opportunities.push('Implement customer loyalty programs')
  if (business.categories?.length === 1) {
    opportunities.push('Diversify service offerings')
  }
  
  // General threats
  threats.push('Economic downturn affecting customer spending')
  threats.push('Changing customer preferences and expectations')
  
  return {
    strengths,
    weaknesses,
    opportunities,
    threats
  }
}

// Helper function to calculate growth rate
function calculateGrowthRate(businesses: BusinessSWOT[], periodDays: number): number {
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - periodDays)
  
  const newBusinesses = businesses.filter(
    b => new Date(b.created_at) > recentDate
  ).length
  
  const growthRate = (newBusinesses / businesses.length) * 100
  return parseFloat(growthRate.toFixed(2))
}