/**
 * Benchmarking Service
 * Provides industry comparisons and peer analysis
 */

import { createClient } from '@/lib/supabase/server'

export interface BenchmarkComparison {
  company_id: string
  comparison_date: Date
  industry_code: string
  metrics: BenchmarkMetrics
  overall_percentile: number
  performance_rating: 'top_performer' | 'above_average' | 'average' | 'below_average' | 'needs_improvement'
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
}

export interface BenchmarkMetrics {
  [metricName: string]: {
    value: number
    percentile: number
    vs_median: number // percentage difference from median
    vs_mean: number // percentage difference from mean
    industry_median: number
    industry_mean: number
    industry_p25: number
    industry_p75: number
  }
}

export interface IndustryBenchmark {
  industry_code: string
  industry_name: string
  metric_name: string
  period_start: Date
  period_end: Date
  sample_size: number
  mean_value: number
  median_value: number
  min_value: number
  max_value: number
  std_deviation: number
  p10_value: number
  p25_value: number
  p75_value: number
  p90_value: number
}

export class BenchmarkingService {
  /**
   * Calculate benchmark comparison for a company
   */
  async calculateBenchmarks(companyId: string): Promise<BenchmarkComparison> {
    const supabase = await createClient()

    console.log(`[Benchmarking] Calculating benchmarks for company ${companyId}`)

    try {
      // Fetch company data
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single()

      if (!company) {
        throw new Error('Company not found')
      }

      // Get industry code (use first SIC code or default)
      const industryCode = company.sic_codes?.[0] || '62020'

      // Fetch industry benchmarks
      const benchmarks = await this.fetchIndustryBenchmarks(industryCode)

      // Calculate company metrics
      const companyMetrics = await this.calculateCompanyMetrics(company)

      // Compare against benchmarks
      const comparison = this.compareAgainstBenchmarks(companyMetrics, benchmarks)

      // Calculate overall percentile
      const overallPercentile = this.calculateOverallPercentile(comparison)

      // Determine performance rating
      const performanceRating = this.determinePerformanceRating(overallPercentile)

      // Identify strengths, weaknesses, opportunities
      const insights = this.generateInsights(comparison, benchmarks)

      const benchmarkComparison: BenchmarkComparison = {
        company_id: companyId,
        comparison_date: new Date(),
        industry_code: industryCode,
        metrics: comparison,
        overall_percentile: overallPercentile,
        performance_rating: performanceRating,
        strengths: insights.strengths,
        weaknesses: insights.weaknesses,
        opportunities: insights.opportunities
      }

      // Save comparison to database
      await this.saveBenchmarkComparison(benchmarkComparison)

      return benchmarkComparison
    } catch (error) {
      console.error('[Benchmarking] Error calculating benchmarks:', error)
      throw error
    }
  }

  /**
   * Get peer companies for comparison
   */
  async getPeerComparisons(companyId: string, limit = 10): Promise<Array<Record<string, unknown>>> {
    const supabase = await createClient()

    try {
      // Get company details
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single()

      if (!company) {
        throw new Error('Company not found')
      }

      // Find similar companies
      const industryCode = company.sic_codes?.[0]
      const employeeRange = this.getEmployeeRange(company.employee_count)

      let query = supabase
        .from('businesses')
        .select('*')
        .neq('id', companyId)
        .eq('company_status', 'active')

      if (industryCode) {
        query = query.contains('sic_codes', [industryCode])
      }

      const { data: peers } = await query.limit(limit)

      // Calculate similarity scores
      const peersWithScores = (peers || []).map(peer => ({
        ...peer,
        similarity_score: this.calculateSimilarityScore(company, peer)
      }))

      // Sort by similarity
      return peersWithScores.sort((a, b) => b.similarity_score - a.similarity_score)
    } catch (error) {
      console.error('[Benchmarking] Error getting peer comparisons:', error)
      return []
    }
  }

  /**
   * Fetch industry benchmarks from database
   */
  private async fetchIndustryBenchmarks(industryCode: string): Promise<IndustryBenchmark[]> {
    const supabase = await createClient()

    const { data: benchmarks } = await supabase
      .from('industry_benchmarks')
      .select('*')
      .eq('industry_code', industryCode)
      .gte('period_end', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()) // Last year

    return benchmarks || []
  }

  /**
   * Calculate company metrics
   */
  private async calculateCompanyMetrics(company: any): Promise<Record<string, number>> {
    const supabase = await createClient()

    const metrics: Record<string, number> = {}

    // Get lead score for growth metrics
    const { data: leadScore } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('company_id', company.id)
      .single()

    // Basic metrics from company data
    if (company.employee_count) {
      metrics.employee_count = company.employee_count
    }

    // Calculate company age
    if (company.date_of_creation || company.incorporation_date) {
      const foundedDate = new Date(company.date_of_creation || company.incorporation_date)
      const ageYears = (Date.now() - foundedDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      metrics.company_age = Math.floor(ageYears)
    }

    // Use lead scores as proxy for some metrics
    if (leadScore) {
      metrics.growth_score = leadScore.growth_indicator_score || 50
      metrics.financial_health = leadScore.financial_health_score || 50
      metrics.technology_adoption = leadScore.technology_fit_score || 50
      metrics.engagement_level = leadScore.engagement_score || 30
    }

    // Estimate revenue per employee (simplified)
    if (metrics.employee_count) {
      // Industry average approximation
      metrics.revenue_per_employee = metrics.employee_count * 150000 // £150k per employee average
    }

    // Growth rate estimation based on company age and size
    if (metrics.company_age && metrics.company_age < 5) {
      metrics.revenue_growth_rate = 30 // Young companies typically grow faster
    } else {
      metrics.revenue_growth_rate = 10 // Mature companies grow slower
    }

    return metrics
  }

  /**
   * Compare company metrics against industry benchmarks
   */
  private compareAgainstBenchmarks(
    companyMetrics: Record<string, number>,
    benchmarks: IndustryBenchmark[]
  ): BenchmarkMetrics {
    const comparison: BenchmarkMetrics = {}

    for (const benchmark of benchmarks) {
      const companyValue = companyMetrics[benchmark.metric_name]

      if (companyValue !== undefined) {
        // Calculate percentile
        const percentile = this.calculatePercentile(companyValue, benchmark)

        // Calculate differences
        const vsMedian = benchmark.median_value > 0
          ? ((companyValue - benchmark.median_value) / benchmark.median_value) * 100
          : 0

        const vsMean = benchmark.mean_value > 0
          ? ((companyValue - benchmark.mean_value) / benchmark.mean_value) * 100
          : 0

        comparison[benchmark.metric_name] = {
          value: companyValue,
          percentile,
          vs_median: vsMedian,
          vs_mean: vsMean,
          industry_median: benchmark.median_value,
          industry_mean: benchmark.mean_value,
          industry_p25: benchmark.p25_value,
          industry_p75: benchmark.p75_value
        }
      }
    }

    // Add synthetic metrics if no benchmarks available
    if (Object.keys(comparison).length === 0) {
      // Create default comparison based on scores
      comparison.overall_performance = {
        value: companyMetrics.growth_score || 50,
        percentile: companyMetrics.growth_score || 50,
        vs_median: 0,
        vs_mean: 0,
        industry_median: 50,
        industry_mean: 50,
        industry_p25: 25,
        industry_p75: 75
      }
    }

    return comparison
  }

  /**
   * Calculate percentile for a value within a benchmark distribution
   */
  private calculatePercentile(value: number, benchmark: IndustryBenchmark): number {
    if (value <= benchmark.min_value) return 0
    if (value >= benchmark.max_value) return 100

    // Simple linear interpolation between percentile points
    if (value <= benchmark.p10_value) {
      return (value - benchmark.min_value) / (benchmark.p10_value - benchmark.min_value) * 10
    } else if (value <= benchmark.p25_value) {
      return 10 + (value - benchmark.p10_value) / (benchmark.p25_value - benchmark.p10_value) * 15
    } else if (value <= benchmark.median_value) {
      return 25 + (value - benchmark.p25_value) / (benchmark.median_value - benchmark.p25_value) * 25
    } else if (value <= benchmark.p75_value) {
      return 50 + (value - benchmark.median_value) / (benchmark.p75_value - benchmark.median_value) * 25
    } else if (value <= benchmark.p90_value) {
      return 75 + (value - benchmark.p75_value) / (benchmark.p90_value - benchmark.p75_value) * 15
    } else {
      return 90 + (value - benchmark.p90_value) / (benchmark.max_value - benchmark.p90_value) * 10
    }
  }

  /**
   * Calculate overall percentile from multiple metrics
   */
  private calculateOverallPercentile(metrics: BenchmarkMetrics): number {
    const percentiles = Object.values(metrics).map(m => m.percentile)
    if (percentiles.length === 0) return 50

    // Weighted average (could be customized per metric)
    const sum = percentiles.reduce((acc, val) => acc + val, 0)
    return Math.round(sum / percentiles.length)
  }

  /**
   * Determine performance rating based on percentile
   */
  private determinePerformanceRating(percentile: number): BenchmarkComparison['performance_rating'] {
    if (percentile >= 90) return 'top_performer'
    if (percentile >= 70) return 'above_average'
    if (percentile >= 40) return 'average'
    if (percentile >= 20) return 'below_average'
    return 'needs_improvement'
  }

  /**
   * Generate insights from benchmark comparison
   */
  private generateInsights(
    comparison: BenchmarkMetrics,
    benchmarks: IndustryBenchmark[]
  ): {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const opportunities: string[] = []

    for (const [metricName, metric] of Object.entries(comparison)) {
      const benchmark = benchmarks.find(b => b.metric_name === metricName)

      if (metric.percentile >= 75) {
        strengths.push(`Strong ${this.formatMetricName(metricName)} (${metric.percentile}th percentile)`)
      } else if (metric.percentile <= 25) {
        weaknesses.push(`Low ${this.formatMetricName(metricName)} (${metric.percentile}th percentile)`)

        // Generate opportunity based on weakness
        if (metricName.includes('growth')) {
          opportunities.push('Focus on growth initiatives to improve market position')
        } else if (metricName.includes('efficiency') || metricName.includes('revenue_per')) {
          opportunities.push('Improve operational efficiency to match industry standards')
        } else if (metricName.includes('technology')) {
          opportunities.push('Invest in technology modernization')
        }
      }
    }

    // Add default insights if none found
    if (strengths.length === 0) {
      strengths.push('Established market presence')
    }
    if (weaknesses.length === 0 && comparison.overall_performance?.percentile < 50) {
      weaknesses.push('Overall performance below industry median')
    }
    if (opportunities.length === 0) {
      opportunities.push('Benchmark regularly to track improvement')
    }

    return { strengths, weaknesses, opportunities }
  }

  /**
   * Save benchmark comparison to database
   */
  private async saveBenchmarkComparison(comparison: BenchmarkComparison): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('company_benchmark_comparisons')
      .upsert({
        company_id: comparison.company_id,
        comparison_date: comparison.comparison_date.toISOString(),
        industry_code: comparison.industry_code,
        metrics: comparison.metrics,
        overall_percentile: comparison.overall_percentile,
        performance_rating: comparison.performance_rating,
        strengths: comparison.strengths,
        weaknesses: comparison.weaknesses,
        opportunities: comparison.opportunities,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'company_id,comparison_date'
      })

    if (error) {
      console.error('[Benchmarking] Error saving comparison:', error)
    }
  }

  /**
   * Calculate similarity score between two companies
   */
  private calculateSimilarityScore(company1: any, company2: any): number {
    let score = 0
    let factors = 0

    // Industry match
    if (company1.sic_codes && company2.sic_codes) {
      const commonCodes = company1.sic_codes.filter((code: string) =>
        company2.sic_codes.includes(code)
      )
      if (commonCodes.length > 0) {
        score += 30
      }
      factors++
    }

    // Size similarity
    if (company1.employee_count && company2.employee_count) {
      const ratio = Math.min(company1.employee_count, company2.employee_count) /
                   Math.max(company1.employee_count, company2.employee_count)
      score += ratio * 20
      factors++
    }

    // Age similarity
    if (company1.date_of_creation && company2.date_of_creation) {
      const age1 = Date.now() - new Date(company1.date_of_creation).getTime()
      const age2 = Date.now() - new Date(company2.date_of_creation).getTime()
      const ageRatio = Math.min(age1, age2) / Math.max(age1, age2)
      score += ageRatio * 20
      factors++
    }

    // Location proximity (simplified - same country)
    if (company1.registered_office_address?.country === company2.registered_office_address?.country) {
      score += 15
      factors++
    }

    // Status match
    if (company1.company_status === company2.company_status) {
      score += 15
      factors++
    }

    return factors > 0 ? Math.round(score / factors * (factors / 5)) : 0
  }

  /**
   * Get employee range category
   */
  private getEmployeeRange(count?: number): string {
    if (!count) return 'unknown'
    if (count < 10) return 'micro'
    if (count < 50) return 'small'
    if (count < 250) return 'medium'
    return 'large'
  }

  /**
   * Format metric name for display
   */
  private formatMetricName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }
}