import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'
import type { Row } from '@/lib/supabase/helpers'

type DbClient = SupabaseClient<Database>

// Business data interface for market analysis
interface BusinessData {
  id: string;
  name: string;
  rating?: number | null;
  review_count?: number | null;
  categories?: string[] | null;
  created_at: string;
  address?: Record<string, unknown> | null;
  verified?: boolean | null;
  website?: string | null;
  description?: string | null;
  photos?: unknown[] | null;
}

interface CompetitorData {
  rating?: number | null;
  review_count?: number | null;
}

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
    
    const { data: existingAnalysis, error: existingAnalysisError } = await supabase
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

    const businessData = business as unknown as BusinessData;

    // Generate SWOT analysis
    const swot = await generateSWOTAnalysis(supabase, businessData)

    // Save SWOT analysis
    const { data: savedSwot, error: saveError } = await supabase
      .from('swot_analysis')
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
  
  const { data: businesses, error: businessesError } = await query

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

  const typedBusinesses = businesses as unknown as BusinessData[];

  // Calculate metrics
  const totalBusinesses = typedBusinesses.length
  const averageRating = typedBusinesses.reduce((sum, b) => sum + (b.rating || 0), 0) / totalBusinesses
  const averageReviews = typedBusinesses.reduce((sum, b) => sum + (b.review_count || 0), 0) / totalBusinesses

  // Identify top performers
  const topBusinesses = typedBusinesses
    .sort((a, b) => {
      const scoreA = (a.rating || 0) * Math.log10((a.review_count || 0) + 1)
      const scoreB = (b.rating || 0) * Math.log10((b.review_count || 0) + 1)
      return scoreB - scoreA
    })
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      name: b.name,
      rating: b.rating || null,
      review_count: b.review_count || null,
      score: (b.rating || 0) * Math.log10((b.review_count || 0) + 1)
    }))

  // Identify emerging businesses (created recently with good ratings)
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - 90)

  const emergingBusinesses = typedBusinesses
    .filter((b) => new Date(b.created_at) > recentDate && (b.rating || 0) >= 4.0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      name: b.name,
      rating: b.rating || null,
      days_old: Math.floor((Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24))
    }))

  // Identify declining businesses (low ratings or few reviews)
  const decliningBusinesses = typedBusinesses
    .filter((b) => (b.rating || 0) < 3.5 || (b.review_count || 0) < 10)
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      name: b.name,
      rating: b.rating || null,
      review_count: b.review_count || null
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
    market_growth_rate: calculateGrowthRate(typedBusinesses, periodDays),
    top_businesses: topBusinesses,
    emerging_businesses: emergingBusinesses,
    declining_businesses: decliningBusinesses,
    trends,
    opportunities,
    threats
  }
}

// Helper function to generate SWOT analysis
async function generateSWOTAnalysis(supabase: DbClient, business: BusinessData) {
  const strengths: string[] = []
  const weaknesses: string[] = []
  const opportunities: string[] = []
  const threats: string[] = []

  // Analyze strengths
  if ((business.rating || 0) >= 4.5) {
    strengths.push('Exceptional customer satisfaction ratings')
  }
  if ((business.rating || 0) >= 4.0) {
    strengths.push('Strong customer ratings')
  }
  if ((business.review_count || 0) > 200) {
    strengths.push('Large customer base with high review volume')
  } else if ((business.review_count || 0) > 100) {
    strengths.push('Good review volume indicating customer engagement')
  }
  if (business.verified) {
    strengths.push('Verified business status builds trust')
  }
  if (business.website) {
    strengths.push('Established online presence')
  }
  if ((business.categories?.length || 0) > 2) {
    strengths.push('Diverse service offerings')
  }

  // Analyze weaknesses
  if ((business.rating || 0) < 3.5) {
    weaknesses.push('Below average customer ratings')
  }
  if ((business.review_count || 0) < 20) {
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
  const { data: competitors, error: competitorsError } = await supabase
    .from('businesses')
    .select('rating, review_count')
    .contains('categories', business.categories?.[0] ? [business.categories[0]] : [])
    .neq('id', business.id)
    .limit(20)
  
  if (competitors && competitors.length > 0) {
    const typedCompetitors = competitors as unknown as CompetitorData[];
    const avgCompetitorRating = typedCompetitors.reduce((sum, c) => sum + (c.rating || 0), 0) / typedCompetitors.length
    const avgCompetitorReviews = typedCompetitors.reduce((sum, c) => sum + (c.review_count || 0), 0) / typedCompetitors.length

    // Opportunities based on market position
    if ((business.rating || 0) > avgCompetitorRating) {
      opportunities.push('Above-average ratings provide competitive advantage')
    }
    if (avgCompetitorRating < 3.8) {
      opportunities.push('Overall market quality is low, opportunity to differentiate')
    }
    if (avgCompetitorReviews < 50) {
      opportunities.push('Low market engagement presents growth opportunity')
    }

    // Threats based on competition
    if ((business.rating || 0) < avgCompetitorRating) {
      threats.push('Below market average in customer satisfaction')
    }
    if (typedCompetitors.some((c) => (c.rating || 0) >= 4.8)) {
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
function calculateGrowthRate(businesses: BusinessData[], periodDays: number): number {
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - periodDays)
  
  const newBusinesses = businesses.filter(
    b => new Date(b.created_at) > recentDate
  ).length
  
  const growthRate = (newBusinesses / businesses.length) * 100
  return parseFloat(growthRate.toFixed(2))
}