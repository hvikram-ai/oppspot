import { createClient } from '@/lib/supabase/server'
import { addDays, format, subDays } from 'date-fns'

interface ForecastResult {
  category: string
  locationId?: string
  forecastDate: string
  horizonDays: number
  predictedDemand: number
  lowerBound: number
  upperBound: number
  confidenceLevel: number
  modelType: 'arima' | 'prophet' | 'lstm' | 'ensemble'
  modelAccuracy: number
  factors: Record<string, unknown>
}

interface HistoricalDemand {
  date: string
  demand: number
  factors: {
    dayOfWeek: number
    month: number
    reviewCount: number
    avgRating: number
    competitorCount: number
  }
}

export class DemandForecaster {
  private supabase: any

  constructor() {
    this.initSupabase()
  }

  private async initSupabase() {
    this.supabase = await createClient()
  }

  // Generate demand forecast
  async forecastDemand(
    category: string,
    locationId?: string,
    horizonDays: number = 30
  ): Promise<ForecastResult> {
    try {
      // Get historical demand data
      const historicalData = await this.getHistoricalDemand(category, locationId)
      
      if (!historicalData || historicalData.length < 30) {
        return this.createDefaultForecast(category, locationId, horizonDays)
      }

      // Prepare features for forecasting
      const features = this.extractFeatures(historicalData)
      
      // Run multiple forecasting models
      const arimaForecast = this.runARIMA(historicalData, horizonDays)
      const exponentialSmoothing = this.runExponentialSmoothing(historicalData, horizonDays)
      const linearRegression = this.runLinearRegression(historicalData, features, horizonDays)
      
      // Ensemble the predictions
      const ensembleForecast = this.ensembleForecasts([
        arimaForecast,
        exponentialSmoothing,
        linearRegression
      ])
      
      // Calculate prediction intervals
      const { lowerBound, upperBound } = this.calculatePredictionIntervals(
        ensembleForecast.predicted,
        historicalData
      )
      
      // Identify contributing factors
      const factors = this.identifyFactors(historicalData, features)
      
      // Calculate model accuracy using backtesting
      const accuracy = await this.backtest(historicalData, horizonDays)
      
      const forecast: ForecastResult = {
        category,
        locationId,
        forecastDate: format(new Date(), 'yyyy-MM-dd'),
        horizonDays,
        predictedDemand: ensembleForecast.predicted,
        lowerBound,
        upperBound,
        confidenceLevel: 0.95,
        modelType: 'ensemble',
        modelAccuracy: accuracy,
        factors
      }

      // Store forecast
      await this.storeForecast(forecast)
      
      return forecast
    } catch (error) {
      console.error('Error forecasting demand:', error)
      throw error
    }
  }

  private async getHistoricalDemand(
    category: string,
    locationId?: string
  ): Promise<HistoricalDemand[]> {
    const ninetyDaysAgo = subDays(new Date(), 90)
    
    // Get review activity as proxy for demand
    const query = this.supabase
      .from('businesses')
      .select('id, review_count, rating, created_at, updated_at')
      .eq('category', category)

    if (locationId) {
      query.eq('location_id', locationId)
    }

    const { data: businesses } = await query
    
    if (!businesses || businesses.length === 0) {
      return []
    }

    // Aggregate daily demand metrics
    const dailyDemand: Map<string, HistoricalDemand> = new Map()
    
    // Generate daily data points
    for (let i = 90; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const dateObj = subDays(new Date(), i)
      
      // Calculate demand based on review activity and business metrics
      const demand = this.calculateDailyDemand(businesses, date)
      
      dailyDemand.set(date, {
        date,
        demand,
        factors: {
          dayOfWeek: dateObj.getDay(),
          month: dateObj.getMonth(),
          reviewCount: businesses.reduce((sum, b) => sum + (b.review_count || 0), 0),
          avgRating: businesses.reduce((sum, b) => sum + (b.rating || 0), 0) / businesses.length,
          competitorCount: businesses.length
        }
      })
    }
    
    return Array.from(dailyDemand.values())
  }

  private calculateDailyDemand(businesses: unknown[], date: string): number {
    // Simplified demand calculation
    // In production, this would use actual transaction or search data
    const baselineDemand = 100
    const businessCount = businesses.length
    const avgRating = businesses.reduce((sum, b) => sum + ((b as any).rating || 0), 0) / businessCount
    const totalReviews = businesses.reduce((sum, b) => sum + ((b as any).review_count || 0), 0)
    const totalReviewsNum = typeof totalReviews === 'number' ? totalReviews : 0

    // Demand formula (simplified)
    const demand = baselineDemand *
      (1 + avgRating / 5) *
      (1 + Math.log10(totalReviewsNum + 1) / 10) *
      (1 + Math.random() * 0.2 - 0.1) // Add some randomness

    return Math.max(0, demand)
  }

  private extractFeatures(data: HistoricalDemand[]): number[][] {
    return data.map(d => [
      d.factors.dayOfWeek,
      d.factors.month,
      d.factors.reviewCount,
      d.factors.avgRating,
      d.factors.competitorCount,
      d.demand // Previous demand as a feature
    ])
  }

  private runARIMA(data: HistoricalDemand[], horizonDays: number): { predicted: number } {
    // Simplified ARIMA implementation
    // In production, would use proper ARIMA library
    
    const values = data.map(d => d.demand)
    const n = values.length
    
    // Calculate AR(1) coefficient
    const mean = values.reduce((a, b) => a + b, 0) / n
    let numerator = 0
    let denominator = 0
    
    for (let i = 1; i < n; i++) {
      numerator += (values[i] - mean) * (values[i - 1] - mean)
      denominator += Math.pow(values[i - 1] - mean, 2)
    }
    
    const phi = denominator === 0 ? 0 : numerator / denominator
    
    // Simple forecast
    let forecast = values[n - 1]
    for (let i = 0; i < horizonDays; i++) {
      forecast = mean + phi * (forecast - mean)
    }
    
    return { predicted: Math.max(0, forecast) }
  }

  private runExponentialSmoothing(
    data: HistoricalDemand[],
    horizonDays: number
  ): { predicted: number } {
    const values = data.map(d => d.demand)
    const alpha = 0.3 // Smoothing parameter
    
    // Calculate smoothed values
    let smoothed = values[0]
    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed
    }
    
    // Project forward
    const trend = (values[values.length - 1] - values[0]) / values.length
    const forecast = smoothed + trend * horizonDays
    
    return { predicted: Math.max(0, forecast) }
  }

  private runLinearRegression(
    data: HistoricalDemand[],
    features: number[][],
    horizonDays: number
  ): { predicted: number } {
    // Simple linear regression on time
    const n = data.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = data.map(d => d.demand)
    
    // Calculate coefficients
    const xMean = x.reduce((a, b) => a + b, 0) / n
    const yMean = y.reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean)
      denominator += Math.pow(x[i] - xMean, 2)
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator
    const intercept = yMean - slope * xMean
    
    // Predict
    const forecast = slope * (n + horizonDays - 1) + intercept
    
    return { predicted: Math.max(0, forecast) }
  }

  private ensembleForecasts(forecasts: Array<{ predicted: number }>): { predicted: number } {
    // Simple average ensemble
    const sum = forecasts.reduce((acc, f) => acc + f.predicted, 0)
    return { predicted: sum / forecasts.length }
  }

  private calculatePredictionIntervals(
    predicted: number,
    historicalData: HistoricalDemand[]
  ): { lowerBound: number; upperBound: number } {
    // Calculate standard deviation of historical data
    const values = historicalData.map(d => d.demand)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)
    
    // 95% confidence interval (approximately 2 standard deviations)
    const margin = 1.96 * stdDev
    
    return {
      lowerBound: Math.max(0, predicted - margin),
      upperBound: predicted + margin
    }
  }

  private identifyFactors(
    data: HistoricalDemand[],
    features: number[][]
  ): Record<string, unknown> {
    // Analyze correlation between features and demand
    const correlations: Record<string, number> = {}
    const featureNames = ['dayOfWeek', 'month', 'reviewCount', 'avgRating', 'competitorCount']
    
    for (let i = 0; i < featureNames.length; i++) {
      const featureValues = features.map(f => f[i])
      const demandValues = data.map(d => d.demand)
      correlations[featureNames[i]] = this.calculateCorrelation(featureValues, demandValues)
    }
    
    // Identify top factors
    const sortedFactors = Object.entries(correlations)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
    
    return {
      topFactors: sortedFactors.map(([name, correlation]) => ({
        name,
        correlation,
        impact: Math.abs(correlation) > 0.5 ? 'high' : Math.abs(correlation) > 0.3 ? 'medium' : 'low'
      })),
      seasonality: this.detectSeasonalFactors(data),
      trend: this.detectTrendFactors(data)
    }
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length
    if (n === 0) return 0
    
    const xMean = x.reduce((a, b) => a + b, 0) / n
    const yMean = y.reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let xDenom = 0
    let yDenom = 0
    
    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean
      const yDiff = y[i] - yMean
      numerator += xDiff * yDiff
      xDenom += xDiff * xDiff
      yDenom += yDiff * yDiff
    }
    
    const denominator = Math.sqrt(xDenom * yDenom)
    return denominator === 0 ? 0 : numerator / denominator
  }

  private detectSeasonalFactors(data: HistoricalDemand[]): Record<string, unknown> {
    // Day of week patterns
    const dayOfWeekDemand: Record<number, number[]> = {}
    
    for (const d of data) {
      if (!dayOfWeekDemand[d.factors.dayOfWeek]) {
        dayOfWeekDemand[d.factors.dayOfWeek] = []
      }
      dayOfWeekDemand[d.factors.dayOfWeek].push(d.demand)
    }
    
    const dayOfWeekAvg: Record<string, number> = {}
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    for (const [day, demands] of Object.entries(dayOfWeekDemand)) {
      const avg = demands.reduce((a, b) => a + b, 0) / demands.length
      dayOfWeekAvg[days[parseInt(day)]] = avg
    }
    
    // Find peak and low days
    const sortedDays = Object.entries(dayOfWeekAvg).sort((a, b) => b[1] - a[1])
    
    return {
      peakDay: sortedDays[0][0],
      lowDay: sortedDays[sortedDays.length - 1][0],
      weeklyPattern: dayOfWeekAvg
    }
  }

  private detectTrendFactors(data: HistoricalDemand[]): Record<string, unknown> {
    const n = data.length
    const firstHalf = data.slice(0, Math.floor(n / 2))
    const secondHalf = data.slice(Math.floor(n / 2))
    
    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.demand, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.demand, 0) / secondHalf.length
    
    const trendDirection = secondHalfAvg > firstHalfAvg ? 'increasing' : 
                          secondHalfAvg < firstHalfAvg ? 'decreasing' : 'stable'
    const trendStrength = Math.abs(secondHalfAvg - firstHalfAvg) / firstHalfAvg
    
    return {
      direction: trendDirection,
      strength: trendStrength,
      percentageChange: ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(2)
    }
  }

  private async backtest(
    data: HistoricalDemand[],
    horizonDays: number
  ): Promise<number> {
    if (data.length < horizonDays * 2) {
      return 0.5 // Not enough data for backtesting
    }
    
    // Use first 70% for training, last 30% for testing
    const splitIndex = Math.floor(data.length * 0.7)
    const trainData = data.slice(0, splitIndex)
    const testData = data.slice(splitIndex)
    
    // Make predictions on test set
    const predictions: number[] = []
    const actuals: number[] = []
    
    for (let i = 0; i < Math.min(horizonDays, testData.length); i++) {
      // Simple forecast using training data
      const forecast = this.runExponentialSmoothing(trainData, i + 1)
      predictions.push(forecast.predicted)
      actuals.push(testData[i].demand)
    }
    
    // Calculate MAPE (Mean Absolute Percentage Error)
    let totalError = 0
    for (let i = 0; i < predictions.length; i++) {
      if (actuals[i] !== 0) {
        totalError += Math.abs((actuals[i] - predictions[i]) / actuals[i])
      }
    }
    
    const mape = totalError / predictions.length
    // Convert MAPE to accuracy (1 - MAPE, capped at 0-1)
    return Math.max(0, Math.min(1, 1 - mape))
  }

  private createDefaultForecast(
    category: string,
    locationId?: string,
    horizonDays: number
  ): ForecastResult {
    return {
      category,
      locationId,
      forecastDate: format(new Date(), 'yyyy-MM-dd'),
      horizonDays,
      predictedDemand: 100,
      lowerBound: 80,
      upperBound: 120,
      confidenceLevel: 0.5,
      modelType: 'ensemble',
      modelAccuracy: 0.5,
      factors: {
        message: 'Insufficient historical data for accurate forecasting'
      }
    }
  }

  private async storeForecast(forecast: ForecastResult) {
    const record = {
      category: forecast.category,
      location_id: forecast.locationId,
      forecast_date: forecast.forecastDate,
      forecast_horizon_days: forecast.horizonDays,
      predicted_demand: forecast.predictedDemand,
      lower_bound: forecast.lowerBound,
      upper_bound: forecast.upperBound,
      confidence_level: forecast.confidenceLevel,
      model_type: forecast.modelType,
      model_accuracy: forecast.modelAccuracy,
      factors: forecast.factors
    }

    await this.supabase
      .from('demand_forecasts')
      .upsert(record, {
        onConflict: 'category,location_id,forecast_date,forecast_horizon_days'
      })
  }

  // Generate forecasts for multiple horizons
  async multiHorizonForecast(
    category: string,
    locationId?: string
  ): Promise<ForecastResult[]> {
    const horizons = [7, 14, 30, 60, 90]
    
    const forecasts = await Promise.all(
      horizons.map(h => this.forecastDemand(category, locationId, h))
    )
    
    return forecasts
  }
}