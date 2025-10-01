/**
 * Ollama AI Scoring Service
 * Provides AI-powered lead scoring using local LLMs for complete privacy
 * Orchestrates intelligent analysis across all scoring components
 */

import { getOllamaClient, isOllamaEnabled } from '@/lib/ai/ollama'
import { LlamaPromptOptimizer } from '@/lib/ai/llama-prompt-optimizer'
import { createClient } from '@/lib/supabase/server'

export interface AIScore {
  score: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  key_factors: string[]
  opportunities: string[]
  risks: string[]
  recommendations: string[]
}

export interface AIAnalysisResult {
  financial: AIScore
  technology: AIScore
  industry: AIScore
  growth: AIScore
  engagement: AIScore
  overall: AIScore
  natural_language_summary: string
  action_items: string[]
  ai_metadata: {
    model_used: string
    analysis_time_ms: number
    confidence_explanation: string
  }
}

export class OllamaScoringService {
  private ollama = getOllamaClient()
  private cacheEnabled = true
  private cacheTTL = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Perform comprehensive AI-powered scoring
   */
  async analyzeCompany(
    company: Record<string, unknown>,
    options: {
      depth?: 'quick' | 'detailed'
      useCache?: boolean
      includeRecommendations?: boolean
    } = {}
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now()
    const { depth = 'detailed', useCache = true, includeRecommendations = true } = options

    console.log(`[OllamaScoring] Starting AI analysis for ${company.name}`)

    // Check if Ollama is enabled and available
    if (!isOllamaEnabled()) {
      throw new Error('Ollama is not enabled. Set ENABLE_OLLAMA=true in environment')
    }

    const isAvailable = await this.ollama.validateAccess()
    if (!isAvailable) {
      throw new Error('Ollama service is not accessible. Please ensure Ollama is running')
    }

    // Check cache if enabled
    if (useCache && this.cacheEnabled) {
      const cached = await this.getCachedAnalysis(company.id)
      if (cached) {
        console.log('[OllamaScoring] Returning cached AI analysis')
        return cached
      }
    }

    // Select model based on depth
    const model = depth === 'quick' ? 'tinyllama:1.1b' : 'mistral:7b'

    try {
      // Perform parallel AI analysis for each component
      const [
        financial,
        technology,
        industry,
        growth,
        engagement
      ] = await Promise.all([
        this.analyzeFinancialHealth(company, model),
        this.analyzeTechnologyFit(company, model),
        this.analyzeIndustryAlignment(company, model),
        this.analyzeGrowthPotential(company, model),
        this.analyzeEngagementSignals(company, model)
      ])

      // Calculate overall score with AI reasoning
      const overall = await this.calculateOverallScore(
        { financial, technology, industry, growth, engagement },
        company,
        model
      )

      // Generate natural language summary
      const summary = await this.generateExecutiveSummary(
        company,
        { financial, technology, industry, growth, engagement, overall },
        model
      )

      // Generate action items if requested
      const actionItems = includeRecommendations
        ? await this.generateActionItems(company, overall, model)
        : []

      const result: AIAnalysisResult = {
        financial,
        technology,
        industry,
        growth,
        engagement,
        overall,
        natural_language_summary: summary,
        action_items: actionItems,
        ai_metadata: {
          model_used: model,
          analysis_time_ms: Date.now() - startTime,
          confidence_explanation: this.explainConfidence(overall.confidence)
        }
      }

      // Cache the result
      if (this.cacheEnabled) {
        await this.cacheAnalysis(company.id, result)
      }

      console.log(`[OllamaScoring] AI analysis completed in ${Date.now() - startTime}ms`)
      return result

    } catch (error) {
      console.error('[OllamaScoring] AI analysis error:', error)
      throw new Error(`AI scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze financial health using AI
   */
  private async analyzeFinancialHealth(company: Record<string, unknown>, model: string): Promise<AIScore> {
    const prompt = this.buildFinancialAnalysisPrompt(company)

    const response = await this.ollama.complete(prompt.userPrompt, {
      model,
      system_prompt: prompt.systemPrompt,
      temperature: 0.3, // Lower temperature for financial analysis
      max_tokens: 500
    })

    return this.parseAIResponse(response, 'financial')
  }

  /**
   * Analyze technology fit using AI
   */
  private async analyzeTechnologyFit(company: Record<string, unknown>, model: string): Promise<AIScore> {
    const prompt = this.buildTechnologyAnalysisPrompt(company)

    const response = await this.ollama.complete(prompt.userPrompt, {
      model,
      system_prompt: prompt.systemPrompt,
      temperature: 0.5,
      max_tokens: 400
    })

    return this.parseAIResponse(response, 'technology')
  }

  /**
   * Analyze industry alignment using AI
   */
  private async analyzeIndustryAlignment(company: Record<string, unknown>, model: string): Promise<AIScore> {
    const prompt = this.buildIndustryAnalysisPrompt(company)

    const response = await this.ollama.complete(prompt.userPrompt, {
      model,
      system_prompt: prompt.systemPrompt,
      temperature: 0.4,
      max_tokens: 400
    })

    return this.parseAIResponse(response, 'industry')
  }

  /**
   * Analyze growth potential using AI
   */
  private async analyzeGrowthPotential(company: Record<string, unknown>, model: string): Promise<AIScore> {
    const prompt = this.buildGrowthAnalysisPrompt(company)

    const response = await this.ollama.complete(prompt.userPrompt, {
      model,
      system_prompt: prompt.systemPrompt,
      temperature: 0.6,
      max_tokens: 400
    })

    return this.parseAIResponse(response, 'growth')
  }

  /**
   * Analyze engagement signals using AI
   */
  private async analyzeEngagementSignals(company: Record<string, unknown>, model: string): Promise<AIScore> {
    // Fetch engagement data
    const supabase = await createClient()
    const { data: engagementEvents } = await supabase
      .from('engagement_events')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const prompt = this.buildEngagementAnalysisPrompt(company, engagementEvents || [])

    const response = await this.ollama.complete(prompt.userPrompt, {
      model,
      system_prompt: prompt.systemPrompt,
      temperature: 0.4,
      max_tokens: 400
    })

    return this.parseAIResponse(response, 'engagement')
  }

  /**
   * Calculate overall score using AI reasoning
   */
  private async calculateOverallScore(
    scores: Record<string, AIScore>,
    company: any,
    model: string
  ): Promise<AIScore> {
    const prompt = `
    Analyze the component scores and provide an overall lead score for ${company.name}.

    Component Scores:
    - Financial Health: ${scores.financial.score}/100 (${scores.financial.confidence} confidence)
    - Technology Fit: ${scores.technology.score}/100 (${scores.technology.confidence} confidence)
    - Industry Alignment: ${scores.industry.score}/100 (${scores.industry.confidence} confidence)
    - Growth Potential: ${scores.growth.score}/100 (${scores.growth.confidence} confidence)
    - Engagement Level: ${scores.engagement.score}/100 (${scores.engagement.confidence} confidence)

    Key Findings:
    ${Object.entries(scores).map(([component, score]) =>
      `${component}: ${score.key_factors.join(', ')}`
    ).join('\n')}

    Provide an overall score (0-100) with intelligent weighting based on what matters most for B2B sales.
    Consider synergies between components and identify the most critical factors.

    Return JSON format:
    {
      "score": <overall_score>,
      "confidence": "<high|medium|low>",
      "reasoning": "<detailed explanation of overall score>",
      "key_factors": ["<most important factor>", "..."],
      "opportunities": ["<opportunity 1>", "..."],
      "risks": ["<risk 1>", "..."],
      "recommendations": ["<recommendation 1>", "..."]
    }
    `

    const response = await this.ollama.complete(prompt, {
      model,
      system_prompt: 'You are an expert B2B sales intelligence analyst. Provide strategic scoring insights.',
      temperature: 0.4,
      max_tokens: 600
    })

    return this.parseAIResponse(response, 'overall')
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    company: any,
    scores: Record<string, AIScore>,
    model: string
  ): Promise<string> {
    const prompt = `
    Generate a concise executive summary for the lead scoring analysis of ${company.name}.

    Overall Score: ${scores.overall.score}/100
    Key Strengths: ${scores.overall.key_factors.filter(f => scores.overall.score > 60).join(', ')}
    Main Concerns: ${scores.overall.risks.join(', ')}

    Write a 2-3 paragraph summary that:
    1. Highlights the company's position as a potential lead
    2. Identifies the most compelling opportunities
    3. Notes any critical considerations
    4. Provides a clear recommendation

    Keep it professional, actionable, and focused on sales intelligence.
    `

    const response = await this.ollama.complete(prompt, {
      model,
      temperature: 0.5,
      max_tokens: 300
    })

    return response.trim()
  }

  /**
   * Generate actionable next steps
   */
  private async generateActionItems(
    company: any,
    overallScore: AIScore,
    model: string
  ): Promise<string[]> {
    const prompt = `
    Based on the analysis of ${company.name} with a score of ${overallScore.score}/100:

    Opportunities: ${overallScore.opportunities.join(', ')}
    Risks: ${overallScore.risks.join(', ')}

    Generate 3-5 specific, actionable next steps for the sales team.
    Focus on concrete actions that can be taken immediately.

    Return as a JSON array of strings:
    ["action 1", "action 2", "action 3"]
    `

    const response = await this.ollama.complete(prompt, {
      model: 'tinyllama:1.1b', // Use fast model for simple task
      temperature: 0.4,
      max_tokens: 200
    })

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // Fallback to parsing lines
      return response.split('\n')
        .filter(line => line.trim())
        .slice(0, 5)
    }

    return ['Schedule initial outreach', 'Prepare customized value proposition', 'Research key stakeholders']
  }

  /**
   * Build prompt for financial analysis
   */
  private buildFinancialAnalysisPrompt(company: any) {
    const systemPrompt = `You are a financial analyst specializing in UK company assessment.
    Evaluate financial health and provide scoring based on available data.
    Be conservative in your assessments and highlight any data gaps.`

    const userPrompt = `
    Analyze the financial health of this company:

    Company: ${company.name}
    Company Number: ${company.company_number || 'Not provided'}
    Status: ${company.company_status || 'Unknown'}
    Incorporated: ${company.incorporation_date || 'Unknown'}

    Financial Indicators:
    - Company Type: ${company.company_type || 'Unknown'}
    - SIC Codes: ${company.sic_codes?.join(', ') || 'Not specified'}
    - Last Updated: ${company.companies_house_last_updated || 'Never'}
    ${company.companies_house_data ? `
    - Accounts Next Due: ${company.companies_house_data.accounts?.next_due || 'N/A'}
    - Last Accounts: ${company.companies_house_data.accounts?.last_accounts?.made_up_to || 'N/A'}
    - Confirmation Statement Due: ${company.companies_house_data.confirmation_statement?.next_due || 'N/A'}
    ` : '- No Companies House data available'}

    Assess:
    1. Financial stability based on filing compliance
    2. Business maturity from incorporation date
    3. Industry risk from SIC codes
    4. Any red flags in the data

    Provide a financial health score (0-100) with detailed reasoning.

    Return JSON format:
    {
      "score": <0-100>,
      "confidence": "<high|medium|low>",
      "reasoning": "<explanation>",
      "key_factors": ["factor1", "factor2"],
      "opportunities": ["opportunity1"],
      "risks": ["risk1"],
      "recommendations": ["recommendation1"]
    }
    `

    return { systemPrompt, userPrompt }
  }

  /**
   * Build prompt for technology analysis
   */
  private buildTechnologyAnalysisPrompt(company: any) {
    const systemPrompt = `You are a technology analyst evaluating digital maturity and tech compatibility.
    Focus on indicators of technology adoption and innovation potential.`

    const userPrompt = `
    Evaluate the technology profile of:

    Company: ${company.name}
    Website: ${company.website || 'No website found'}
    Industry (SIC): ${company.sic_codes?.join(', ') || 'Unknown'}
    Description: ${company.description || 'No description available'}

    Technology Indicators:
    - Has website: ${company.website ? 'Yes' : 'No'}
    - Digital presence: ${company.social_links ? 'Social media found' : 'Limited'}
    - Industry sector: ${this.identifyTechRelevance(company.sic_codes)}

    Assess:
    1. Digital maturity level
    2. Technology adoption likelihood
    3. Innovation potential
    4. Compatibility with modern B2B solutions

    Provide a technology fit score (0-100).

    Return JSON format with score, confidence, reasoning, key_factors, opportunities, risks, and recommendations.
    `

    return { systemPrompt, userPrompt }
  }

  /**
   * Build prompt for industry analysis
   */
  private buildIndustryAnalysisPrompt(company: any) {
    const systemPrompt = `You are an industry analyst specializing in UK B2B markets.
    Evaluate industry alignment and market potential for B2B sales.`

    const userPrompt = `
    Analyze industry alignment for:

    Company: ${company.name}
    Type: ${company.company_type || 'Unknown'}
    SIC Codes: ${company.sic_codes?.join(', ') || 'None'}
    Location: ${company.registered_office_address?.locality || 'UK'}
    Company Age: ${this.calculateCompanyAge(company.incorporation_date)} years

    Evaluate:
    1. B2B market potential based on industry
    2. Sector growth trends
    3. Typical buying patterns for this industry
    4. Market maturity and competition

    Provide an industry alignment score (0-100) for B2B sales potential.

    Return JSON format with score, confidence, reasoning, key_factors, opportunities, risks, and recommendations.
    `

    return { systemPrompt, userPrompt }
  }

  /**
   * Build prompt for growth analysis
   */
  private buildGrowthAnalysisPrompt(company: any) {
    const systemPrompt = `You are a growth analyst identifying expansion signals and potential.
    Focus on indicators of business growth and future opportunities.`

    const userPrompt = `
    Analyze growth potential for:

    Company: ${company.name}
    Incorporated: ${company.incorporation_date || 'Unknown'}
    Company Age: ${this.calculateCompanyAge(company.incorporation_date)} years
    Status: ${company.company_status}
    Recent Activity: ${company.companies_house_last_updated ?
      `Updated ${this.daysSince(company.companies_house_last_updated)} days ago` :
      'No recent updates'}

    Growth Indicators:
    - Company lifecycle stage: ${this.identifyLifecycleStage(company.incorporation_date)}
    - Filing activity: ${this.assessFilingActivity(company.companies_house_last_updated)}
    - Industry growth (SIC ${company.sic_codes?.[0]}): Assess based on UK market trends

    Evaluate:
    1. Current growth trajectory
    2. Expansion potential
    3. Investment indicators
    4. Market opportunity size

    Provide a growth potential score (0-100).

    Return JSON format with score, confidence, reasoning, key_factors, opportunities, risks, and recommendations.
    `

    return { systemPrompt, userPrompt }
  }

  /**
   * Build prompt for engagement analysis
   */
  private buildEngagementAnalysisPrompt(company: any, events: any[]) {
    const systemPrompt = `You are a sales intelligence analyst evaluating buyer engagement and intent.
    Analyze interaction patterns to identify buying signals and engagement quality.`

    const eventSummary = this.summarizeEngagementEvents(events)

    const userPrompt = `
    Analyze engagement signals for:

    Company: ${company.name}
    Total Engagement Events: ${events.length}

    Engagement Summary:
    ${eventSummary}

    Recent Activity:
    ${events.slice(0, 5).map(e =>
      `- ${e.event_type}: ${this.daysSince(e.created_at)} days ago`
    ).join('\n') || '- No recent engagement'}

    Evaluate:
    1. Engagement intensity and frequency
    2. Buying intent signals
    3. Stakeholder involvement
    4. Sales readiness

    Provide an engagement score (0-100) based on buying signals.

    Return JSON format with score, confidence, reasoning, key_factors, opportunities, risks, and recommendations.
    `

    return { systemPrompt, userPrompt }
  }

  /**
   * Parse AI response into structured score
   */
  private parseAIResponse(response: string, component: string): AIScore {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])

        // Validate and sanitize
        return {
          score: Math.min(100, Math.max(0, parseInt(parsed.score) || 50)),
          confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ?
            parsed.confidence : 'medium',
          reasoning: parsed.reasoning || `AI analysis for ${component}`,
          key_factors: Array.isArray(parsed.key_factors) ?
            parsed.key_factors.slice(0, 5) : [],
          opportunities: Array.isArray(parsed.opportunities) ?
            parsed.opportunities.slice(0, 3) : [],
          risks: Array.isArray(parsed.risks) ?
            parsed.risks.slice(0, 3) : [],
          recommendations: Array.isArray(parsed.recommendations) ?
            parsed.recommendations.slice(0, 3) : []
        }
      }
    } catch (error) {
      console.error(`[OllamaScoring] Failed to parse ${component} response:`, error)
    }

    // Fallback response
    return {
      score: 50,
      confidence: 'low',
      reasoning: `Unable to fully analyze ${component} - using conservative estimate`,
      key_factors: ['Insufficient data for detailed analysis'],
      opportunities: [],
      risks: ['Analysis uncertainty'],
      recommendations: ['Gather more data for accurate scoring']
    }
  }

  // Helper methods

  private identifyTechRelevance(sicCodes?: string[]): string {
    if (!sicCodes || sicCodes.length === 0) return 'Unknown sector'

    const techCodes = ['62', '63'] // IT and telecommunications
    const hasTech = sicCodes.some(code => techCodes.some(tc => code.startsWith(tc)))

    return hasTech ? 'Technology sector' : 'Traditional sector'
  }

  private calculateCompanyAge(incorporationDate?: string): number {
    if (!incorporationDate) return 0
    const years = (Date.now() - new Date(incorporationDate).getTime()) / (365 * 24 * 60 * 60 * 1000)
    return Math.floor(years)
  }

  private identifyLifecycleStage(incorporationDate?: string): string {
    const age = this.calculateCompanyAge(incorporationDate)
    if (age < 2) return 'Startup'
    if (age < 5) return 'Early Growth'
    if (age < 10) return 'Growth'
    if (age < 20) return 'Mature'
    return 'Established'
  }

  private assessFilingActivity(lastUpdated?: string): string {
    if (!lastUpdated) return 'No filing history'
    const days = this.daysSince(lastUpdated)
    if (days < 30) return 'Very active'
    if (days < 90) return 'Active'
    if (days < 180) return 'Moderate'
    if (days < 365) return 'Low'
    return 'Inactive'
  }

  private daysSince(dateString: string): number {
    const date = new Date(dateString)
    const now = new Date()
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  private summarizeEngagementEvents(events: any[]): string {
    const summary: Record<string, number> = {}
    events.forEach(event => {
      summary[event.event_type] = (summary[event.event_type] || 0) + 1
    })

    return Object.entries(summary)
      .map(([type, count]) => `- ${type}: ${count} events`)
      .join('\n') || 'No engagement events'
  }

  private explainConfidence(confidence: string): string {
    switch (confidence) {
      case 'high':
        return 'High confidence based on comprehensive data and clear patterns'
      case 'medium':
        return 'Medium confidence with good data coverage but some gaps'
      case 'low':
        return 'Low confidence due to limited data or conflicting signals'
      default:
        return 'Confidence level uncertain'
    }
  }

  // Cache management

  private async getCachedAnalysis(companyId: string): Promise<AIAnalysisResult | null> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('ai_scoring_cache')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (data && data.cached_at) {
      const age = Date.now() - new Date(data.cached_at).getTime()
      if (age < this.cacheTTL) {
        return data.analysis_result
      }
    }

    return null
  }

  private async cacheAnalysis(companyId: string, result: AIAnalysisResult): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('ai_scoring_cache')
      .upsert({
        company_id: companyId,
        analysis_result: result,
        cached_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
  }
}