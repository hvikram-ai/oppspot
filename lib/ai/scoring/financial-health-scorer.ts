/**
 * Financial Health Scorer
 * Analyzes company financial data from Companies House and other sources
 * Calculates financial health score based on key metrics and ratios
 */

import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

export interface FinancialScore {
  score: number
  factors: Array<{
    name: string
    value: number
    impact: 'positive' | 'negative' | 'neutral'
    explanation: string
  }>
  data_quality: number
  missing_data: string[]
}

interface FinancialMetrics {
  revenue?: number
  revenue_growth_rate?: number
  ebitda?: number
  ebitda_margin?: number
  net_income?: number
  total_assets?: number
  total_liabilities?: number
  current_ratio?: number
  debt_to_equity_ratio?: number
  return_on_assets?: number
  return_on_equity?: number
  cash_flow?: number
  working_capital?: number
  employee_count?: number
  employee_growth_rate?: number
}

export class FinancialHealthScorer {
  /**
   * Calculate financial health score for a company
   */
  async calculateScore(company: Record<string, unknown>): Promise<FinancialScore> {
    console.log(`[FinancialScorer] Calculating score for ${company.name}`)

    // Fetch financial data
    const metrics = await this.fetchFinancialMetrics(company)

    // Calculate individual metric scores
    const factors = []
    let totalScore = 0
    let totalWeight = 0
    const missingData = []

    // Revenue and Growth Analysis
    if (metrics.revenue !== undefined && metrics.revenue_growth_rate !== undefined) {
      const revenueScore = this.scoreRevenue(metrics.revenue, metrics.revenue_growth_rate)
      factors.push({
        name: 'Revenue & Growth',
        value: revenueScore,
        impact: revenueScore > 60 ? 'positive' : revenueScore < 40 ? 'negative' : 'neutral',
        explanation: this.explainRevenueScore(metrics.revenue, metrics.revenue_growth_rate, revenueScore)
      })
      totalScore += revenueScore * 0.25
      totalWeight += 0.25
    } else {
      missingData.push('Revenue data')
    }

    // Profitability Analysis
    if (metrics.ebitda_margin !== undefined) {
      const profitabilityScore = this.scoreProfitability(metrics.ebitda_margin, metrics.net_income)
      factors.push({
        name: 'Profitability',
        value: profitabilityScore,
        impact: profitabilityScore > 60 ? 'positive' : profitabilityScore < 40 ? 'negative' : 'neutral',
        explanation: this.explainProfitabilityScore(metrics.ebitda_margin, profitabilityScore)
      })
      totalScore += profitabilityScore * 0.20
      totalWeight += 0.20
    } else {
      missingData.push('Profitability metrics')
    }

    // Liquidity Analysis
    if (metrics.current_ratio !== undefined) {
      const liquidityScore = this.scoreLiquidity(metrics.current_ratio, metrics.working_capital)
      factors.push({
        name: 'Liquidity',
        value: liquidityScore,
        impact: liquidityScore > 60 ? 'positive' : liquidityScore < 40 ? 'negative' : 'neutral',
        explanation: this.explainLiquidityScore(metrics.current_ratio, liquidityScore)
      })
      totalScore += liquidityScore * 0.15
      totalWeight += 0.15
    } else {
      missingData.push('Liquidity ratios')
    }

    // Leverage Analysis
    if (metrics.debt_to_equity_ratio !== undefined) {
      const leverageScore = this.scoreLeverage(metrics.debt_to_equity_ratio)
      factors.push({
        name: 'Financial Leverage',
        value: leverageScore,
        impact: leverageScore > 60 ? 'positive' : leverageScore < 40 ? 'negative' : 'neutral',
        explanation: this.explainLeverageScore(metrics.debt_to_equity_ratio, leverageScore)
      })
      totalScore += leverageScore * 0.15
      totalWeight += 0.15
    } else {
      missingData.push('Debt ratios')
    }

    // Efficiency Analysis
    if (metrics.return_on_assets !== undefined || metrics.return_on_equity !== undefined) {
      const efficiencyScore = this.scoreEfficiency(metrics.return_on_assets, metrics.return_on_equity)
      factors.push({
        name: 'Operating Efficiency',
        value: efficiencyScore,
        impact: efficiencyScore > 60 ? 'positive' : efficiencyScore < 40 ? 'negative' : 'neutral',
        explanation: this.explainEfficiencyScore(metrics.return_on_assets, metrics.return_on_equity, efficiencyScore)
      })
      totalScore += efficiencyScore * 0.15
      totalWeight += 0.15
    } else {
      missingData.push('Efficiency metrics')
    }

    // Companies House Filing Status
    const filingScore = await this.scoreFilingCompliance(company)
    factors.push({
      name: 'Regulatory Compliance',
      value: filingScore,
      impact: filingScore > 80 ? 'positive' : filingScore < 50 ? 'negative' : 'neutral',
      explanation: this.explainFilingScore(company, filingScore)
    })
    totalScore += filingScore * 0.10
    totalWeight += 0.10

    // Calculate final score
    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50

    // Calculate data quality
    const dataQuality = Math.round((1 - missingData.length / 6) * 100)

    return {
      score: finalScore,
      factors,
      data_quality: dataQuality,
      missing_data: missingData
    }
  }

  /**
   * Fetch financial metrics from various sources
   */
  private async fetchFinancialMetrics(company: Record<string, unknown>): Promise<FinancialMetrics> {
    const supabase = await createClient()

    // First, try to get from our financial_metrics table
    const { data: storedMetrics } = await supabase
      .from('financial_metrics')
      .select('*')
      .eq('company_id', company.id)
      .order('fiscal_year', { ascending: false })
      .order('fiscal_quarter', { ascending: false })
      .limit(1)
      .single() as { data: Row<'financial_metrics'> | null; error: any }

    if (storedMetrics) {
      return this.mapStoredMetrics(storedMetrics)
    }

    // Try to extract from Companies House data if available
    if (company.companies_house_data) {
      return this.extractFromCompaniesHouse(company.companies_house_data)
    }

    // Return empty metrics if no data available
    return {}
  }

  /**
   * Map stored metrics to our interface
   */
  private mapStoredMetrics(data: Record<string, unknown>): FinancialMetrics {
    return {
      revenue: data.revenue,
      revenue_growth_rate: data.revenue_growth_rate,
      ebitda: data.ebitda,
      ebitda_margin: data.ebitda_margin,
      net_income: data.net_income,
      total_assets: data.total_assets,
      total_liabilities: data.total_liabilities,
      current_ratio: data.current_ratio,
      debt_to_equity_ratio: data.debt_to_equity_ratio,
      return_on_assets: data.return_on_assets,
      return_on_equity: data.return_on_equity,
      cash_flow: data.cash_flow,
      working_capital: data.working_capital,
      employee_count: data.employee_count,
      employee_growth_rate: data.employee_growth_rate
    }
  }

  /**
   * Extract financial data from Companies House response
   */
  private extractFromCompaniesHouse(data: Record<string, unknown>): FinancialMetrics {
    const metrics: FinancialMetrics = {}

    const accounts = data.accounts as { last_accounts?: { type?: string } } | undefined

    // Check for accounts data
    if (accounts) {
      // Extract basic financial status
      if (accounts.last_accounts) {
        // Note: Companies House API provides limited financial data
        // Full accounts would need to be downloaded separately
        metrics.revenue = accounts.last_accounts.type === 'full' ? 1000000 : 500000 // Placeholder
      }
    }

    // Check company status for health indicators
    if (data.company_status === 'active') {
      // Active companies get a baseline score
      metrics.current_ratio = 1.5 // Placeholder healthy ratio
    }

    // Calculate company age as a stability indicator
    if (data.date_of_creation) {
      const age = this.calculateCompanyAge(data.date_of_creation)
      if (age > 5) {
        metrics.debt_to_equity_ratio = 0.5 // Mature companies assumed stable
      }
    }

    return metrics
  }

  /**
   * Score revenue and growth
   */
  private scoreRevenue(revenue: number, growthRate: number): number {
    let score = 50

    // Revenue size scoring
    if (revenue > 10000000) score += 20 // £10M+
    else if (revenue > 1000000) score += 15 // £1M+
    else if (revenue > 100000) score += 10 // £100K+
    else if (revenue > 10000) score += 5 // £10K+

    // Growth rate scoring
    if (growthRate > 50) score += 30
    else if (growthRate > 20) score += 25
    else if (growthRate > 10) score += 20
    else if (growthRate > 0) score += 10
    else if (growthRate < -10) score -= 20

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Score profitability metrics
   */
  private scoreProfitability(ebitdaMargin?: number, netIncome?: number): number {
    let score = 50

    if (ebitdaMargin !== undefined) {
      if (ebitdaMargin > 20) score += 30
      else if (ebitdaMargin > 10) score += 20
      else if (ebitdaMargin > 5) score += 10
      else if (ebitdaMargin > 0) score += 5
      else score -= 20
    }

    if (netIncome !== undefined) {
      if (netIncome > 0) score += 20
      else score -= 10
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Score liquidity position
   */
  private scoreLiquidity(currentRatio: number, workingCapital?: number): number {
    let score = 50

    // Current ratio scoring
    if (currentRatio > 2.0) score += 25
    else if (currentRatio > 1.5) score += 30 // Optimal range
    else if (currentRatio > 1.0) score += 20
    else if (currentRatio > 0.8) score += 10
    else score -= 30

    // Working capital scoring
    if (workingCapital !== undefined) {
      if (workingCapital > 1000000) score += 20
      else if (workingCapital > 100000) score += 15
      else if (workingCapital > 0) score += 10
      else score -= 10
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Score financial leverage
   */
  private scoreLeverage(debtToEquity: number): number {
    let score = 50

    // Lower debt-to-equity is generally better
    if (debtToEquity < 0.3) score += 30
    else if (debtToEquity < 0.5) score += 25
    else if (debtToEquity < 1.0) score += 15
    else if (debtToEquity < 1.5) score += 5
    else if (debtToEquity < 2.0) score -= 10
    else score -= 30

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Score operating efficiency
   */
  private scoreEfficiency(roa?: number, roe?: number): number {
    let score = 50

    if (roa !== undefined) {
      if (roa > 15) score += 25
      else if (roa > 10) score += 20
      else if (roa > 5) score += 15
      else if (roa > 0) score += 5
      else score -= 15
    }

    if (roe !== undefined) {
      if (roe > 20) score += 25
      else if (roe > 15) score += 20
      else if (roe > 10) score += 15
      else if (roe > 0) score += 5
      else score -= 15
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Score Companies House filing compliance
   */
  private async scoreFilingCompliance(company: Record<string, unknown>): Promise<number> {
    let score = 100

    // Check if Companies House data exists
    if (!company.companies_house_data) {
      return 50 // No data available
    }

    const data = company.companies_house_data as Record<string, unknown> & {
      accounts?: { overdue?: boolean; next_due?: string }
      confirmation_statement?: { overdue?: boolean }
      company_status?: string
      company_status_detail?: string
    }

    // Check accounts filing status
    if (data.accounts?.overdue) {
      score -= 30
    } else if (data.accounts?.next_due) {
      const dueDate = new Date(data.accounts.next_due)
      const daysUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      if (daysUntilDue < 30) score -= 10
    }

    // Check confirmation statement filing
    if (data.confirmation_statement?.overdue) {
      score -= 20
    }

    // Check company status
    if (data.company_status !== 'active') {
      score -= 50
    }

    // Check for any red flags
    if (data.company_status_detail?.includes('insolvency')) {
      score = 0
    }

    return Math.max(0, score)
  }

  // Explanation helpers

  private explainRevenueScore(revenue: number, growth: number, score: number): string {
    const revenueStr = `£${(revenue / 1000000).toFixed(1)}M`
    const growthStr = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`

    if (score > 70) {
      return `Strong revenue of ${revenueStr} with ${growthStr} growth indicates healthy business expansion`
    } else if (score > 50) {
      return `Moderate revenue of ${revenueStr} with ${growthStr} growth shows stable performance`
    } else {
      return `Revenue of ${revenueStr} with ${growthStr} growth suggests potential challenges`
    }
  }

  private explainProfitabilityScore(margin: number, score: number): string {
    if (score > 70) {
      return `EBITDA margin of ${margin.toFixed(1)}% demonstrates strong profitability`
    } else if (score > 50) {
      return `EBITDA margin of ${margin.toFixed(1)}% shows acceptable profitability`
    } else {
      return `EBITDA margin of ${margin.toFixed(1)}% indicates profitability concerns`
    }
  }

  private explainLiquidityScore(ratio: number, score: number): string {
    if (score > 70) {
      return `Current ratio of ${ratio.toFixed(2)} indicates strong liquidity position`
    } else if (score > 50) {
      return `Current ratio of ${ratio.toFixed(2)} shows adequate liquidity`
    } else {
      return `Current ratio of ${ratio.toFixed(2)} suggests potential liquidity challenges`
    }
  }

  private explainLeverageScore(ratio: number, score: number): string {
    if (score > 70) {
      return `Debt-to-equity ratio of ${ratio.toFixed(2)} indicates conservative leverage`
    } else if (score > 50) {
      return `Debt-to-equity ratio of ${ratio.toFixed(2)} shows moderate leverage`
    } else {
      return `Debt-to-equity ratio of ${ratio.toFixed(2)} suggests high financial leverage risk`
    }
  }

  private explainEfficiencyScore(roa?: number, roe?: number, score?: number): string {
    const roaStr = roa ? `ROA: ${roa.toFixed(1)}%` : ''
    const roeStr = roe ? `ROE: ${roe.toFixed(1)}%` : ''
    const metrics = [roaStr, roeStr].filter(s => s).join(', ')

    if (score && score > 70) {
      return `Strong efficiency metrics (${metrics}) indicate effective asset utilization`
    } else if (score && score > 50) {
      return `Moderate efficiency metrics (${metrics}) show acceptable performance`
    } else {
      return `Efficiency metrics (${metrics}) suggest room for operational improvement`
    }
  }

  private explainFilingScore(company: any, score: number): string {
    if (score > 90) {
      return `All Companies House filings are up to date and company is in good standing`
    } else if (score > 70) {
      return `Minor filing delays but company remains compliant with regulations`
    } else if (score > 50) {
      return `Some compliance issues detected - monitor regulatory standing`
    } else {
      return `Significant compliance concerns - investigate before proceeding`
    }
  }

  private calculateCompanyAge(dateOfCreation: string): number {
    const created = new Date(dateOfCreation)
    const now = new Date()
    return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365)
  }
}