import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

type DbClient = SupabaseClient<Database>
import { subDays, format } from 'date-fns'
import type { Row } from '@/lib/supabase/helpers'

interface TrendAnalysis {
  entityType: 'market' | 'category' | 'location' | 'business'
  entityId: string
  trendDirection: 'rising' | 'falling' | 'stable' | 'volatile'
  trendStrength: number // 0-1
  confidenceScore: number // 0-1
  periodDays: number
  metrics: Record<string, unknown>
  predictions: Record<string, unknown>
  insights: string[]
}

interface TimeSeriesData {
  date: string
  value: number
}

export class TrendAnalyzer {
  private supabase: DbClient | null = null

  constructor() {
    this.initSupabase()
  }

  private async initSupabase() {
    this.supabase = await createClient()
  }

  // Analyze trends for a specific entity
  async analyzeTrends(
    entityType: TrendAnalysis['entityType'],
    entityId: string,
    periodDays: number = 30
  ): Promise<TrendAnalysis> {
    try {
      // Get historical data
      const data = await this.getHistoricalData(entityType, entityId, periodDays)
      
      if (!data || data.length === 0) {
        return this.createEmptyAnalysis(entityType, entityId, periodDays)
      }

      // Perform various trend analyses
      const movingAverage = this.calculateMovingAverage(data, 7)
      const trendLine = this.calculateTrendLine(data)
      const volatility = this.calculateVolatility(data)
      const momentum = this.calculateMomentum(data)
      const seasonality = this.detectSeasonality(data)
      
      // Determine trend direction and strength
      const { direction, strength } = this.determineTrendDirection(trendLine, momentum, volatility)
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidence(data.length, volatility, trendLine.r2)
      
      // Generate predictions
      const predictions = this.generatePredictions(data, trendLine, seasonality)
      
      // Generate insights
      const insights = this.generateInsights(
        direction,
        strength,
        volatility,
        momentum,
        seasonality,
        predictions
      )
      
      const analysis: TrendAnalysis = {
        entityType,
        entityId,
        trendDirection: direction,
        trendStrength: strength,
        confidenceScore,
        periodDays,
        metrics: {
          movingAverage: movingAverage[movingAverage.length - 1]?.value || 0,
          trendSlope: trendLine.slope,
          volatility,
          momentum,
          seasonality,
          dataPoints: data.length
        },
        predictions,
        insights
      }

      // Store analysis
      await this.storeAnalysis(analysis)
      
      return analysis
    } catch (error) {
      console.error('Error analyzing trends:', error)
      throw error
    }
  }

  private async getHistoricalData(
    entityType: string,
    entityId: string,
    periodDays: number
  ): Promise<TimeSeriesData[]> {
    const startDate = subDays(new Date(), periodDays)
    
    let data: TimeSeriesData[] = []
    
    if (entityType === 'category' || entityType === 'market') {
      const { data: metrics } = await this.supabase
        .from('market_metrics')
        .select('metric_date, value')
        .eq('category', entityId)
        .eq('metric_type', 'avg_rating')
        .gte('metric_date', startDate.toISOString())
        .order('metric_date', { ascending: true })
      
      data = metrics?.map((m: Record<string, unknown>) => ({
        date: m.metric_date,
        value: parseFloat(m.value)
      })) || []
    } else if (entityType === 'business') {
      // For businesses, we'd track rating changes over time
      // This would require a historical tracking table
      const { data: business } = await this.supabase
        .from('businesses')
        .select('rating, review_count')
        .eq('id', entityId)
        .single() as { data: (Row<'businesses'> & { rating?: number; review_count?: number }) | null; error: any }

      if (business && business.rating) {
        // Generate synthetic historical data for demonstration
        data = this.generateSyntheticData(business.rating, periodDays)
      }
    }
    
    return data
  }

  private generateSyntheticData(currentValue: number, days: number): TimeSeriesData[] {
    const data: TimeSeriesData[] = []
    let value = currentValue * 0.9 // Start 10% lower
    
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      // Add some random variation
      value = value + (Math.random() - 0.5) * 0.1
      value = Math.max(0, Math.min(5, value)) // Keep between 0-5
      
      data.push({ date, value })
    }
    
    return data
  }

  private calculateMovingAverage(
    data: TimeSeriesData[],
    window: number
  ): TimeSeriesData[] {
    const result: TimeSeriesData[] = []
    
    for (let i = window - 1; i < data.length; i++) {
      const windowData = data.slice(i - window + 1, i + 1)
      const avg = windowData.reduce((sum, d) => sum + d.value, 0) / window
      result.push({
        date: data[i].date,
        value: avg
      })
    }
    
    return result
  }

  private calculateTrendLine(data: TimeSeriesData[]) {
    const n = data.length
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 }
    
    // Convert dates to numeric x values (days from start)
    const startDate = new Date(data[0].date)
    const x = data.map(d => 
      (new Date(d.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const y = data.map(d => d.value)
    
    // Calculate means
    const xMean = x.reduce((a, b) => a + b, 0) / n
    const yMean = y.reduce((a, b) => a + b, 0) / n
    
    // Calculate slope and intercept
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean)
      denominator += Math.pow(x[i] - xMean, 2)
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator
    const intercept = yMean - slope * xMean
    
    // Calculate R-squared
    let ssRes = 0
    let ssTot = 0
    
    for (let i = 0; i < n; i++) {
      const yPred = slope * x[i] + intercept
      ssRes += Math.pow(y[i] - yPred, 2)
      ssTot += Math.pow(y[i] - yMean, 2)
    }
    
    const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot)
    
    return { slope, intercept, r2 }
  }

  private calculateVolatility(data: TimeSeriesData[]): number {
    if (data.length < 2) return 0
    
    const returns: number[] = []
    for (let i = 1; i < data.length; i++) {
      if (data[i - 1].value !== 0) {
        const return_ = (data[i].value - data[i - 1].value) / data[i - 1].value
        returns.push(return_)
      }
    }
    
    if (returns.length === 0) return 0
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance)
  }

  private calculateMomentum(data: TimeSeriesData[]): number {
    if (data.length < 10) return 0
    
    // Rate of change over last 10 periods
    const recentValue = data[data.length - 1].value
    const pastValue = data[data.length - 10].value
    
    if (pastValue === 0) return 0
    
    return (recentValue - pastValue) / pastValue
  }

  private detectSeasonality(data: TimeSeriesData[]): Record<string, unknown> {
    // Simple seasonality detection
    // In production, would use FFT or more sophisticated methods
    
    if (data.length < 30) {
      return { hasSeasonality: false }
    }
    
    // Check for weekly patterns (7-day cycle)
    const weeklyPattern = this.checkCyclicalPattern(data, 7)
    
    // Check for monthly patterns (30-day cycle)
    const monthlyPattern = this.checkCyclicalPattern(data, 30)
    
    return {
      hasSeasonality: weeklyPattern.strength > 0.5 || monthlyPattern.strength > 0.5,
      weekly: weeklyPattern,
      monthly: monthlyPattern
    }
  }

  private checkCyclicalPattern(data: TimeSeriesData[], period: number) {
    if (data.length < period * 2) {
      return { exists: false, strength: 0 }
    }
    
    // Compare values at same position in cycle
    let matches = 0
    let comparisons = 0
    
    for (let i = period; i < data.length; i++) {
      const current = data[i].value
      const previous = data[i - period].value
      
      if (Math.abs(current - previous) < 0.2) {
        matches++
      }
      comparisons++
    }
    
    const strength = comparisons > 0 ? matches / comparisons : 0
    
    return {
      exists: strength > 0.5,
      strength,
      period
    }
  }

  private determineTrendDirection(
    trendLine: { slope: number; r2: number },
    momentum: number,
    volatility: number
  ): { direction: TrendAnalysis['trendDirection']; strength: number } {
    // High volatility indicates unstable trend
    if (volatility > 0.3) {
      return { direction: 'volatile', strength: volatility }
    }
    
    // Check slope significance
    const slopeThreshold = 0.01
    
    if (Math.abs(trendLine.slope) < slopeThreshold) {
      return { direction: 'stable', strength: 0.5 }
    }
    
    if (trendLine.slope > 0) {
      const strength = Math.min(Math.abs(trendLine.slope) * 10, 1)
      return { direction: 'rising', strength }
    } else {
      const strength = Math.min(Math.abs(trendLine.slope) * 10, 1)
      return { direction: 'falling', strength }
    }
  }

  private calculateConfidence(
    dataPoints: number,
    volatility: number,
    r2: number
  ): number {
    // More data points = higher confidence
    const dataScore = Math.min(dataPoints / 30, 1) * 0.3
    
    // Lower volatility = higher confidence
    const volatilityScore = (1 - Math.min(volatility, 1)) * 0.3
    
    // Higher R-squared = higher confidence
    const fitScore = r2 * 0.4
    
    return dataScore + volatilityScore + fitScore
  }

  private generatePredictions(
    data: TimeSeriesData[],
    trendLine: { slope: number; intercept: number },
    seasonality: Record<string, unknown>
  ): Record<string, unknown> {
    const lastValue = data[data.length - 1]?.value || 0
    const daysAhead = [1, 7, 30]
    const predictions: Record<string, unknown> = {}
    
    for (const days of daysAhead) {
      // Linear prediction
      const linearPrediction = lastValue + (trendLine.slope * days)
      
      // Add seasonal adjustment if applicable
      let seasonalAdjustment = 0
      if (seasonality.hasSeasonality && (seasonality.weekly as any).exists && days >= 7) {
        seasonalAdjustment = (Math.random() - 0.5) * 0.1 // Simplified
      }
      
      predictions[`${days}d`] = {
        value: Math.max(0, Math.min(5, linearPrediction + seasonalAdjustment)),
        confidence: this.calculatePredictionConfidence(days, data.length)
      }
    }
    
    return predictions
  }

  private calculatePredictionConfidence(daysAhead: number, dataPoints: number): number {
    // Confidence decreases with prediction horizon
    const horizonFactor = Math.exp(-daysAhead / 30)
    
    // More historical data improves confidence
    const dataFactor = Math.min(dataPoints / 90, 1)
    
    return horizonFactor * 0.7 + dataFactor * 0.3
  }

  private generateInsights(
    direction: TrendAnalysis['trendDirection'],
    strength: number,
    volatility: number,
    momentum: number,
    seasonality: Record<string, unknown>,
    predictions: Record<string, unknown>
  ): string[] {
    const insights: string[] = []
    
    // Trend insight
    if (direction === 'rising' && strength > 0.7) {
      insights.push('Strong upward trend detected with high confidence')
    } else if (direction === 'falling' && strength > 0.7) {
      insights.push('Significant downward trend requiring attention')
    } else if (direction === 'volatile') {
      insights.push('High volatility detected - market conditions are unstable')
    } else if (direction === 'stable') {
      insights.push('Market showing stable conditions with minimal change')
    }
    
    // Momentum insight
    if (momentum > 0.2) {
      insights.push('Positive momentum indicates accelerating growth')
    } else if (momentum < -0.2) {
      insights.push('Negative momentum suggests declining performance')
    }
    
    // Volatility insight
    if (volatility > 0.2) {
      insights.push('High volatility may present both risks and opportunities')
    } else if (volatility < 0.05) {
      insights.push('Low volatility indicates predictable market behavior')
    }
    
    // Seasonality insight
    if (seasonality.hasSeasonality) {
      if ((seasonality.weekly as any).exists) {
        insights.push(`Weekly patterns detected with ${((seasonality.weekly as any).strength * 100).toFixed(0)}% consistency`)
      }
      if ((seasonality.monthly as any).exists) {
        insights.push(`Monthly cyclical patterns observed in the data`)
      }
    }
    
    // Prediction insight
    const next7d = predictions['7d'] as { confidence?: number; value?: number } | undefined
    const next1d = predictions['1d'] as { value?: number } | undefined
    if (next7d && next7d.confidence && next7d.confidence > 0.7 && next7d.value && next1d?.value) {
      const change = ((next7d.value - next1d.value) / next1d.value * 100).toFixed(1)
      insights.push(`7-day forecast shows ${change}% expected change`)
    }
    
    return insights
  }

  private createEmptyAnalysis(
    entityType: TrendAnalysis['entityType'],
    entityId: string,
    periodDays: number
  ): TrendAnalysis {
    return {
      entityType,
      entityId,
      trendDirection: 'stable',
      trendStrength: 0,
      confidenceScore: 0,
      periodDays,
      metrics: {},
      predictions: {},
      insights: ['Insufficient data for trend analysis']
    }
  }

  private async storeAnalysis(analysis: TrendAnalysis) {
    const record = {
      entity_type: analysis.entityType,
      entity_id: analysis.entityId,
      analysis_date: format(new Date(), 'yyyy-MM-dd'),
      trend_direction: analysis.trendDirection,
      trend_strength: analysis.trendStrength,
      confidence_score: analysis.confidenceScore,
      period_days: analysis.periodDays,
      metrics: analysis.metrics,
      predictions: analysis.predictions,
      insights: analysis.insights
    }

    await this.supabase
      .from('trend_analysis')
      // @ts-ignore - Supabase type inference issue
      .upsert(record, {
        onConflict: 'entity_type,entity_id,analysis_date,period_days'
      })
  }

  // Batch analyze multiple entities
  async batchAnalyze(
    entities: Array<{ type: TrendAnalysis['entityType']; id: string }>,
    periodDays: number = 30
  ): Promise<TrendAnalysis[]> {
    const analyses = await Promise.all(
      entities.map(e => this.analyzeTrends(e.type, e.id, periodDays))
    )
    
    return analyses
  }
}