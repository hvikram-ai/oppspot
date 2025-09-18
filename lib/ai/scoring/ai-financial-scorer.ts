/**
 * AI-Enhanced Financial Health Scorer
 * Uses Ollama LLMs for intelligent financial analysis
 * Provides both AI and rule-based scoring with seamless fallback
 */

import { createClient } from '@/lib/supabase/server'
import { getOllamaClient, isOllamaEnabled } from '@/lib/ai/ollama'
import { FinancialScore } from './financial-health-scorer'

export class AIFinancialScorer {
  private ollama = getOllamaClient()

  /**
   * Calculate financial score with AI intelligence
   */
  async calculateScore(company: any): Promise<FinancialScore> {
    console.log(`[AIFinancialScorer] Analyzing ${company.name}`)

    // Check if AI is available
    if (!isOllamaEnabled() || !(await this.isOllamaAvailable())) {
      console.log('[AIFinancialScorer] Falling back to rule-based scoring')
      return this.calculateRuleBasedScore(company)
    }

    try {
      // Gather all financial data
      const financialContext = await this.gatherFinancialContext(company)

      // Perform AI analysis
      const aiAnalysis = await this.performAIAnalysis(financialContext)

      // Parse and structure the response
      return this.structureAIResponse(aiAnalysis, company)

    } catch (error) {
      console.error('[AIFinancialScorer] AI analysis failed, using rules:', error)
      return this.calculateRuleBasedScore(company)
    }
  }

  /**
   * Gather comprehensive financial context for AI analysis
   */
  private async gatherFinancialContext(company: any): Promise<string> {
    const supabase = await createClient()

    // Fetch stored financial metrics
    const { data: metrics } = await supabase
      .from('financial_metrics')
      .select('*')
      .eq('company_id', company.id)
      .order('fiscal_year', { ascending: false })
      .limit(3) // Get last 3 years

    // Build comprehensive context
    let context = `
    COMPANY PROFILE:
    Name: ${company.name}
    Company Number: ${company.company_number || 'Not provided'}
    Status: ${company.company_status || 'Unknown'}
    Type: ${company.company_type || 'Unknown'}
    Incorporated: ${company.incorporation_date || 'Unknown'}
    Age: ${this.calculateCompanyAge(company.incorporation_date)} years
    Industry (SIC): ${company.sic_codes?.join(', ') || 'Not specified'}
    Location: ${company.registered_office_address?.locality || 'UK'}
    `

    // Add Companies House data if available
    if (company.companies_house_data) {
      const ch = company.companies_house_data
      context += `

    REGULATORY COMPLIANCE:
    Accounts Next Due: ${ch.accounts?.next_due || 'N/A'}
    Accounts Overdue: ${ch.accounts?.overdue ? 'YES - RED FLAG' : 'No'}
    Last Accounts Filed: ${ch.accounts?.last_accounts?.made_up_to || 'Never'}
    Account Type: ${ch.accounts?.last_accounts?.type || 'Unknown'}
    Confirmation Statement Due: ${ch.confirmation_statement?.next_due || 'N/A'}
    Statement Overdue: ${ch.confirmation_statement?.overdue ? 'YES - RED FLAG' : 'No'}
    Jurisdiction: ${ch.jurisdiction || 'england-wales'}
    Has Charges: ${ch.has_charges ? 'YES' : 'No'}
    Has Insolvency History: ${ch.has_insolvency_history ? 'YES - MAJOR RED FLAG' : 'No'}
    `

      // Add officer information if available
      if (ch.officers?.active_count) {
        context += `
    Officers: ${ch.officers.active_count} active, ${ch.officers.resigned_count || 0} resigned
    `
      }
    }

    // Add financial metrics if available
    if (metrics && metrics.length > 0) {
      context += `

    FINANCIAL METRICS (Latest Available):
    `
      const latest = metrics[0]
      if (latest.revenue) context += `Revenue: £${(latest.revenue / 1000000).toFixed(2)}M\n`
      if (latest.revenue_growth_rate) context += `Revenue Growth: ${latest.revenue_growth_rate}%\n`
      if (latest.ebitda) context += `EBITDA: £${(latest.ebitda / 1000000).toFixed(2)}M\n`
      if (latest.ebitda_margin) context += `EBITDA Margin: ${latest.ebitda_margin}%\n`
      if (latest.net_income) context += `Net Income: £${(latest.net_income / 1000000).toFixed(2)}M\n`
      if (latest.current_ratio) context += `Current Ratio: ${latest.current_ratio}\n`
      if (latest.debt_to_equity_ratio) context += `Debt/Equity: ${latest.debt_to_equity_ratio}\n`
      if (latest.employee_count) context += `Employees: ${latest.employee_count}\n`

      // Add trend analysis if multiple years available
      if (metrics.length > 1) {
        context += `

    TRENDS (Year-over-Year):
    `
        const previous = metrics[1]
        if (latest.revenue && previous.revenue) {
          const revChange = ((latest.revenue - previous.revenue) / previous.revenue * 100).toFixed(1)
          context += `Revenue Change: ${revChange}%\n`
        }
        if (latest.employee_count && previous.employee_count) {
          const empChange = latest.employee_count - previous.employee_count
          context += `Employee Change: ${empChange > 0 ? '+' : ''}${empChange}\n`
        }
      }
    }

    // Add market context
    context += `

    MARKET CONTEXT:
    Industry Sector: ${this.getIndustrySector(company.sic_codes)}
    Typical Industry Margins: ${this.getIndustryBenchmarks(company.sic_codes).margin}%
    Industry Risk Level: ${this.getIndustryBenchmarks(company.sic_codes).risk}
    Economic Climate: Current UK economic conditions with inflation concerns
    `

    return context
  }

  /**
   * Perform AI analysis using Ollama
   */
  private async performAIAnalysis(context: string): Promise<any> {
    const prompt = `
    You are an expert financial analyst specializing in UK company assessment.
    Analyze the following company's financial health and provide a comprehensive risk assessment.

    ${context}

    Perform a thorough financial health analysis considering:
    1. Regulatory compliance and filing discipline
    2. Financial stability indicators
    3. Growth trajectory and momentum
    4. Liquidity and solvency position
    5. Industry-specific risk factors
    6. Red flags and warning signs
    7. Positive indicators and strengths

    IMPORTANT: Be conservative in your assessment. If data is missing, note it as a concern.
    Look for both explicit red flags (overdue filings, insolvency history) and subtle warning signs.

    Provide your analysis in the following JSON structure:
    {
      "overall_score": <0-100 where 100 is excellent financial health>,
      "confidence": "<high|medium|low based on data completeness>",
      "risk_level": "<low|medium|high|critical>",
      "financial_stability": {
        "score": <0-100>,
        "assessment": "<brief assessment>",
        "key_indicators": ["<indicator1>", "<indicator2>"]
      },
      "growth_momentum": {
        "score": <0-100>,
        "trend": "<growing|stable|declining|uncertain>",
        "drivers": ["<driver1>", "<driver2>"]
      },
      "compliance_status": {
        "score": <0-100>,
        "issues": ["<issue1 if any>"],
        "strengths": ["<strength1>"]
      },
      "liquidity_position": {
        "score": <0-100>,
        "assessment": "<healthy|adequate|concerning|critical>",
        "explanation": "<brief explanation>"
      },
      "red_flags": ["<critical issue 1>", "<critical issue 2>"],
      "positive_signals": ["<strength 1>", "<strength 2>"],
      "key_recommendations": ["<action 1>", "<action 2>", "<action 3>"],
      "summary": "<2-3 sentence executive summary>"
    }

    Respond with ONLY the JSON object, no additional text.
    `

    const response = await this.ollama.complete(prompt, {
      model: 'mistral:7b', // Use larger model for financial analysis
      temperature: 0.2, // Low temperature for consistent financial analysis
      max_tokens: 800,
      system_prompt: 'You are a conservative financial analyst. Prioritize risk identification.'
    })

    // Parse the JSON response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.error('[AIFinancialScorer] Failed to parse AI response:', error)
      throw new Error('Invalid AI response format')
    }

    throw new Error('No valid JSON in AI response')
  }

  /**
   * Structure AI response into FinancialScore format
   */
  private structureAIResponse(aiAnalysis: any, company: any): FinancialScore {
    const factors = []

    // Add financial stability factor
    if (aiAnalysis.financial_stability) {
      factors.push({
        name: 'Financial Stability',
        value: aiAnalysis.financial_stability.score || 50,
        impact: this.determineImpact(aiAnalysis.financial_stability.score),
        explanation: aiAnalysis.financial_stability.assessment ||
          'Financial stability assessment based on available data'
      })
    }

    // Add growth momentum factor
    if (aiAnalysis.growth_momentum) {
      factors.push({
        name: 'Growth Momentum',
        value: aiAnalysis.growth_momentum.score || 50,
        impact: this.determineImpact(aiAnalysis.growth_momentum.score),
        explanation: `${aiAnalysis.growth_momentum.trend || 'Uncertain'} growth trend`
      })
    }

    // Add compliance factor
    if (aiAnalysis.compliance_status) {
      factors.push({
        name: 'Regulatory Compliance',
        value: aiAnalysis.compliance_status.score || 50,
        impact: this.determineImpact(aiAnalysis.compliance_status.score),
        explanation: aiAnalysis.compliance_status.issues?.length > 0 ?
          `Issues: ${aiAnalysis.compliance_status.issues.join(', ')}` :
          'Good compliance standing'
      })
    }

    // Add liquidity factor
    if (aiAnalysis.liquidity_position) {
      factors.push({
        name: 'Liquidity Position',
        value: aiAnalysis.liquidity_position.score || 50,
        impact: this.determineImpact(aiAnalysis.liquidity_position.score),
        explanation: aiAnalysis.liquidity_position.explanation ||
          `${aiAnalysis.liquidity_position.assessment} liquidity`
      })
    }

    // Add red flags as negative factors
    if (aiAnalysis.red_flags && aiAnalysis.red_flags.length > 0) {
      aiAnalysis.red_flags.slice(0, 2).forEach((flag: string) => {
        factors.push({
          name: 'Risk Factor',
          value: 20,
          impact: 'negative' as const,
          explanation: flag
        })
      })
    }

    // Add positive signals
    if (aiAnalysis.positive_signals && aiAnalysis.positive_signals.length > 0) {
      aiAnalysis.positive_signals.slice(0, 2).forEach((signal: string) => {
        factors.push({
          name: 'Strength',
          value: 80,
          impact: 'positive' as const,
          explanation: signal
        })
      })
    }

    // Calculate data quality based on confidence
    const dataQuality = aiAnalysis.confidence === 'high' ? 90 :
                       aiAnalysis.confidence === 'medium' ? 70 : 50

    // Identify missing data
    const missingData = []
    if (!company.companies_house_data?.accounts?.last_accounts) {
      missingData.push('Financial statements')
    }
    if (!company.companies_house_data?.officers) {
      missingData.push('Officer information')
    }

    // Add AI insights as a special factor
    factors.push({
      name: 'AI Risk Assessment',
      value: 100 - (aiAnalysis.risk_level === 'critical' ? 90 :
                    aiAnalysis.risk_level === 'high' ? 70 :
                    aiAnalysis.risk_level === 'medium' ? 50 : 30),
      impact: aiAnalysis.risk_level === 'low' ? 'positive' :
              aiAnalysis.risk_level === 'critical' ? 'negative' : 'neutral',
      explanation: aiAnalysis.summary || 'AI-powered comprehensive risk assessment'
    })

    return {
      score: Math.min(100, Math.max(0, aiAnalysis.overall_score || 50)),
      factors,
      data_quality: dataQuality,
      missing_data: missingData
    }
  }

  /**
   * Fallback to rule-based scoring
   */
  private async calculateRuleBasedScore(company: any): Promise<FinancialScore> {
    // This is the original rule-based logic from financial-health-scorer.ts
    // Simplified version for fallback
    const factors = []
    let score = 50

    // Basic company age scoring
    const age = this.calculateCompanyAge(company.incorporation_date)
    if (age > 10) {
      score += 15
      factors.push({
        name: 'Company Maturity',
        value: 75,
        impact: 'positive' as const,
        explanation: `Established company with ${age} years of operation`
      })
    } else if (age > 5) {
      score += 10
      factors.push({
        name: 'Company Maturity',
        value: 60,
        impact: 'neutral' as const,
        explanation: `Growing company with ${age} years of operation`
      })
    }

    // Check filing status
    if (company.company_status === 'active') {
      score += 20
      factors.push({
        name: 'Company Status',
        value: 80,
        impact: 'positive' as const,
        explanation: 'Active company in good standing'
      })
    } else {
      score -= 30
      factors.push({
        name: 'Company Status',
        value: 20,
        impact: 'negative' as const,
        explanation: `Company status: ${company.company_status}`
      })
    }

    // Check for red flags
    if (company.companies_house_data?.has_insolvency_history) {
      score -= 40
      factors.push({
        name: 'Insolvency History',
        value: 10,
        impact: 'negative' as const,
        explanation: 'Company has insolvency history - major red flag'
      })
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      factors,
      data_quality: 60, // Rule-based has lower confidence
      missing_data: ['AI analysis unavailable']
    }
  }

  // Helper methods

  private async isOllamaAvailable(): Promise<boolean> {
    try {
      return await this.ollama.validateAccess()
    } catch {
      return false
    }
  }

  private calculateCompanyAge(incorporationDate?: string): number {
    if (!incorporationDate) return 0
    const years = (Date.now() - new Date(incorporationDate).getTime()) / (365 * 24 * 60 * 60 * 1000)
    return Math.floor(years)
  }

  private determineImpact(score: number): 'positive' | 'negative' | 'neutral' {
    if (score >= 70) return 'positive'
    if (score <= 30) return 'negative'
    return 'neutral'
  }

  private getIndustrySector(sicCodes?: string[]): string {
    if (!sicCodes || sicCodes.length === 0) return 'Unknown'

    const firstCode = sicCodes[0].substring(0, 2)
    const sectors: Record<string, string> = {
      '01': 'Agriculture',
      '10': 'Manufacturing',
      '35': 'Energy',
      '41': 'Construction',
      '45': 'Wholesale/Retail',
      '49': 'Transportation',
      '55': 'Accommodation',
      '58': 'Publishing/Media',
      '62': 'Information Technology',
      '64': 'Financial Services',
      '68': 'Real Estate',
      '69': 'Legal Services',
      '70': 'Management Consulting',
      '71': 'Architecture/Engineering',
      '72': 'Scientific Research',
      '73': 'Advertising/Marketing',
      '85': 'Education',
      '86': 'Healthcare'
    }

    return sectors[firstCode] || 'Other Services'
  }

  private getIndustryBenchmarks(sicCodes?: string[]): { margin: number; risk: string } {
    if (!sicCodes || sicCodes.length === 0) {
      return { margin: 10, risk: 'Medium' }
    }

    const firstCode = sicCodes[0].substring(0, 2)

    // Simplified industry benchmarks
    const benchmarks: Record<string, { margin: number; risk: string }> = {
      '62': { margin: 25, risk: 'Low' }, // IT
      '64': { margin: 30, risk: 'Medium' }, // Financial
      '70': { margin: 20, risk: 'Low' }, // Consulting
      '45': { margin: 5, risk: 'High' }, // Retail
      '41': { margin: 8, risk: 'High' }, // Construction
      '86': { margin: 15, risk: 'Low' } // Healthcare
    }

    return benchmarks[firstCode] || { margin: 10, risk: 'Medium' }
  }
}