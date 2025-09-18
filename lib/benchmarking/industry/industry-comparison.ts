/**
 * Industry Comparison Engine
 * Handles industry-level benchmarking and analysis
 */

import { createClient } from '@/lib/supabase/server'
import type {
  IndustryBenchmark,
  CompanyMetrics,
  MetricName,
  CompanySize
} from '../types/benchmarking'

interface IndustryAnalysis {
  industry_code: string
  industry_name: string
  company_position: 'leader' | 'above_average' | 'average' | 'below_average' | 'laggard'
  market_dynamics: {
    growth_rate: number
    competition_intensity: 'low' | 'medium' | 'high'
    market_maturity: 'emerging' | 'growing' | 'mature' | 'declining'
    disruption_risk: number // 0-100
  }
  key_success_factors: string[]
  industry_trends: string[]
  regulatory_factors: string[]
}

interface IndustryComparison {
  metrics: Array<{
    metric_name: string
    company_value: number
    industry_mean: number
    industry_median: number
    percentile: number
    z_score: number
    interpretation: string
  }>
  overall_percentile: number
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
}

export class IndustryComparisonEngine {
  private supabase: any

  // UK SIC Section codes and names
  private readonly sicSections: Record<string, string> = {
    'A': 'Agriculture, Forestry and Fishing',
    'B': 'Mining and Quarrying',
    'C': 'Manufacturing',
    'D': 'Electricity, Gas, Steam',
    'E': 'Water Supply and Waste',
    'F': 'Construction',
    'G': 'Wholesale and Retail Trade',
    'H': 'Transportation and Storage',
    'I': 'Accommodation and Food Service',
    'J': 'Information and Communication',
    'K': 'Financial and Insurance',
    'L': 'Real Estate',
    'M': 'Professional and Technical',
    'N': 'Administrative and Support',
    'O': 'Public Administration',
    'P': 'Education',
    'Q': 'Human Health and Social Work',
    'R': 'Arts and Recreation',
    'S': 'Other Service Activities'
  }

  // Industry-specific key metrics
  private readonly industryKeyMetrics: Record<string, MetricName[]> = {
    'J': ['revenue_growth_yoy', 'profit_margin', 'revenue_per_employee', 'return_on_equity'], // Tech
    'K': ['return_on_assets', 'current_ratio', 'debt_to_equity', 'profit_margin'], // Finance
    'G': ['asset_turnover', 'gross_margin', 'inventory_turnover', 'revenue_growth_yoy'], // Retail
    'C': ['gross_margin', 'operating_margin', 'asset_turnover', 'return_on_assets'], // Manufacturing
    'M': ['revenue_per_employee', 'profit_margin', 'customer_growth_yoy', 'employee_growth_yoy'] // Professional services
  }

  constructor() {
    this.initializeClient()
  }

  private async initializeClient() {
    this.supabase = await createClient()
  }

  /**
   * Perform comprehensive industry comparison
   */
  async compareToIndustry(
    companyId: string,
    options?: {
      industry_code?: string
      size_category?: CompanySize
      geographic_scope?: string
      include_trends?: boolean
    }
  ): Promise<IndustryComparison> {
    try {
      // Get company data and metrics
      const company = await this.getCompanyData(companyId)
      const companyMetrics = await this.getCompanyMetrics(companyId)

      // Determine industry code
      const industryCode = options?.industry_code || await this.getIndustryCode(company)

      // Get industry benchmarks
      const benchmarks = await this.getIndustryBenchmarks(
        industryCode,
        options?.size_category,
        options?.geographic_scope
      )

      // Calculate comparisons for each metric
      const metricComparisons = this.calculateMetricComparisons(companyMetrics, benchmarks)

      // Calculate overall position
      const overallPercentile = this.calculateOverallPercentile(metricComparisons)

      // Identify SWOT elements
      const { strengths, weaknesses, opportunities, threats } = this.performSWOTAnalysis(
        metricComparisons,
        industryCode,
        companyMetrics
      )

      return {
        metrics: metricComparisons,
        overall_percentile: overallPercentile,
        strengths,
        weaknesses,
        opportunities,
        threats
      }
    } catch (error) {
      console.error('[IndustryComparison] Error:', error)
      throw error
    }
  }

  /**
   * Get detailed industry analysis
   */
  async analyzeIndustry(industryCode: string): Promise<IndustryAnalysis> {
    try {
      // Get industry statistics
      const stats = await this.getIndustryStatistics(industryCode)

      // Determine market dynamics
      const marketDynamics = this.analyzeMarketDynamics(stats)

      // Identify key success factors
      const keySuccessFactors = this.identifyKeySuccessFactors(industryCode)

      // Get industry trends
      const trends = this.getIndustryTrends(industryCode)

      // Get regulatory factors
      const regulatoryFactors = this.getRegulatoryFactors(industryCode)

      return {
        industry_code: industryCode,
        industry_name: this.getIndustryName(industryCode),
        company_position: 'average', // Would be determined by actual comparison
        market_dynamics: marketDynamics,
        key_success_factors: keySuccessFactors,
        industry_trends: trends,
        regulatory_factors: regulatoryFactors
      }
    } catch (error) {
      console.error('[IndustryAnalysis] Error:', error)
      throw error
    }
  }

  /**
   * Get company data
   */
  private async getCompanyData(companyId: string): Promise<any> {
    const { data } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single()

    return data
  }

  /**
   * Get company metrics
   */
  private async getCompanyMetrics(companyId: string): Promise<CompanyMetrics> {
    const { data } = await this.supabase
      .from('company_metrics')
      .select('*')
      .eq('company_id', companyId)
      .order('metric_date', { ascending: false })
      .limit(1)
      .single()

    if (!data) {
      // Generate from business data if no metrics exist
      return this.generateMetricsFromBusiness(companyId)
    }

    return data
  }

  /**
   * Generate metrics from business data
   */
  private async generateMetricsFromBusiness(companyId: string): Promise<CompanyMetrics> {
    const { data: business } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single()

    const metrics: CompanyMetrics = {
      company_id: companyId,
      metric_date: new Date().toISOString().split('T')[0]
    }

    // Extract from Companies House data if available
    if (business?.accounts) {
      metrics.revenue = business.accounts.turnover
      metrics.gross_profit = business.accounts.gross_profit
      metrics.net_profit = business.accounts.profit_loss
      metrics.total_assets = business.accounts.total_assets
      metrics.total_liabilities = business.accounts.total_liabilities

      // Calculate ratios
      if (metrics.revenue && metrics.net_profit) {
        metrics.profit_margin = (metrics.net_profit / metrics.revenue) * 100
      }
      if (metrics.total_assets && metrics.total_liabilities) {
        metrics.current_ratio = metrics.total_assets / metrics.total_liabilities
      }
    }

    return metrics
  }

  /**
   * Get industry code for company
   */
  private async getIndustryCode(company: any): Promise<string> {
    if (company?.sic_codes && company.sic_codes.length > 0) {
      // Return 2-digit SIC division
      return company.sic_codes[0].substring(0, 2)
    }

    // Default to Information and Communication
    return '62'
  }

  /**
   * Get industry benchmarks
   */
  private async getIndustryBenchmarks(
    industryCode: string,
    sizeCategory?: CompanySize,
    geographicScope?: string
  ): Promise<IndustryBenchmark[]> {
    let query = this.supabase
      .from('industry_benchmarks')
      .select('*')
      .eq('industry_code', industryCode)

    if (sizeCategory) {
      query = query.eq('company_size_category', sizeCategory)
    }

    if (geographicScope) {
      query = query.eq('geographic_scope', geographicScope)
    }

    const { data } = await query.order('metric_date', { ascending: false })

    if (!data || data.length === 0) {
      // Generate synthetic benchmarks
      return this.generateSyntheticBenchmarks(industryCode)
    }

    return data
  }

  /**
   * Generate synthetic benchmarks for demonstration
   */
  private generateSyntheticBenchmarks(industryCode: string): IndustryBenchmark[] {
    const baseMetrics = {
      'profit_margin': { mean: 12, median: 10, std: 5 },
      'gross_margin': { mean: 40, median: 38, std: 15 },
      'operating_margin': { mean: 15, median: 14, std: 8 },
      'return_on_assets': { mean: 8, median: 7, std: 4 },
      'return_on_equity': { mean: 15, median: 14, std: 7 },
      'current_ratio': { mean: 1.8, median: 1.5, std: 0.6 },
      'debt_to_equity': { mean: 0.8, median: 0.7, std: 0.4 },
      'revenue_growth_yoy': { mean: 10, median: 8, std: 12 },
      'revenue_per_employee': { mean: 150000, median: 125000, std: 75000 },
      'asset_turnover': { mean: 1.5, median: 1.3, std: 0.5 }
    }

    // Adjust based on industry
    const industryMultipliers: Record<string, number> = {
      '62': 1.2, // Tech - higher margins
      '47': 0.8, // Retail - lower margins
      '64': 1.1, // Finance - good returns
      '10': 0.7  // Manufacturing - lower margins
    }

    const multiplier = industryMultipliers[industryCode] || 1.0

    return Object.entries(baseMetrics).map(([metric, values]) => ({
      industry_code: industryCode,
      metric_name: metric,
      metric_date: new Date().toISOString().split('T')[0],
      mean_value: values.mean * multiplier,
      median_value: values.median * multiplier,
      min_value: (values.median - 2 * values.std) * multiplier,
      max_value: (values.median + 2 * values.std) * multiplier,
      std_deviation: values.std * multiplier,
      p10_value: (values.median - 1.28 * values.std) * multiplier,
      p25_value: (values.median - 0.67 * values.std) * multiplier,
      p75_value: (values.median + 0.67 * values.std) * multiplier,
      p90_value: (values.median + 1.28 * values.std) * multiplier,
      sample_size: 100
    }))
  }

  /**
   * Calculate metric comparisons
   */
  private calculateMetricComparisons(
    companyMetrics: CompanyMetrics,
    benchmarks: IndustryBenchmark[]
  ): any[] {
    const comparisons = []

    for (const benchmark of benchmarks) {
      const metricName = benchmark.metric_name as keyof CompanyMetrics
      const companyValue = companyMetrics[metricName] as number

      if (companyValue === undefined || companyValue === null) continue

      const percentile = this.calculatePercentile(companyValue, benchmark)
      const zScore = this.calculateZScore(companyValue, benchmark)

      comparisons.push({
        metric_name: benchmark.metric_name,
        company_value: companyValue,
        industry_mean: benchmark.mean_value || 0,
        industry_median: benchmark.median_value || 0,
        percentile,
        z_score: zScore,
        interpretation: this.interpretMetricPosition(benchmark.metric_name, percentile, zScore)
      })
    }

    return comparisons
  }

  /**
   * Calculate percentile position
   */
  private calculatePercentile(value: number, benchmark: IndustryBenchmark): number {
    if (!benchmark.median_value) return 50

    // Use available percentile data
    if (value <= benchmark.p10_value!) return 10
    if (value <= benchmark.p25_value!) return 25
    if (value <= benchmark.median_value) return 50
    if (value <= benchmark.p75_value!) return 75
    if (value <= benchmark.p90_value!) return 90

    return 95
  }

  /**
   * Calculate Z-score
   */
  private calculateZScore(value: number, benchmark: IndustryBenchmark): number {
    if (!benchmark.mean_value || !benchmark.std_deviation) return 0
    if (benchmark.std_deviation === 0) return 0

    return (value - benchmark.mean_value) / benchmark.std_deviation
  }

  /**
   * Interpret metric position
   */
  private interpretMetricPosition(
    metricName: string,
    percentile: number,
    zScore: number
  ): string {
    if (percentile >= 90) return `Excellent - Top 10% in industry`
    if (percentile >= 75) return `Strong - Above industry average`
    if (percentile >= 25) return `Average - Within industry norms`
    if (percentile >= 10) return `Below Average - Room for improvement`
    return `Weak - Significant improvement needed`
  }

  /**
   * Calculate overall percentile
   */
  private calculateOverallPercentile(comparisons: any[]): number {
    if (comparisons.length === 0) return 50

    const percentiles = comparisons.map(c => c.percentile)
    return Math.round(percentiles.reduce((a, b) => a + b, 0) / percentiles.length)
  }

  /**
   * Perform SWOT analysis
   */
  private performSWOTAnalysis(
    comparisons: any[],
    industryCode: string,
    metrics: CompanyMetrics
  ): { strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const opportunities: string[] = []
    const threats: string[] = []

    // Identify strengths and weaknesses from metrics
    comparisons.forEach(comp => {
      if (comp.percentile >= 75) {
        strengths.push(`Strong ${this.getMetricLabel(comp.metric_name)} (${comp.percentile}th percentile)`)
      } else if (comp.percentile <= 25) {
        weaknesses.push(`Weak ${this.getMetricLabel(comp.metric_name)} (${comp.percentile}th percentile)`)
      }
    })

    // Industry-specific opportunities and threats
    const industryOpportunities = this.getIndustryOpportunities(industryCode)
    const industryThreats = this.getIndustryThreats(industryCode)

    opportunities.push(...industryOpportunities)
    threats.push(...industryThreats)

    // Growth-based opportunities
    const growthMetric = comparisons.find(c => c.metric_name === 'revenue_growth_yoy')
    if (growthMetric && growthMetric.percentile > 60) {
      opportunities.push('Strong growth momentum for market expansion')
    }

    return { strengths, weaknesses, opportunities, threats }
  }

  /**
   * Get metric label
   */
  private getMetricLabel(metricName: string): string {
    const labels: Record<string, string> = {
      'profit_margin': 'Profit Margin',
      'gross_margin': 'Gross Margin',
      'operating_margin': 'Operating Margin',
      'return_on_assets': 'Return on Assets',
      'return_on_equity': 'Return on Equity',
      'current_ratio': 'Current Ratio',
      'debt_to_equity': 'Debt to Equity',
      'revenue_growth_yoy': 'Revenue Growth',
      'revenue_per_employee': 'Revenue per Employee',
      'asset_turnover': 'Asset Turnover'
    }
    return labels[metricName] || metricName
  }

  /**
   * Get industry opportunities
   */
  private getIndustryOpportunities(industryCode: string): string[] {
    const opportunities: Record<string, string[]> = {
      '62': [ // Tech
        'Digital transformation demand',
        'Cloud migration opportunities',
        'AI/ML adoption growth'
      ],
      '47': [ // Retail
        'E-commerce expansion',
        'Omnichannel integration',
        'Direct-to-consumer growth'
      ],
      '64': [ // Finance
        'Fintech partnerships',
        'Digital banking adoption',
        'Regulatory technology opportunities'
      ]
    }

    return opportunities[industryCode] || ['Market expansion opportunities', 'Digital transformation']
  }

  /**
   * Get industry threats
   */
  private getIndustryThreats(industryCode: string): string[] {
    const threats: Record<string, string[]> = {
      '62': [ // Tech
        'Increasing competition',
        'Talent shortage',
        'Rapid technology changes'
      ],
      '47': [ // Retail
        'Supply chain disruptions',
        'Changing consumer behavior',
        'Price competition'
      ],
      '64': [ // Finance
        'Regulatory changes',
        'Cybersecurity risks',
        'Fintech disruption'
      ]
    }

    return threats[industryCode] || ['Market competition', 'Economic uncertainty']
  }

  /**
   * Get industry statistics
   */
  private async getIndustryStatistics(industryCode: string): Promise<any> {
    const { data } = await this.supabase
      .from('industry_benchmarks')
      .select('*')
      .eq('industry_code', industryCode)
      .order('metric_date', { ascending: false })
      .limit(100)

    return data || []
  }

  /**
   * Analyze market dynamics
   */
  private analyzeMarketDynamics(stats: any[]): any {
    // Analyze growth trends
    const growthMetrics = stats.filter(s => s.metric_name === 'revenue_growth_yoy')
    const avgGrowth = growthMetrics.length > 0
      ? growthMetrics.reduce((a, b) => a + (b.median_value || 0), 0) / growthMetrics.length
      : 10

    // Determine market maturity
    let maturity: 'emerging' | 'growing' | 'mature' | 'declining' = 'growing'
    if (avgGrowth > 20) maturity = 'emerging'
    else if (avgGrowth > 10) maturity = 'growing'
    else if (avgGrowth > 0) maturity = 'mature'
    else maturity = 'declining'

    return {
      growth_rate: avgGrowth,
      competition_intensity: 'medium' as const,
      market_maturity: maturity,
      disruption_risk: maturity === 'mature' ? 60 : 30
    }
  }

  /**
   * Identify key success factors
   */
  private identifyKeySuccessFactors(industryCode: string): string[] {
    const factors: Record<string, string[]> = {
      '62': [ // Tech
        'Innovation and R&D capability',
        'Technical talent retention',
        'Scalable technology infrastructure',
        'Customer acquisition efficiency'
      ],
      '47': [ // Retail
        'Supply chain efficiency',
        'Customer experience',
        'Inventory management',
        'Location strategy'
      ],
      '64': [ // Finance
        'Risk management',
        'Regulatory compliance',
        'Technology infrastructure',
        'Customer trust'
      ]
    }

    return factors[industryCode] || [
      'Operational efficiency',
      'Customer satisfaction',
      'Financial management',
      'Innovation capability'
    ]
  }

  /**
   * Get industry trends
   */
  private getIndustryTrends(industryCode: string): string[] {
    const trends: Record<string, string[]> = {
      '62': [
        'AI and machine learning adoption',
        'Cloud-first strategies',
        'Cybersecurity focus',
        'Remote work normalization'
      ],
      '47': [
        'Omnichannel retail',
        'Sustainability focus',
        'Personalization',
        'Social commerce'
      ],
      '64': [
        'Open banking',
        'Cryptocurrency adoption',
        'ESG investing',
        'Digital-only services'
      ]
    }

    return trends[industryCode] || [
      'Digital transformation',
      'Sustainability initiatives',
      'Customer experience focus',
      'Operational automation'
    ]
  }

  /**
   * Get regulatory factors
   */
  private getRegulatoryFactors(industryCode: string): string[] {
    const factors: Record<string, string[]> = {
      '62': [
        'Data protection (GDPR)',
        'Cybersecurity regulations',
        'AI governance',
        'Intellectual property'
      ],
      '47': [
        'Consumer protection',
        'Product safety standards',
        'Environmental regulations',
        'Labor laws'
      ],
      '64': [
        'Banking regulations',
        'Anti-money laundering',
        'Capital requirements',
        'Consumer credit regulations'
      ]
    }

    return factors[industryCode] || [
      'General business regulations',
      'Tax compliance',
      'Employment law',
      'Health and safety'
    ]
  }

  /**
   * Get industry name from code
   */
  private getIndustryName(industryCode: string): string {
    // Map common 2-digit SIC codes to names
    const industryNames: Record<string, string> = {
      '01': 'Agriculture',
      '10': 'Manufacturing - Food',
      '47': 'Retail Trade',
      '62': 'Computer Programming',
      '63': 'Information Services',
      '64': 'Financial Services',
      '68': 'Real Estate',
      '69': 'Legal and Accounting',
      '70': 'Management Consultancy',
      '86': 'Healthcare'
    }

    return industryNames[industryCode] || `Industry ${industryCode}`
  }
}

// Export singleton instance
export const industryComparisonEngine = new IndustryComparisonEngine()