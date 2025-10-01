/**
 * Core Benchmarking Engine
 * Main orchestrator for all benchmarking operations
 */

import { createClient } from '@/lib/supabase/server'
import type {
  BenchmarkComparison,
  CompanyMetrics,
  IndustryBenchmark,
  PeerGroup,
  CalculateBenchmarksRequest,
  CalculateBenchmarksResponse,
  MetricComparison,
  ComparisonResults,
  GapAnalysis,
  Recommendation
} from '../types/benchmarking'

export class BenchmarkEngine {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null

  constructor() {
    // Client will be lazily initialized on first use
  }

  /**
   * Ensure Supabase client is initialized (lazy initialization)
   */
  private async ensureClient() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
  }

  /**
   * Main method to calculate benchmarks for a company
   */
  async calculateBenchmarks(
    request: CalculateBenchmarksRequest
  ): Promise<CalculateBenchmarksResponse> {
    try {
      // Ensure client is initialized
      await this.ensureClient()

      console.log(`[BenchmarkEngine] Calculating benchmarks for company ${request.company_id}`)

      // Check cache first unless force refresh
      if (!request.force_refresh) {
        const cached = await this.getCachedComparison(request.company_id)
        if (cached && this.isCacheValid(cached)) {
          console.log('[BenchmarkEngine] Returning cached comparison')
          return {
            success: true,
            comparison: cached,
            cached: true
          }
        }
      }

      // Fetch company metrics
      const companyMetrics = await this.fetchCompanyMetrics(request.company_id)
      if (!companyMetrics) {
        throw new Error('No metrics found for company')
      }

      // Determine comparison scope
      let industryBenchmarks: IndustryBenchmark[] = []
      let peerGroup: PeerGroup | null = null
      let peerMetrics: CompanyMetrics[] = []

      if (request.comparison_type === 'industry' || request.comparison_type === 'both') {
        industryBenchmarks = await this.fetchIndustryBenchmarks(
          request.industry_code || await this.getCompanyIndustryCode(request.company_id)
        )
      }

      if (request.comparison_type === 'peer_group' || request.comparison_type === 'both') {
        if (request.peer_group_id) {
          peerGroup = await this.fetchPeerGroup(request.peer_group_id)
        } else {
          // Auto-identify peers if no group specified
          peerGroup = await this.autoIdentifyPeers(request.company_id)
        }

        if (peerGroup) {
          peerMetrics = await this.fetchPeerMetrics(peerGroup.id!)
        }
      }

      // Calculate comparison results
      const comparisonResults = this.calculateComparisonResults(
        companyMetrics,
        industryBenchmarks,
        peerMetrics
      )

      // Calculate percentile rankings
      const percentileRankings = this.calculatePercentileRankings(
        companyMetrics,
        industryBenchmarks,
        peerMetrics
      )

      // Perform gap analysis
      const gapAnalysis = this.performGapAnalysis(
        companyMetrics,
        industryBenchmarks,
        peerMetrics
      )

      // Identify strengths and weaknesses
      const { strengths, weaknesses } = this.identifyStrengthsWeaknesses(
        comparisonResults,
        percentileRankings
      )

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        weaknesses,
        gapAnalysis,
        comparisonResults
      )

      // Calculate overall score
      const overallScore = this.calculateOverallScore(percentileRankings)
      const percentileRank = this.calculateOverallPercentile(percentileRankings)
      const quartile = this.getQuartile(percentileRank)

      // Create comparison result
      const comparison: BenchmarkComparison = {
        company_id: request.company_id,
        comparison_date: new Date().toISOString().split('T')[0],
        comparison_type: request.comparison_type || 'industry',
        peer_group_id: peerGroup?.id,
        industry_code: request.industry_code,
        overall_score: overallScore,
        percentile_rank: percentileRank,
        quartile,
        comparison_results: comparisonResults,
        percentile_rankings: percentileRankings,
        gap_analysis: gapAnalysis,
        strengths,
        weaknesses,
        opportunities: this.identifyOpportunities(gapAnalysis, comparisonResults),
        recommendations
      }

      // Add AI insights if requested
      if (request.include_ai_insights) {
        const aiInsights = await this.generateAIInsights(comparison)
        comparison.ai_insights = aiInsights.insights
        comparison.ai_confidence_score = aiInsights.confidence
      }

      // Save comparison to database
      await this.saveComparison(comparison)

      // Check for alerts
      const alerts = await this.checkForAlerts(comparison, companyMetrics)

      return {
        success: true,
        comparison,
        peer_group: peerGroup || undefined,
        alerts: alerts.length > 0 ? alerts : undefined,
        cached: false
      }

    } catch (error) {
      console.error('[BenchmarkEngine] Error calculating benchmarks:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate benchmarks'
      }
    }
  }

  /**
   * Fetch company metrics from database
   */
  private async fetchCompanyMetrics(companyId: string): Promise<CompanyMetrics | null> {
    const { data, error } = await this.supabase
      .from('company_metrics')
      .select('*')
      .eq('company_id', companyId)
      .order('metric_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // If no metrics exist, try to calculate from existing business data
      return await this.calculateMetricsFromBusinessData(companyId)
    }

    return data
  }

  /**
   * Calculate metrics from existing business data
   */
  private async calculateMetricsFromBusinessData(companyId: string): Promise<CompanyMetrics | null> {
    const { data: business } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single()

    if (!business) return null

    // Extract available metrics from business data
    const metrics: CompanyMetrics = {
      company_id: companyId,
      metric_date: new Date().toISOString().split('T')[0],
      data_source: 'calculated'
    }

    // Try to extract financial data from companies_house_data or accounts
    if (business.accounts) {
      const accounts = business.accounts
      metrics.revenue = accounts.turnover
      metrics.gross_profit = accounts.gross_profit
      metrics.operating_profit = accounts.operating_profit
      metrics.net_profit = accounts.profit_loss
      metrics.total_assets = accounts.total_assets
      metrics.total_liabilities = accounts.total_liabilities
      metrics.shareholders_equity = accounts.shareholders_funds
    }

    // Calculate derived metrics
    if (metrics.revenue && metrics.net_profit) {
      metrics.profit_margin = (metrics.net_profit / metrics.revenue) * 100
    }
    if (metrics.revenue && metrics.gross_profit) {
      metrics.gross_margin = (metrics.gross_profit / metrics.revenue) * 100
    }
    if (metrics.total_assets && metrics.total_liabilities) {
      metrics.debt_to_equity = metrics.total_liabilities / (metrics.total_assets - metrics.total_liabilities)
    }

    return metrics
  }

  /**
   * Fetch industry benchmarks
   */
  private async fetchIndustryBenchmarks(industryCode: string): Promise<IndustryBenchmark[]> {
    const { data, error } = await this.supabase
      .from('industry_benchmarks')
      .select('*')
      .eq('industry_code', industryCode)
      .order('metric_date', { ascending: false })

    if (error || !data || data.length === 0) {
      // Generate synthetic benchmarks if none exist
      return this.generateSyntheticBenchmarks(industryCode)
    }

    return data
  }

  /**
   * Generate synthetic benchmarks for demonstration
   */
  private generateSyntheticBenchmarks(industryCode: string): IndustryBenchmark[] {
    const metrics = [
      'profit_margin', 'gross_margin', 'operating_margin',
      'current_ratio', 'debt_to_equity', 'return_on_assets',
      'return_on_equity', 'revenue_growth_yoy', 'revenue_per_employee'
    ]

    return metrics.map(metric => ({
      industry_code: industryCode,
      metric_name: metric,
      metric_date: new Date().toISOString().split('T')[0],
      mean_value: this.getTypicalValue(metric),
      median_value: this.getTypicalValue(metric) * 0.95,
      min_value: this.getTypicalValue(metric) * 0.5,
      max_value: this.getTypicalValue(metric) * 2,
      std_deviation: this.getTypicalValue(metric) * 0.2,
      p10_value: this.getTypicalValue(metric) * 0.6,
      p25_value: this.getTypicalValue(metric) * 0.75,
      p75_value: this.getTypicalValue(metric) * 1.25,
      p90_value: this.getTypicalValue(metric) * 1.6,
      sample_size: 100
    }))
  }

  /**
   * Get typical value for a metric (for synthetic data)
   */
  private getTypicalValue(metric: string): number {
    const typicalValues: Record<string, number> = {
      'profit_margin': 10,
      'gross_margin': 40,
      'operating_margin': 15,
      'current_ratio': 1.5,
      'debt_to_equity': 0.8,
      'return_on_assets': 8,
      'return_on_equity': 15,
      'revenue_growth_yoy': 10,
      'revenue_per_employee': 150000
    }
    return typicalValues[metric] || 10
  }

  /**
   * Calculate comparison results
   */
  private calculateComparisonResults(
    company: CompanyMetrics,
    industryBenchmarks: IndustryBenchmark[],
    peerMetrics: CompanyMetrics[]
  ): ComparisonResults {
    const results: ComparisonResults = {
      financial_metrics: [],
      operational_metrics: [],
      growth_metrics: [],
      efficiency_metrics: []
    }

    // Financial metrics
    const financialMetrics = ['profit_margin', 'gross_margin', 'operating_margin', 'return_on_assets', 'return_on_equity']
    financialMetrics.forEach(metric => {
      const comparison = this.compareMetric(metric, company, industryBenchmarks, peerMetrics)
      if (comparison) results.financial_metrics!.push(comparison)
    })

    // Growth metrics
    const growthMetrics = ['revenue_growth_yoy', 'customer_growth_yoy', 'employee_growth_yoy']
    growthMetrics.forEach(metric => {
      const comparison = this.compareMetric(metric, company, industryBenchmarks, peerMetrics)
      if (comparison) results.growth_metrics!.push(comparison)
    })

    // Efficiency metrics
    const efficiencyMetrics = ['revenue_per_employee', 'asset_turnover', 'current_ratio']
    efficiencyMetrics.forEach(metric => {
      const comparison = this.compareMetric(metric, company, industryBenchmarks, peerMetrics)
      if (comparison) results.efficiency_metrics!.push(comparison)
    })

    return results
  }

  /**
   * Compare a single metric
   */
  private compareMetric(
    metricName: string,
    company: CompanyMetrics,
    industryBenchmarks: IndustryBenchmark[],
    peerMetrics: CompanyMetrics[]
  ): MetricComparison | null {
    const companyValue = (company as Record<string, unknown>)[metricName]
    if (companyValue === undefined || companyValue === null) return null

    // Get benchmark value (prefer industry median, then peer average)
    let benchmarkValue = 0
    const industryBenchmark = industryBenchmarks.find(b => b.metric_name === metricName)

    if (industryBenchmark?.median_value) {
      benchmarkValue = industryBenchmark.median_value
    } else if (peerMetrics.length > 0) {
      const peerValues = peerMetrics
        .map(p => (p as Record<string, unknown>)[metricName])
        .filter(v => v !== undefined && v !== null)
      benchmarkValue = peerValues.reduce((a, b) => a + b, 0) / peerValues.length
    } else {
      benchmarkValue = this.getTypicalValue(metricName)
    }

    // Calculate percentile
    const percentile = this.calculateMetricPercentile(
      companyValue,
      industryBenchmark,
      peerMetrics.map(p => (p as any)[metricName]).filter(v => v !== undefined)
    )

    return {
      metric_name: metricName,
      metric_label: this.getMetricLabel(metricName),
      company_value: companyValue,
      benchmark_value: benchmarkValue,
      percentile,
      vs_benchmark: benchmarkValue !== 0 ? companyValue / benchmarkValue : 1,
      significance: percentile >= 75 ? 'strength' : percentile <= 25 ? 'weakness' : 'neutral'
    }
  }

  /**
   * Calculate percentile for a metric
   */
  private calculateMetricPercentile(
    value: number,
    industryBenchmark?: IndustryBenchmark,
    peerValues?: number[]
  ): number {
    if (industryBenchmark) {
      // Use industry percentiles if available
      if (value <= industryBenchmark.p10_value!) return 10
      if (value <= industryBenchmark.p25_value!) return 25
      if (value <= industryBenchmark.median_value!) return 50
      if (value <= industryBenchmark.p75_value!) return 75
      if (value <= industryBenchmark.p90_value!) return 90
      return 95
    }

    if (peerValues && peerValues.length > 0) {
      // Calculate percentile from peer values
      const sorted = [...peerValues].sort((a, b) => a - b)
      const rank = sorted.filter(v => v < value).length
      return Math.round((rank / sorted.length) * 100)
    }

    // Default to median if no comparison data
    return 50
  }

  /**
   * Get human-readable metric label
   */
  private getMetricLabel(metricName: string): string {
    const labels: Record<string, string> = {
      'profit_margin': 'Profit Margin',
      'gross_margin': 'Gross Margin',
      'operating_margin': 'Operating Margin',
      'current_ratio': 'Current Ratio',
      'debt_to_equity': 'Debt to Equity',
      'return_on_assets': 'Return on Assets',
      'return_on_equity': 'Return on Equity',
      'revenue_growth_yoy': 'Revenue Growth (YoY)',
      'customer_growth_yoy': 'Customer Growth (YoY)',
      'employee_growth_yoy': 'Employee Growth (YoY)',
      'revenue_per_employee': 'Revenue per Employee',
      'asset_turnover': 'Asset Turnover'
    }
    return labels[metricName] || metricName
  }

  /**
   * Calculate percentile rankings for all metrics
   */
  private calculatePercentileRankings(
    company: CompanyMetrics,
    industryBenchmarks: IndustryBenchmark[],
    peerMetrics: CompanyMetrics[]
  ): Record<string, number> {
    const rankings: Record<string, number> = {}

    // Get all metric names from company data
    const metricNames = Object.keys(company).filter(key =>
      !['id', 'company_id', 'metric_date', 'created_at', 'updated_at', 'data_source', 'data_quality_score'].includes(key)
    )

    metricNames.forEach(metric => {
      const value = (company as any)[metric]
      if (value !== undefined && value !== null && typeof value === 'number') {
        const industryBenchmark = industryBenchmarks.find(b => b.metric_name === metric)
        const peerValues = peerMetrics
          .map(p => (p as any)[metric])
          .filter(v => v !== undefined && v !== null)

        rankings[metric] = this.calculateMetricPercentile(value, industryBenchmark, peerValues)
      }
    })

    return rankings
  }

  /**
   * Perform gap analysis
   */
  private performGapAnalysis(
    company: CompanyMetrics,
    industryBenchmarks: IndustryBenchmark[],
    peerMetrics: CompanyMetrics[]
  ): GapAnalysis {
    const performance_gaps = []

    // Identify gaps for key metrics
    const keyMetrics = ['profit_margin', 'revenue_growth_yoy', 'revenue_per_employee', 'return_on_equity']

    for (const metric of keyMetrics) {
      const companyValue = (company as any)[metric]
      if (companyValue === undefined) continue

      // Get target value (75th percentile of industry or peers)
      let targetValue = 0
      const industryBenchmark = industryBenchmarks.find(b => b.metric_name === metric)

      if (industryBenchmark?.p75_value) {
        targetValue = industryBenchmark.p75_value
      } else if (peerMetrics.length > 0) {
        const peerValues = peerMetrics
          .map(p => (p as any)[metric])
          .filter(v => v !== undefined && v !== null)
          .sort((a, b) => a - b)
        targetValue = peerValues[Math.floor(peerValues.length * 0.75)] || companyValue
      }

      if (companyValue < targetValue) {
        performance_gaps.push({
          metric,
          current_value: companyValue,
          target_value: targetValue,
          gap_size: targetValue - companyValue,
          gap_percentage: ((targetValue - companyValue) / companyValue) * 100,
          priority: this.getGapPriority(metric, (targetValue - companyValue) / companyValue)
        })
      }
    }

    return {
      performance_gaps,
      capability_gaps: [],
      resource_gaps: []
    }
  }

  /**
   * Determine gap priority
   */
  private getGapPriority(metric: string, gapPercentage: number): 'high' | 'medium' | 'low' {
    const criticalMetrics = ['profit_margin', 'revenue_growth_yoy']
    if (criticalMetrics.includes(metric) && gapPercentage > 0.2) return 'high'
    if (gapPercentage > 0.3) return 'high'
    if (gapPercentage > 0.15) return 'medium'
    return 'low'
  }

  /**
   * Identify strengths and weaknesses
   */
  private identifyStrengthsWeaknesses(
    results: ComparisonResults,
    percentiles: Record<string, number>
  ): { strengths: string[], weaknesses: string[] } {
    const strengths: string[] = []
    const weaknesses: string[] = []

    Object.entries(percentiles).forEach(([metric, percentile]) => {
      const label = this.getMetricLabel(metric)
      if (percentile >= 75) {
        strengths.push(`Strong ${label} (${percentile}th percentile)`)
      } else if (percentile <= 25) {
        weaknesses.push(`Low ${label} (${percentile}th percentile)`)
      }
    })

    return { strengths, weaknesses }
  }

  /**
   * Generate recommendations based on weaknesses and gaps
   */
  private generateRecommendations(
    weaknesses: string[],
    gapAnalysis: GapAnalysis,
    results: ComparisonResults
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Add recommendations for high priority gaps
    gapAnalysis.performance_gaps
      .filter(gap => gap.priority === 'high')
      .forEach(gap => {
        recommendations.push({
          title: `Improve ${this.getMetricLabel(gap.metric)}`,
          description: `Current performance is ${gap.gap_percentage.toFixed(1)}% below target. Focus on strategies to close this gap.`,
          category: 'strategic',
          priority: 'high',
          estimated_impact: 'high',
          estimated_effort: 'medium',
          timeline: '3-6 months'
        })
      })

    // Add quick wins for easy improvements
    const quickWinMetrics = ['revenue_per_employee', 'asset_turnover']
    results.efficiency_metrics?.forEach(metric => {
      if (quickWinMetrics.includes(metric.metric_name) && metric.percentile < 50) {
        recommendations.push({
          title: `Quick Win: Optimize ${metric.metric_label}`,
          description: `Implement process improvements to boost efficiency`,
          category: 'quick_win',
          priority: 'medium',
          estimated_impact: 'medium',
          estimated_effort: 'low',
          timeline: '1-3 months'
        })
      }
    })

    return recommendations
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(
    gapAnalysis: GapAnalysis,
    results: ComparisonResults
  ): string[] {
    const opportunities: string[] = []

    // Growth opportunities
    const growthMetrics = results.growth_metrics || []
    growthMetrics.forEach(metric => {
      if (metric.percentile > 60) {
        opportunities.push(`Leverage strong ${metric.metric_label} for expansion`)
      }
    })

    // Efficiency opportunities
    if (gapAnalysis.performance_gaps.some(g => g.metric === 'revenue_per_employee')) {
      opportunities.push('Automation and process optimization potential')
    }

    return opportunities
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(percentiles: Record<string, number>): number {
    const values = Object.values(percentiles)
    if (values.length === 0) return 50

    // Weight key metrics higher
    const weights: Record<string, number> = {
      'profit_margin': 2,
      'revenue_growth_yoy': 2,
      'return_on_equity': 1.5,
      'revenue_per_employee': 1.5
    }

    let totalWeight = 0
    let weightedSum = 0

    Object.entries(percentiles).forEach(([metric, percentile]) => {
      const weight = weights[metric] || 1
      weightedSum += percentile * weight
      totalWeight += weight
    })

    return Math.round(weightedSum / totalWeight)
  }

  /**
   * Calculate overall percentile rank
   */
  private calculateOverallPercentile(percentiles: Record<string, number>): number {
    const overallScore = this.calculateOverallScore(percentiles)
    // Simple mapping for now, could be more sophisticated
    return Math.min(99, Math.max(1, overallScore))
  }

  /**
   * Get quartile from percentile
   */
  private getQuartile(percentile: number): 1 | 2 | 3 | 4 {
    if (percentile >= 75) return 4
    if (percentile >= 50) return 3
    if (percentile >= 25) return 2
    return 1
  }

  /**
   * Get cached comparison
   */
  private async getCachedComparison(companyId: string): Promise<BenchmarkComparison | null> {
    const { data } = await this.supabase
      .from('benchmark_comparisons')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return data
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(comparison: BenchmarkComparison): boolean {
    if (!comparison.created_at) return false
    const cacheAge = Date.now() - new Date(comparison.created_at).getTime()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    return cacheAge < maxAge
  }

  /**
   * Get company industry code
   */
  private async getCompanyIndustryCode(companyId: string): Promise<string> {
    const { data } = await this.supabase
      .from('businesses')
      .select('sic_codes')
      .eq('id', companyId)
      .single()

    if (data?.sic_codes && data.sic_codes.length > 0) {
      // Return primary SIC code (first two digits)
      return data.sic_codes[0].substring(0, 2)
    }

    return '62' // Default to IT services
  }

  /**
   * Fetch peer group
   */
  private async fetchPeerGroup(peerGroupId: string): Promise<PeerGroup | null> {
    const { data } = await this.supabase
      .from('peer_groups')
      .select('*')
      .eq('id', peerGroupId)
      .single()

    return data
  }

  /**
   * Auto-identify peers for a company
   */
  private async autoIdentifyPeers(companyId: string): Promise<PeerGroup | null> {
    // For now, return a simple peer group based on industry
    // In production, this would use ML-based similarity matching
    const industryCode = await this.getCompanyIndustryCode(companyId)

    // Find similar companies
    const { data: peers } = await this.supabase
      .from('businesses')
      .select('id')
      .contains('sic_codes', [industryCode])
      .neq('id', companyId)
      .limit(20)

    if (!peers || peers.length === 0) return null

    // Create temporary peer group
    return {
      name: 'Auto-identified peers',
      description: 'Automatically identified based on industry and size',
      selection_criteria: {
        industry_codes: [industryCode]
      },
      member_count: peers.length
    }
  }

  /**
   * Fetch metrics for peer companies
   */
  private async fetchPeerMetrics(peerGroupId: string): Promise<CompanyMetrics[]> {
    const { data: members } = await this.supabase
      .from('peer_group_members')
      .select('company_id')
      .eq('peer_group_id', peerGroupId)
      .eq('is_active', true)

    if (!members || members.length === 0) return []

    const companyIds = members.map(m => m.company_id)

    const { data: metrics } = await this.supabase
      .from('company_metrics')
      .select('*')
      .in('company_id', companyIds)
      .order('metric_date', { ascending: false })

    // Group by company and take latest metric for each
    const latestMetrics: Record<string, CompanyMetrics> = {}
    metrics?.forEach(metric => {
      if (!latestMetrics[metric.company_id]) {
        latestMetrics[metric.company_id] = metric
      }
    })

    return Object.values(latestMetrics)
  }

  /**
   * Save comparison to database
   */
  private async saveComparison(comparison: BenchmarkComparison): Promise<void> {
    await this.supabase
      .from('benchmark_comparisons')
      .upsert(comparison)
  }

  /**
   * Check for alerts
   */
  private async checkForAlerts(
    comparison: BenchmarkComparison,
    metrics: CompanyMetrics
  ): Promise<any[]> {
    const alerts = []

    // Check for significant underperformance
    Object.entries(comparison.percentile_rankings).forEach(([metric, percentile]) => {
      if (percentile < 25) {
        alerts.push({
          company_id: comparison.company_id,
          alert_type: 'underperformance',
          severity: percentile < 10 ? 'high' : 'medium',
          metric_name: metric,
          current_value: (metrics as any)[metric],
          peer_average: comparison.comparison_results.financial_metrics?.find(m => m.metric_name === metric)?.benchmark_value,
          title: `Low ${this.getMetricLabel(metric)}`,
          message: `Company is in the ${percentile}th percentile for ${this.getMetricLabel(metric)}`
        })
      }
    })

    return alerts
  }

  /**
   * Generate AI insights using Ollama if available
   */
  private async generateAIInsights(comparison: BenchmarkComparison): Promise<{ insights: string, confidence: number }> {
    // This would integrate with the Ollama AI service
    // For now, return mock insights
    const topStrength = comparison.strengths[0] || 'operational efficiency'
    const topWeakness = comparison.weaknesses[0] || 'growth metrics'

    return {
      insights: `The company shows ${topStrength}, positioning it well against industry peers. ` +
                `However, there's room for improvement in ${topWeakness}. ` +
                `Focus on closing performance gaps in key metrics to move from the ${comparison.quartile}${this.getQuartileSuffix(comparison.quartile!)} quartile to the top quartile.`,
      confidence: 0.85
    }
  }

  /**
   * Get quartile suffix
   */
  private getQuartileSuffix(quartile: number): string {
    const suffixes = ['st', 'nd', 'rd', 'th']
    return suffixes[quartile - 1]
  }
}

// Export singleton instance
export const benchmarkEngine = new BenchmarkEngine()