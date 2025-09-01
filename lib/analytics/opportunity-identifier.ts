import { createClient } from '@/lib/supabase/server'
import { format, addDays } from 'date-fns'

interface Opportunity {
  type: 'underserved_market' | 'gap_in_service' | 'emerging_trend' | 
        'competitor_weakness' | 'seasonal_opportunity' | 'demographic_shift' | 'regulatory_change'
  category: string
  locationId?: string
  opportunityScore: number // 0-1
  potentialValue: number
  timeWindowStart: string
  timeWindowEnd: string
  confidenceScore: number // 0-1
  description: string
  evidence: Record<string, any>
  recommendedActions: string[]
  riskFactors: string[]
}

interface MarketGap {
  type: string
  severity: number
  evidence: string[]
}

export class OpportunityIdentifier {
  private supabase: any

  constructor() {
    this.initSupabase()
  }

  private async initSupabase() {
    this.supabase = await createClient()
  }

  // Identify opportunities in a market
  async identifyOpportunities(
    category: string,
    locationId?: string
  ): Promise<Opportunity[]> {
    try {
      const opportunities: Opportunity[] = []
      
      // Check for underserved markets
      const underserved = await this.findUnderservedMarkets(category, locationId)
      opportunities.push(...underserved)
      
      // Check for service gaps
      const serviceGaps = await this.findServiceGaps(category, locationId)
      opportunities.push(...serviceGaps)
      
      // Detect emerging trends
      const emergingTrends = await this.detectEmergingTrends(category, locationId)
      opportunities.push(...emergingTrends)
      
      // Find competitor weaknesses
      const weaknesses = await this.findCompetitorWeaknesses(category, locationId)
      opportunities.push(...weaknesses)
      
      // Identify seasonal opportunities
      const seasonal = await this.findSeasonalOpportunities(category, locationId)
      opportunities.push(...seasonal)
      
      // Store opportunities
      await this.storeOpportunities(opportunities)
      
      // Return sorted by score
      return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore)
    } catch (error) {
      console.error('Error identifying opportunities:', error)
      throw error
    }
  }

  private async findUnderservedMarkets(
    category: string,
    locationId?: string
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = []
    
    // Get market saturation
    const { data: metrics } = await this.supabase
      .from('market_metrics')
      .select('*')
      .eq('category', category)
      .eq('metric_type', 'market_saturation')
      .order('metric_date', { ascending: false })
      .limit(1)
    
    const saturation = metrics?.[0]?.value || 0.5
    
    // Get demand index
    const { data: demandData } = await this.supabase
      .from('market_metrics')
      .select('*')
      .eq('category', category)
      .eq('metric_type', 'demand_index')
      .order('metric_date', { ascending: false })
      .limit(1)
    
    const demand = demandData?.[0]?.value || 0.5
    
    // Low saturation + high demand = underserved market
    if (saturation < 0.3 && demand > 0.6) {
      const score = (1 - saturation) * demand
      const value = this.estimatePotentialValue(category, locationId, 'underserved')
      
      opportunities.push({
        type: 'underserved_market',
        category,
        locationId,
        opportunityScore: score,
        potentialValue: value,
        timeWindowStart: format(new Date(), 'yyyy-MM-dd'),
        timeWindowEnd: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
        confidenceScore: 0.8,
        description: `${category} market shows high demand (${(demand * 100).toFixed(0)}%) but low saturation (${(saturation * 100).toFixed(0)}%), indicating significant opportunity for new entrants`,
        evidence: {
          saturation,
          demand,
          businessCount: await this.getBusinessCount(category, locationId),
          avgRating: await this.getAverageRating(category, locationId)
        },
        recommendedActions: [
          'Conduct detailed market research',
          'Identify specific customer pain points',
          'Develop differentiated value proposition',
          'Consider rapid market entry strategy'
        ],
        riskFactors: [
          'Potential rapid market saturation',
          'Unknown barriers to entry',
          'Established competitor response'
        ]
      })
    }
    
    return opportunities
  }

  private async findServiceGaps(
    category: string,
    locationId?: string
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = []
    
    // Analyze review sentiment for common complaints
    const { data: businesses } = await this.supabase
      .from('businesses')
      .select('id, name, rating, review_count')
      .eq('category', category)
      .lt('rating', 4) // Focus on lower-rated businesses
    
    if (!businesses || businesses.length === 0) {
      return opportunities
    }
    
    // Identify patterns in low ratings
    const avgRating = businesses.reduce((sum, b) => sum + (b.rating || 0), 0) / businesses.length
    
    if (avgRating < 3.5) {
      const gaps = this.analyzeServiceGaps(businesses)
      
      for (const gap of gaps) {
        const score = gap.severity * 0.7
        const value = this.estimatePotentialValue(category, locationId, 'service_gap')
        
        opportunities.push({
          type: 'gap_in_service',
          category,
          locationId,
          opportunityScore: score,
          potentialValue: value,
          timeWindowStart: format(new Date(), 'yyyy-MM-dd'),
          timeWindowEnd: format(addDays(new Date(), 60), 'yyyy-MM-dd'),
          confidenceScore: 0.7,
          description: `Service quality gap identified in ${category}: ${gap.type}`,
          evidence: {
            avgRating,
            affectedBusinesses: businesses.length,
            gap: gap.type,
            severity: gap.severity
          },
          recommendedActions: [
            `Focus on improving ${gap.type}`,
            'Differentiate through superior service quality',
            'Implement customer feedback systems',
            'Train staff on identified weak points'
          ],
          riskFactors: [
            'Customer acquisition costs',
            'Service delivery consistency',
            'Competitive response'
          ]
        })
      }
    }
    
    return opportunities
  }

  private analyzeServiceGaps(businesses: any[]): MarketGap[] {
    const gaps: MarketGap[] = []
    
    // Simplified gap analysis based on rating distribution
    const lowRatedCount = businesses.filter(b => b.rating < 3).length
    const percentage = lowRatedCount / businesses.length
    
    if (percentage > 0.3) {
      gaps.push({
        type: 'Customer Service',
        severity: 0.8,
        evidence: [`${(percentage * 100).toFixed(0)}% of businesses have ratings below 3`]
      })
    }
    
    if (businesses.some(b => b.review_count < 10)) {
      gaps.push({
        type: 'Customer Engagement',
        severity: 0.6,
        evidence: ['Low review counts indicate poor customer engagement']
      })
    }
    
    return gaps
  }

  private async detectEmergingTrends(
    category: string,
    locationId?: string
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = []
    
    // Get trend analysis
    const { data: trends } = await this.supabase
      .from('trend_analysis')
      .select('*')
      .eq('entity_type', 'category')
      .eq('entity_id', category)
      .eq('trend_direction', 'rising')
      .order('trend_strength', { ascending: false })
      .limit(3)
    
    if (!trends || trends.length === 0) {
      return opportunities
    }
    
    for (const trend of trends) {
      if (trend.trend_strength > 0.6 && trend.confidence_score > 0.7) {
        const value = this.estimatePotentialValue(category, locationId, 'trend')
        
        opportunities.push({
          type: 'emerging_trend',
          category,
          locationId,
          opportunityScore: trend.trend_strength,
          potentialValue: value,
          timeWindowStart: format(new Date(), 'yyyy-MM-dd'),
          timeWindowEnd: format(addDays(new Date(), 45), 'yyyy-MM-dd'),
          confidenceScore: trend.confidence_score,
          description: `Rising trend detected in ${category} with ${(trend.trend_strength * 100).toFixed(0)}% strength`,
          evidence: {
            trendDirection: trend.trend_direction,
            trendStrength: trend.trend_strength,
            metrics: trend.metrics,
            insights: trend.insights
          },
          recommendedActions: [
            'Position for trend capture',
            'Develop trend-aligned offerings',
            'Create targeted marketing campaigns',
            'Monitor trend evolution closely'
          ],
          riskFactors: [
            'Trend reversal possibility',
            'Market timing risk',
            'Competition for trend positioning'
          ]
        })
      }
    }
    
    return opportunities
  }

  private async findCompetitorWeaknesses(
    category: string,
    locationId?: string
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = []
    
    // Find poorly performing competitors
    const query = this.supabase
      .from('businesses')
      .select('*')
      .eq('category', category)
      .lt('rating', 3.5)
      .order('review_count', { ascending: false })
      .limit(5)
    
    if (locationId) {
      query.eq('location_id', locationId)
    }
    
    const { data: weakCompetitors } = await query
    
    if (!weakCompetitors || weakCompetitors.length === 0) {
      return opportunities
    }
    
    // Analyze weaknesses
    const commonWeaknesses = this.analyzeCompetitorWeaknesses(weakCompetitors)
    
    if (commonWeaknesses.length > 0) {
      const score = 0.7
      const value = this.estimatePotentialValue(category, locationId, 'competitor_weakness')
      
      opportunities.push({
        type: 'competitor_weakness',
        category,
        locationId,
        opportunityScore: score,
        potentialValue: value,
        timeWindowStart: format(new Date(), 'yyyy-MM-dd'),
        timeWindowEnd: format(addDays(new Date(), 120), 'yyyy-MM-dd'),
        confidenceScore: 0.75,
        description: `Multiple competitors showing weaknesses in ${category}, opportunity to capture market share`,
        evidence: {
          weakCompetitorCount: weakCompetitors.length,
          avgCompetitorRating: weakCompetitors.reduce((sum, c) => sum + c.rating, 0) / weakCompetitors.length,
          weaknesses: commonWeaknesses,
          totalReviewVolume: weakCompetitors.reduce((sum, c) => sum + c.review_count, 0)
        },
        recommendedActions: [
          'Target dissatisfied customers',
          'Highlight competitive advantages',
          'Implement switching incentives',
          'Focus on identified weakness areas'
        ],
        riskFactors: [
          'Competitor improvement initiatives',
          'Customer loyalty factors',
          'Switching costs'
        ]
      })
    }
    
    return opportunities
  }

  private analyzeCompetitorWeaknesses(competitors: any[]): string[] {
    const weaknesses: string[] = []
    
    // Analyze common patterns
    const avgRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length
    
    if (avgRating < 3) {
      weaknesses.push('Poor overall service quality')
    }
    
    const lowReviewCount = competitors.filter(c => c.review_count < 50).length
    if (lowReviewCount > competitors.length / 2) {
      weaknesses.push('Low customer engagement')
    }
    
    // Check for specific category weaknesses
    if (competitors.some(c => !c.website)) {
      weaknesses.push('Limited digital presence')
    }
    
    return weaknesses
  }

  private async findSeasonalOpportunities(
    category: string,
    locationId?: string
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = []
    
    // Get seasonal patterns from demand forecasts
    const { data: forecasts } = await this.supabase
      .from('demand_forecasts')
      .select('*')
      .eq('category', category)
      .order('forecast_date', { ascending: false })
      .limit(1)
    
    if (!forecasts || forecasts.length === 0) {
      return opportunities
    }
    
    const forecast = forecasts[0]
    const seasonalFactors = forecast.factors?.seasonality
    
    if (seasonalFactors?.hasSeasonality) {
      const currentMonth = new Date().getMonth()
      const peakMonths = this.identifyPeakMonths(seasonalFactors)
      
      if (peakMonths.includes((currentMonth + 2) % 12)) {
        // Opportunity coming in 2 months
        const score = 0.6
        const value = this.estimatePotentialValue(category, locationId, 'seasonal')
        
        opportunities.push({
          type: 'seasonal_opportunity',
          category,
          locationId,
          opportunityScore: score,
          potentialValue: value,
          timeWindowStart: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
          timeWindowEnd: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
          confidenceScore: 0.7,
          description: `Seasonal peak expected in ${category} market in the coming months`,
          evidence: {
            seasonalPattern: seasonalFactors,
            peakMonths,
            expectedIncrease: '25-40%'
          },
          recommendedActions: [
            'Prepare inventory for peak season',
            'Plan seasonal marketing campaigns',
            'Hire temporary staff if needed',
            'Optimize pricing strategy'
          ],
          riskFactors: [
            'Weather dependencies',
            'Supply chain constraints',
            'Seasonal competition intensity'
          ]
        })
      }
    }
    
    return opportunities
  }

  private identifyPeakMonths(seasonalFactors: any): number[] {
    // Simplified peak month identification
    // In production, would use more sophisticated analysis
    return [11, 0] // November and December as default peak months
  }

  private async getBusinessCount(category: string, locationId?: string): Promise<number> {
    const query = this.supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('category', category)
    
    if (locationId) {
      query.eq('location_id', locationId)
    }
    
    const { count } = await query
    return count || 0
  }

  private async getAverageRating(category: string, locationId?: string): Promise<number> {
    const query = this.supabase
      .from('businesses')
      .select('rating')
      .eq('category', category)
    
    if (locationId) {
      query.eq('location_id', locationId)
    }
    
    const { data } = await query
    
    if (!data || data.length === 0) return 0
    
    return data.reduce((sum, b) => sum + (b.rating || 0), 0) / data.length
  }

  private estimatePotentialValue(
    category: string,
    locationId?: string,
    opportunityType: string
  ): number {
    // Simplified value estimation
    // In production, would use market size, revenue data, etc.
    const baseValue = 100000
    
    const multipliers: Record<string, number> = {
      underserved: 2.5,
      service_gap: 1.8,
      trend: 2.0,
      competitor_weakness: 1.5,
      seasonal: 1.3
    }
    
    return baseValue * (multipliers[opportunityType] || 1)
  }

  private async storeOpportunities(opportunities: Opportunity[]) {
    if (opportunities.length === 0) return
    
    const records = opportunities.map(opp => ({
      type: opp.type,
      category: opp.category,
      location_id: opp.locationId,
      opportunity_score: opp.opportunityScore,
      potential_value: opp.potentialValue,
      time_window_start: opp.timeWindowStart,
      time_window_end: opp.timeWindowEnd,
      confidence_score: opp.confidenceScore,
      description: opp.description,
      evidence: opp.evidence,
      recommended_actions: opp.recommendedActions,
      risk_factors: opp.riskFactors,
      status: 'active',
      expires_at: opp.timeWindowEnd
    }))
    
    await this.supabase
      .from('opportunities')
      .insert(records)
  }

  // Score a specific opportunity
  async scoreOpportunity(opportunityId: string): Promise<number> {
    const { data: opportunity } = await this.supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single()
    
    if (!opportunity) return 0
    
    // Recalculate score based on current conditions
    const timeRemaining = this.calculateTimeRemaining(opportunity.time_window_end)
    const marketConditions = await this.assessMarketConditions(
      opportunity.category,
      opportunity.location_id
    )
    
    // Weighted scoring
    const baseScore = opportunity.opportunity_score
    const timeScore = timeRemaining > 0.5 ? 1 : timeRemaining
    const marketScore = marketConditions
    
    return (baseScore * 0.5 + timeScore * 0.2 + marketScore * 0.3)
  }

  private calculateTimeRemaining(endDate: string): number {
    const now = new Date()
    const end = new Date(endDate)
    const total = end.getTime() - now.getTime()
    
    if (total <= 0) return 0
    
    const daysRemaining = total / (1000 * 60 * 60 * 24)
    return Math.min(daysRemaining / 90, 1) // Normalize to 0-1 over 90 days
  }

  private async assessMarketConditions(
    category: string,
    locationId?: string
  ): Promise<number> {
    // Get recent market metrics
    const { data: metrics } = await this.supabase
      .from('market_metrics')
      .select('*')
      .eq('category', category)
      .in('metric_type', ['growth_rate', 'demand_index'])
      .order('metric_date', { ascending: false })
      .limit(2)
    
    if (!metrics || metrics.length === 0) return 0.5
    
    const growthRate = metrics.find(m => m.metric_type === 'growth_rate')?.value || 0
    const demandIndex = metrics.find(m => m.metric_type === 'demand_index')?.value || 0.5
    
    // Combine metrics for market condition score
    const score = (Math.max(0, growthRate / 10) + demandIndex) / 2
    
    return Math.min(Math.max(score, 0), 1)
  }
}