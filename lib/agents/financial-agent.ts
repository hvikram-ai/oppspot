/**
 * Financial Analysis Agent
 * Specialized agent for financial health and funding analysis
 */

import { BaseAgent } from './base-agent'
import type { AgentAnalysis, ResearchContext, OppspotAgentType } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

// ============================================================================
// FINANCIAL ANALYSIS AGENT
// ============================================================================

export class FinancialAgent extends BaseAgent {
  constructor() {
    super(getDefaultAgentConfig('financial' as OppspotAgentType))
  }

  /**
   * Analyze company from financial perspective
   */
  async analyze(
    context: ResearchContext,
    specificQuery?: string
  ): Promise<AgentAnalysis> {
    const startTime = Date.now()

    try {
      console.log(`[${this.config.name}] Analyzing ${context.companyData.name}...`)

      // Build specialized financial context
      const financialContext = this.buildFinancialContext(context)

      // Build prompt
      const query = specificQuery || `Analyze the financial health and trajectory of ${context.companyData.name}.`
      const prompt = this.buildAnalysisPrompt(query, financialContext)

      // Execute LLM request
      const content = await this.executeLLM(prompt)

      // Extract structured insights
      const keyInsights = this.extractKeyInsights(content)
      const concerns = this.extractConcerns(content)
      const recommendations = this.extractRecommendations(content)

      // Calculate confidence
      const confidence = this.calculateFinancialConfidence(context)

      // Extract sources
      const sources = this.extractSources(context)

      const processingTime = Date.now() - startTime
      console.log(`[${this.config.name}] Analysis complete in ${processingTime}ms`)

      return {
        agentType: this.config.type,
        content,
        keyInsights,
        concerns,
        recommendations,
        confidence,
        sources,
        metadata: {
          processing_time_ms: processingTime,
          model_used: this.config.model,
        },
      }
    } catch (error) {
      console.error(`[${this.config.name}] Analysis error:`, error)
      throw error
    }
  }

  /**
   * Build financial context from research data
   */
  private buildFinancialContext(context: ResearchContext): string {
    const sections: string[] = []

    // Company basics
    sections.push('## Company Overview')
    sections.push(`Name: ${context.companyData.name}`)
    if (context.companyData.founded_date) {
      sections.push(`Founded: ${context.companyData.founded_date}`)
    }
    if (context.companyData.employee_count) {
      sections.push(`Employees: ${context.companyData.employee_count}`)
    }

    // Financial data
    if (context.financialData.length > 0) {
      sections.push('\n## Financial Data (from Companies House)')
      context.financialData.forEach((data) => {
        const parts = [`Year ${data.year}`]
        if (data.revenue) parts.push(`Revenue: £${data.revenue.toLocaleString()}`)
        if (data.growth) parts.push(`YoY Growth: ${data.growth}%`)
        if (data.profit) parts.push(`Profit: £${data.profit.toLocaleString()}`)
        if (data.assets) parts.push(`Assets: £${data.assets.toLocaleString()}`)
        if (data.liabilities) parts.push(`Liabilities: £${data.liabilities.toLocaleString()}`)
        if (data.cash) parts.push(`Cash: £${data.cash.toLocaleString()}`)
        sections.push(parts.join(' | '))
      })
    }

    // Funding history
    if (context.companyData.fundingRounds && context.companyData.fundingRounds.length > 0) {
      sections.push('\n## Funding History')
      context.companyData.fundingRounds.forEach((round) => {
        sections.push(`${round.date}: ${round.type} - ${round.amount}`)
        sections.push(`  Investors: ${round.investors.join(', ')}`)
        if (round.valuation) {
          sections.push(`  Valuation: ${round.valuation}`)
        }
      })
    }

    // Financial news
    const financialNews = context.newsArticles.filter((article) =>
      article.title.toLowerCase().match(/funding|revenue|profit|loss|financial|investment|ipo|acquisition/)
    )

    if (financialNews.length > 0) {
      sections.push('\n## Recent Financial News')
      financialNews.slice(0, 5).forEach((article) => {
        sections.push(`- ${article.title}`)
        if (article.summary) {
          sections.push(`  ${article.summary}`)
        }
        sections.push(`  Source: ${article.source} (${article.published_date || 'No date'})`)
      })
    }

    return sections.join('\n')
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(query: string, financialContext: string): string {
    return `${financialContext}

## Analysis Request
${query}

## Instructions
Provide a comprehensive financial analysis including:

1. **Financial Health Score** (A-F rating with clear rationale)
2. **Revenue Trajectory** (growth trends, seasonality, sustainability)
3. **Funding Analysis** (funding history, investor quality, capital efficiency)
4. **Profitability Assessment** (margins, unit economics, path to profitability)
5. **Financial Risks** (burn rate, runway, cash flow concerns)
6. **Budget Availability** (signals of purchasing power for B2B sales)

IMPORTANT:
- Use specific numbers, dates, and percentages from the context
- Compare to industry benchmarks where possible
- Flag missing critical financial data
- Provide actionable insights for B2B sales teams
- Highlight recent changes (last 12 months)
- Include confidence level for each assessment`
  }

  /**
   * Calculate financial confidence based on data availability
   */
  private calculateFinancialConfidence(context: ResearchContext): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence based on available financial data
    if (context.financialData.length > 0) {
      confidence += 0.2
      if (context.financialData.length >= 3) confidence += 0.1 // Multi-year data
    }

    if (context.companyData.fundingRounds && context.companyData.fundingRounds.length > 0) {
      confidence += 0.1
    }

    // Check for recent financial news
    const financialNews = context.newsArticles.filter((article) =>
      article.title.toLowerCase().match(/funding|revenue|financial/)
    )
    if (financialNews.length > 0) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: FinancialAgent | null = null

export function getFinancialAgent(): FinancialAgent {
  if (!instance) {
    instance = new FinancialAgent()
  }
  return instance
}

export default FinancialAgent
