import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

// POST: Create a business comparison
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { businessIds, comparisonType = 'quick', isPublic = false } = body
    
    if (!businessIds || businessIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 businesses required for comparison' },
        { status: 400 }
      )
    }
    
    // Fetch business data for comparison
    const { data: businesses, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .in('id', businessIds)
    
    if (fetchError) throw fetchError
    
    if (!businesses || businesses.length < 2) {
      return NextResponse.json(
        { error: 'One or more businesses not found' },
        { status: 404 }
      )
    }
    
    // Calculate comparison metrics
    const metrics = calculateComparisonMetrics(businesses)
    
    // Generate AI insights if detailed comparison
    let insights = {}
    if (comparisonType === 'detailed') {
      insights = await generateComparisonInsights(businesses)
    }
    
    // Save comparison
    const { data: comparison, error: saveError } = await supabase
      .from('business_comparisons')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        user_id: user.id,
        business_ids: businessIds,
        comparison_type: comparisonType,
        metrics,
        insights,
        is_public: isPublic
      })
      .select()
      .single()
    
    if (saveError) throw saveError
    
    // Return comparison with business details
    return NextResponse.json({
      comparison: {
        ...comparison,
        businesses
      }
    })
    
  } catch (error) {
    console.error('Comparison error:', error)
    return NextResponse.json(
      { error: 'Failed to create comparison' },
      { status: 500 }
    )
  }
}

// GET: Fetch comparisons
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const comparisonId = searchParams.get('id')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (comparisonId) {
      // Get specific comparison
      const { data: comparison, error } = await supabase
        .from('business_comparisons')
        .select('*')
        .eq('id', comparisonId)
        .single()
      
      if (error) throw error
      
      // Check access permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!comparison.is_public && comparison.user_id !== user?.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      
      // Fetch business details
      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('*')
        .in('id', comparison.business_ids)
      
      return NextResponse.json({
        comparison: {
          ...comparison,
          businesses
        }
      })
    } else {
      // Get user's comparisons
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      const { data: comparisons, error } = await supabase
        .from('business_comparisons')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      
      return NextResponse.json({ comparisons })
    }
    
  } catch (error) {
    console.error('Fetch comparisons error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparisons' },
      { status: 500 }
    )
  }
}

// Helper function to calculate comparison metrics
interface Business {
  id: string
  name?: string
  rating?: number
  review_count?: number
  categories?: string[]
  price_level?: number
  verified?: boolean
  website?: string
  description?: string
}

interface ComparisonMetrics {
  rating: Record<string, unknown>
  reviews: Record<string, unknown>
  categories: Record<string, unknown>
  pricing: Record<string, unknown>
  features: Record<string, unknown>
}

function calculateComparisonMetrics(businesses: Business[]): ComparisonMetrics {
  const metrics: ComparisonMetrics = {
    rating: {},
    reviews: {},
    categories: {},
    pricing: {},
    features: {}
  }
  
  // Rating comparison
  const ratings = businesses.map(b => b.rating || 0)
  metrics.rating = {
    highest: Math.max(...ratings),
    lowest: Math.min(...ratings),
    average: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    winner: businesses[ratings.indexOf(Math.max(...ratings))].id
  }
  
  // Review count comparison
  const reviews = businesses.map(b => b.review_count || 0)
  metrics.reviews = {
    highest: Math.max(...reviews),
    lowest: Math.min(...reviews),
    total: reviews.reduce((a, b) => a + b, 0),
    winner: businesses[reviews.indexOf(Math.max(...reviews))].id
  }
  
  // Category overlap
  const allCategories = new Set()
  businesses.forEach(b => {
    (b.categories || []).forEach((cat: string) => allCategories.add(cat))
  })
  metrics.categories = {
    total: allCategories.size,
    common: findCommonElements(businesses.map(b => b.categories || [])),
    unique: businesses.map(b => ({
      id: b.id,
      categories: (b.categories || []).filter((cat) => 
        !businesses.every(other => other.id === b.id || (other.categories || []).includes(cat))
      )
    }))
  }
  
  // Price level comparison
  const priceLevels = businesses.map(b => b.price_level).filter(p => p)
  if (priceLevels.length > 0) {
    metrics.pricing = {
      highest: Math.max(...priceLevels),
      lowest: Math.min(...priceLevels),
      average: priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length
    }
  }
  
  return metrics
}

// Helper function to find common elements
function findCommonElements(arrays: string[][]): string[] {
  if (arrays.length === 0) return []
  return arrays.reduce((common, current) => 
    common.filter(item => current.includes(item))
  )
}

// Helper function to generate AI insights
async function generateComparisonInsights(businesses: Business[]) {
  // This would integrate with your AI service
  // For now, return structured insights
  return {
    summary: `Comparing ${businesses.length} businesses in similar categories`,
    strengths: businesses.map(b => ({
      id: b.id,
      name: b.name,
      key_strengths: determineStrengths(b)
    })),
    opportunities: businesses.map(b => ({
      id: b.id,
      name: b.name,
      improvements: determineOpportunities(b)
    })),
    market_position: businesses.map(b => ({
      id: b.id,
      name: b.name,
      position: determineMarketPosition(b, businesses)
    }))
  }
}

function determineStrengths(business: Business): string[] {
  const strengths = []
  if (business.rating >= 4.5) strengths.push('Excellent customer ratings')
  if (business.review_count > 100) strengths.push('Strong review volume')
  if (business.verified) strengths.push('Verified business')
  if (business.website) strengths.push('Strong online presence')
  return strengths
}

function determineOpportunities(business: Business): string[] {
  const opportunities = []
  if (business.rating < 4.0) opportunities.push('Improve customer satisfaction')
  if (business.review_count < 50) opportunities.push('Increase review volume')
  if (!business.website) opportunities.push('Establish online presence')
  if (!business.description) opportunities.push('Add detailed description')
  return opportunities
}

function determineMarketPosition(business: Business, competitors: Business[]): string {
  const ratingRank = competitors
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .findIndex(b => b.id === business.id) + 1
  
  if (ratingRank === 1) return 'Market leader'
  if (ratingRank <= 3) return 'Top competitor'
  if (ratingRank <= competitors.length / 2) return 'Above average'
  return 'Below average'
}