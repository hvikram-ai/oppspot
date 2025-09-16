import { createClient } from '@/lib/supabase/server'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'

interface MetricData {
  category: string
  locationId?: string
  metricType: string
  value: number
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  metadata?: Record<string, any>
}

export class DataCollector {
  private supabase: any

  constructor() {
    this.initSupabase()
  }

  private async initSupabase() {
    this.supabase = await createClient()
  }

  // Collect market metrics from various sources
  async collectMarketMetrics(category: string, locationId?: string) {
    try {
      const metrics: MetricData[] = []
      
      // Collect business count
      const businessCount = await this.getBusinessCount(category, locationId)
      metrics.push({
        category,
        locationId,
        metricType: 'business_count',
        value: businessCount,
        period: 'daily'
      })

      // Collect average rating
      const avgRating = await this.getAverageRating(category, locationId)
      metrics.push({
        category,
        locationId,
        metricType: 'avg_rating',
        value: avgRating,
        period: 'daily'
      })

      // Collect review volume
      const reviewVolume = await this.getReviewVolume(category, locationId)
      metrics.push({
        category,
        locationId,
        metricType: 'review_volume',
        value: reviewVolume,
        period: 'daily'
      })

      // Calculate growth rate
      const growthRate = await this.calculateGrowthRate(category, locationId)
      metrics.push({
        category,
        locationId,
        metricType: 'growth_rate',
        value: growthRate,
        period: 'monthly'
      })

      // Calculate market saturation
      const saturation = await this.calculateMarketSaturation(category, locationId)
      metrics.push({
        category,
        locationId,
        metricType: 'market_saturation',
        value: saturation,
        period: 'weekly'
      })

      // Calculate demand index
      const demandIndex = await this.calculateDemandIndex(category, locationId)
      metrics.push({
        category,
        locationId,
        metricType: 'demand_index',
        value: demandIndex,
        period: 'daily'
      })

      // Store metrics
      await this.storeMetrics(metrics)

      return metrics
    } catch (error) {
      console.error('Error collecting market metrics:', error)
      throw error
    }
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
    
    const sum = data.reduce((acc: number, b: any) => acc + (b.rating || 0), 0)
    return sum / data.length
  }

  private async getReviewVolume(category: string, locationId?: string): Promise<number> {
    const query = this.supabase
      .from('businesses')
      .select('review_count')
      .eq('category', category)

    if (locationId) {
      query.eq('location_id', locationId)
    }

    const { data } = await query
    
    if (!data || data.length === 0) return 0
    
    return data.reduce((acc: number, b: any) => acc + (b.review_count || 0), 0)
  }

  private async calculateGrowthRate(category: string, locationId?: string): Promise<number> {
    // Get current month count
    const currentMonthStart = startOfDay(new Date())
    currentMonthStart.setDate(1)
    
    const lastMonthStart = new Date(currentMonthStart)
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
    
    const currentQuery = this.supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('category', category)
      .gte('created_at', currentMonthStart.toISOString())

    const lastQuery = this.supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('category', category)
      .gte('created_at', lastMonthStart.toISOString())
      .lt('created_at', currentMonthStart.toISOString())

    if (locationId) {
      currentQuery.eq('location_id', locationId)
      lastQuery.eq('location_id', locationId)
    }

    const [{ count: currentCount }, { count: lastCount }] = await Promise.all([
      currentQuery,
      lastQuery
    ])

    if (!lastCount || lastCount === 0) return 0
    
    return ((currentCount || 0) - lastCount) / lastCount * 100
  }

  private async calculateMarketSaturation(category: string, locationId?: string): Promise<number> {
    // Simplified saturation calculation
    // In reality, this would consider population, demand, etc.
    const businessCount = await this.getBusinessCount(category, locationId)
    
    // Assume max capacity is 100 businesses per category/location
    const maxCapacity = 100
    return Math.min(businessCount / maxCapacity, 1)
  }

  private async calculateDemandIndex(category: string, locationId?: string): Promise<number> {
    // Calculate demand based on review activity and search volume
    const recentDays = 30
    const startDate = subDays(new Date(), recentDays)
    
    // Get recent review activity
    const query = this.supabase
      .from('businesses')
      .select('review_count, updated_at')
      .eq('category', category)
      .gte('updated_at', startDate.toISOString())

    if (locationId) {
      query.eq('location_id', locationId)
    }

    const { data } = await query
    
    if (!data || data.length === 0) return 0.5 // Default medium demand
    
    // Simple demand calculation based on review activity
    const totalReviews = data.reduce((acc: number, b: any) => acc + (b.review_count || 0), 0)
    const avgReviewsPerBusiness = totalReviews / data.length
    
    // Normalize to 0-1 scale (assuming 100 reviews/business/month is high demand)
    return Math.min(avgReviewsPerBusiness / 100, 1)
  }

  private async storeMetrics(metrics: MetricData[]) {
    const today = format(new Date(), 'yyyy-MM-dd')
    
    const records = metrics.map(m => ({
      category: m.category,
      location_id: m.locationId,
      metric_date: today,
      metric_type: m.metricType,
      value: m.value,
      period: m.period,
      metadata: m.metadata || {}
    }))

    // Upsert metrics (update if exists, insert if not)
    for (const record of records) {
      await this.supabase
        .from('market_metrics')
        .upsert(record, {
          onConflict: 'category,location_id,metric_date,metric_type,period'
        })
    }
  }

  // Collect competitive signals
  async collectMarketSignals(category: string, locationId?: string) {
    const signals = []
    
    // Check for new competitors
    const newCompetitors = await this.detectNewCompetitors(category, locationId)
    if (newCompetitors.length > 0) {
      signals.push({
        signal_type: 'new_competitor',
        category,
        location_id: locationId,
        signal_strength: 0.8,
        impact_score: 0.7,
        data: { competitors: newCompetitors }
      })
    }

    // Check for rating shifts
    const ratingShifts = await this.detectRatingShifts(category, locationId)
    if (ratingShifts.length > 0) {
      signals.push({
        signal_type: 'rating_shift',
        category,
        location_id: locationId,
        signal_strength: 0.6,
        impact_score: 0.5,
        data: { shifts: ratingShifts }
      })
    }

    // Check for review surges
    const reviewSurges = await this.detectReviewSurges(category, locationId)
    if (reviewSurges.length > 0) {
      signals.push({
        signal_type: 'review_surge',
        category,
        location_id: locationId,
        signal_strength: 0.5,
        impact_score: 0.4,
        data: { surges: reviewSurges }
      })
    }

    // Store signals
    if (signals.length > 0) {
      await this.supabase
        .from('market_signals')
        .insert(signals)
    }

    return signals
  }

  private async detectNewCompetitors(category: string, locationId?: string) {
    // Find businesses created in the last 7 days
    const sevenDaysAgo = subDays(new Date(), 7)
    
    const query = this.supabase
      .from('businesses')
      .select('id, name, created_at')
      .eq('category', category)
      .gte('created_at', sevenDaysAgo.toISOString())

    if (locationId) {
      query.eq('location_id', locationId)
    }

    const { data } = await query
    return data || []
  }

  private async detectRatingShifts(category: string, locationId?: string) {
    // Compare current ratings with historical average
    const shifts = []
    
    const query = this.supabase
      .from('businesses')
      .select('id, name, rating')
      .eq('category', category)

    if (locationId) {
      query.eq('location_id', locationId)
    }

    const { data: businesses } = await query
    
    if (!businesses) return []

    for (const business of businesses) {
      // Get historical average (simplified - would use historical data in production)
      const historicalAvg = 4.0 // Placeholder
      const currentRating = business.rating || 0
      const difference = Math.abs(currentRating - historicalAvg)
      
      if (difference > 0.5) {
        shifts.push({
          business_id: business.id,
          name: business.name,
          previous_rating: historicalAvg,
          current_rating: currentRating,
          change: currentRating - historicalAvg
        })
      }
    }
    
    return shifts
  }

  private async detectReviewSurges(category: string, locationId?: string) {
    // Detect unusual increases in review activity
    const surges = []
    
    const query = this.supabase
      .from('businesses')
      .select('id, name, review_count')
      .eq('category', category)
      .order('review_count', { ascending: false })
      .limit(10)

    if (locationId) {
      query.eq('location_id', locationId)
    }

    const { data: businesses } = await query
    
    if (!businesses) return []

    // Simple surge detection - businesses with high review counts
    for (const business of businesses) {
      if (business.review_count > 100) {
        surges.push({
          business_id: business.id,
          name: business.name,
          review_count: business.review_count
        })
      }
    }
    
    return surges
  }

  // Preprocess data for analysis
  async preprocessDataForAnalysis(
    category: string,
    locationId?: string,
    days: number = 90
  ) {
    const startDate = subDays(new Date(), days)
    
    // Get historical metrics
    const query = this.supabase
      .from('market_metrics')
      .select('*')
      .eq('category', category)
      .gte('metric_date', startDate.toISOString())
      .order('metric_date', { ascending: true })

    if (locationId) {
      query.eq('location_id', locationId)
    }

    const { data: metrics } = await query
    
    if (!metrics || metrics.length === 0) {
      return null
    }

    // Group metrics by type
    const groupedMetrics: Record<string, unknown[]> = {}
    
    for (const metric of metrics) {
      if (!groupedMetrics[metric.metric_type]) {
        groupedMetrics[metric.metric_type] = []
      }
      groupedMetrics[metric.metric_type].push({
        date: metric.metric_date,
        value: metric.value
      })
    }

    // Calculate statistical features
    const features: Record<string, any> = {}
    
    for (const [metricType, values] of Object.entries(groupedMetrics)) {
      const nums = values.map(v => v.value)
      features[metricType] = {
        mean: this.calculateMean(nums),
        std: this.calculateStd(nums),
        min: Math.min(...nums),
        max: Math.max(...nums),
        trend: this.calculateTrend(values),
        volatility: this.calculateVolatility(nums)
      }
    }

    return {
      category,
      locationId,
      period: { start: startDate, end: new Date() },
      metrics: groupedMetrics,
      features
    }
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  private calculateStd(values: number[]): number {
    if (values.length === 0) return 0
    const mean = this.calculateMean(values)
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const variance = this.calculateMean(squaredDiffs)
    return Math.sqrt(variance)
  }

  private calculateTrend(timeSeries: Array<{ date: string; value: number }>): number {
    if (timeSeries.length < 2) return 0
    
    // Simple linear regression slope
    const n = timeSeries.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = timeSeries.map(t => t.value)
    
    const xMean = this.calculateMean(x)
    const yMean = this.calculateMean(y)
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean)
      denominator += Math.pow(x[i] - xMean, 2)
    }
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0
    
    // Calculate daily returns
    const returns = []
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / values[i - 1])
      }
    }
    
    return this.calculateStd(returns)
  }
}