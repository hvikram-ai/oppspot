/**
 * SimilarityExplanationService: LLM-powered explanation generation for Similar Company feature
 * Specializes in creating MnA-focused explanations and insights
 * Built for sophisticated MnA directors requiring detailed rationale
 */

import { getErrorMessage } from '@/lib/utils/error-handler'
import { getLLMProvider } from '@/lib/ai/llm-factory'
import { LLMProvider, LLMService } from '@/lib/ai/llm-interface'
import {
  SimilarityExplanation,
  MnAInsights,
  OpportunityInsight,
  RiskInsight,
  StrategyRecommendation,
  ValuationInsight,
  IntegrationInsight,
  ConfidenceLevel,
  SimilarCompanyMatch,
  MnABenchmarkScores,
  ImplementationGuidance
} from '../core/similarity-interfaces'
import { CompanyEntity } from '../core/interfaces'

interface ExplanationPromptContext {
  targetCompany: CompanyEntity
  similarCompany: CompanyEntity
  benchmarkScores: MnABenchmarkScores
  additionalContext?: Record<string, unknown>
}

interface MnAInsightsContext {
  targetCompany: CompanyEntity
  matches: SimilarCompanyMatch[]
  analysisConfiguration: Record<string, unknown>
}

interface ExplanationMetrics {
  tokensUsed: number
  responseTime: number
  cost: number
  modelUsed: string
  confidence: ConfidenceLevel
  retryCount: number
}

export class SimilarityExplanationService {
  private llmProvider: LLMProvider & LLMService
  private maxRetries = 2

  constructor() {
    this.llmProvider = getLLMProvider()
  }

  /**
   * Generate comprehensive similarity explanation
   */
  async generateSimilarityExplanation(
    context: ExplanationPromptContext
  ): Promise<{
    explanation: SimilarityExplanation
    metrics: ExplanationMetrics
  }> {
    const startTime = Date.now()
    const retryCount = 0
    const tokensUsed = 0

    const prompt = this.buildSimilarityExplanationPrompt(context)
    
    try {
      const response = await this.llmProvider.complete(prompt, {
                system_prompt: this.getSimilarityExplanationSystemPrompt(),
        temperature: 0.3, // Lower temperature for consistent, factual explanations
        max_tokens: 1500
      })

      const explanation = this.parseSimilarityExplanationResponse(response, context)
      
      const metrics: ExplanationMetrics = {
        tokensUsed: this.llmProvider.estimateTokens(prompt + response),
        responseTime: Date.now() - startTime,
        cost: this.llmProvider.calculateCost(this.llmProvider.estimateTokens(prompt + response)),
        modelUsed: 'primary',
        confidence: explanation.confidenceLevel,
        retryCount
      }

      return { explanation, metrics }
    } catch (error) {
      console.error('Error generating similarity explanation:', error)
      throw new Error(`Failed to generate similarity explanation: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Generate MnA-focused insights for multiple matches
   */
  async generateMnAInsights(
    context: MnAInsightsContext
  ): Promise<{
    insights: MnAInsights
    metrics: ExplanationMetrics
  }> {
    const startTime = Date.now()
    const tokensUsed = 0

    const prompt = this.buildMnAInsightsPrompt(context)
    
    try {
      const response = await this.llmProvider.complete(prompt, {
                system_prompt: this.getMnAInsightsSystemPrompt(),
        temperature: 0.4,
        max_tokens: 2000
      })

      const insights = this.parseMnAInsightsResponse(response, context)
      
      const metrics: ExplanationMetrics = {
        tokensUsed: this.llmProvider.estimateTokens(prompt + response),
        responseTime: Date.now() - startTime,
        cost: this.llmProvider.calculateCost(this.llmProvider.estimateTokens(prompt + response)),
        modelUsed: 'primary',
        confidence: 'high', // MnA insights are generally high confidence
        retryCount: 0
      }

      return { insights, metrics }
    } catch (error) {
      console.error('Error generating MnA insights:', error)
      throw new Error(`Failed to generate MnA insights: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Generate quick similarity summary (fast model)
   */
  async generateQuickSimilaritySummary(
    targetCompany: CompanyEntity,
    similarCompany: CompanyEntity,
    overallScore: number
  ): Promise<string> {
    const prompt = `Explain in 2-3 sentences why ${similarCompany.name} is ${overallScore}% similar to ${targetCompany.name} for MnA purposes.

Target Company: ${targetCompany.name}
- Industry: ${targetCompany.industryCodes.join(', ')}
- Location: ${targetCompany.country}
- Description: ${targetCompany.description || 'N/A'}

Similar Company: ${similarCompany.name}
- Industry: ${similarCompany.industryCodes.join(', ')}
- Location: ${similarCompany.country}
- Description: ${similarCompany.description || 'N/A'}

Focus on the most important similarity factors for MnA evaluation.`

    try {
      return await this.llmProvider.complete(prompt, {
                temperature: 0.3,
        max_tokens: 200
      })
    } catch (error) {
      console.error('Error generating quick similarity summary:', error)
      return `${similarCompany.name} shows ${overallScore}% similarity to ${targetCompany.name} based on industry alignment and operational characteristics.`
    }
  }

  /**
   * Generate risk assessment explanation
   */
  async generateRiskAssessmentExplanation(
    targetCompany: CompanyEntity,
    riskFactors: string[],
    riskScore: number
  ): Promise<string> {
    const prompt = `Explain the key risks associated with acquiring ${targetCompany.name} (Risk Score: ${riskScore}/100).

Company: ${targetCompany.name}
Industry: ${targetCompany.industryCodes.join(', ')}
Location: ${targetCompany.country}

Identified Risk Factors:
${riskFactors.map(factor => `• ${factor}`).join('\n')}

Provide a professional risk assessment suitable for MnA directors, including:
1. Primary risk concerns
2. Potential mitigation strategies
3. Overall risk level assessment`

    try {
      return await this.llmProvider.complete(prompt, {
                system_prompt: 'You are an MnA risk assessment specialist providing professional analysis for acquisition decisions.',
        temperature: 0.2,
        max_tokens: 600
      })
    } catch (error) {
      console.error('Error generating risk assessment:', error)
      return `Risk assessment for ${targetCompany.name} indicates moderate risk levels requiring careful due diligence.`
    }
  }

  /**
   * Generate opportunity analysis
   */
  async generateOpportunityAnalysis(
    targetCompany: CompanyEntity,
    opportunities: string[],
    synergies: Record<string, unknown>
  ): Promise<string> {
    const prompt = `Analyze the acquisition opportunities for ${targetCompany.name}.

Company: ${targetCompany.name}
Industry: ${targetCompany.industryCodes.join(', ')}
Location: ${targetCompany.country}

Identified Opportunities:
${opportunities.map(opp => `• ${opp}`).join('\n')}

Potential Synergies:
${Object.entries(synergies).map(([key, value]) => `• ${key}: ${value}`).join('\n')}

Provide analysis covering:
1. Key value creation opportunities
2. Strategic rationale for acquisition
3. Expected synergy realization
4. Implementation considerations`

    try {
      return await this.llmProvider.complete(prompt, {
                system_prompt: 'You are a strategic MnA advisor analyzing value creation opportunities for corporate acquisitions.',
        temperature: 0.4,
        max_tokens: 800
      })
    } catch (error) {
      console.error('Error generating opportunity analysis:', error)
      return `Acquisition of ${targetCompany.name} presents strategic opportunities for market expansion and operational synergies.`
    }
  }

  // Private helper methods

  private buildSimilarityExplanationPrompt(context: ExplanationPromptContext): string {
    const { targetCompany, similarCompany, benchmarkScores } = context

    return `Generate a comprehensive similarity explanation for MnA analysis.

TARGET COMPANY:
Name: ${targetCompany.name}
Industry: ${targetCompany.industryCodes.join(', ')}
Country: ${targetCompany.country}
Description: ${targetCompany.description || 'Not available'}
${targetCompany.website ? `Website: ${targetCompany.website}` : ''}

SIMILAR COMPANY:
Name: ${similarCompany.name}
Industry: ${similarCompany.industryCodes.join(', ')}
Country: ${similarCompany.country}
Description: ${similarCompany.description || 'Not available'}
${similarCompany.website ? `Website: ${similarCompany.website}` : ''}

MnA BENCHMARK SCORES:
• Financial Similarity: ${benchmarkScores.financial.score}/100 (${benchmarkScores.financial.confidence} confidence)
• Strategic Similarity: ${benchmarkScores.strategic.score}/100 (${benchmarkScores.strategic.confidence} confidence)
• Operational Similarity: ${benchmarkScores.operational.score}/100 (${benchmarkScores.operational.confidence} confidence)
• Market Similarity: ${benchmarkScores.market.score}/100 (${benchmarkScores.market.confidence} confidence)
• Risk Profile Similarity: ${benchmarkScores.risk.score}/100 (${benchmarkScores.risk.confidence} confidence)

Contributing Factors:
Financial: ${benchmarkScores.financial.contributingFactors.join(', ')}
Strategic: ${benchmarkScores.strategic.contributingFactors.join(', ')}
Operational: ${benchmarkScores.operational.contributingFactors.join(', ')}
Market: ${benchmarkScores.market.contributingFactors.join(', ')}
Risk: ${benchmarkScores.risk.contributingFactors.join(', ')}

Provide your analysis in the following structure:
1. Executive Summary (2-3 sentences)
2. Key Similarity Reasons (3-5 bullet points)
3. Financial Rationale (detailed explanation)
4. Strategic Rationale (detailed explanation)
5. Risk Considerations (important factors to consider)
6. Confidence Assessment (high/medium/low with reasoning)`
  }

  private buildMnAInsightsPrompt(context: MnAInsightsContext): string {
    const { targetCompany, matches } = context
    const topMatches = matches.slice(0, 5) // Focus on top 5 matches

    return `Generate comprehensive MnA insights for ${targetCompany.name} based on similarity analysis.

TARGET COMPANY:
Name: ${targetCompany.name}
Industry: ${targetCompany.industryCodes.join(', ')}
Country: ${targetCompany.country}
Description: ${targetCompany.description || 'Not available'}

TOP SIMILAR COMPANIES IDENTIFIED:
${topMatches.map(match => `
• ${match.company.name} (${match.overallScore}% similar)
  - Industry: ${match.company.industryCodes.join(', ')}
  - Location: ${match.company.country}
  - Market Position: ${match.marketPosition}
  - Key Strengths: ${match.opportunities.slice(0, 2).map(opp => opp.description).join(', ')}
`).join('')}

ANALYSIS CONTEXT:
• Average Similarity Score: ${matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length}%
• Geographic Distribution: ${Array.from(new Set(matches.map(m => m.company.country))).join(', ')}
• Industry Spread: ${Array.from(new Set(matches.flatMap(m => m.company.industryCodes))).join(', ')}

Generate insights covering:

1. EXECUTIVE SUMMARY (3-4 sentences about overall findings)

2. KEY OPPORTUNITIES (3-5 specific opportunities with impact and timeframe)

3. RISK HIGHLIGHTS (2-4 key risks with severity and mitigation approaches)

4. STRATEGIC RECOMMENDATIONS (3-4 actionable recommendations with priority levels)

5. VALUATION CONSIDERATIONS (key factors affecting valuation)

6. INTEGRATION CONSIDERATIONS (operational integration challenges and approaches)`
  }

  private getSimilarityExplanationSystemPrompt(): string {
    return `You are a senior MnA analyst with 15+ years of experience in corporate acquisitions and strategic analysis. You specialize in identifying and explaining company similarities for acquisition purposes.

Your expertise includes:
- Financial analysis and valuation
- Strategic fit assessment
- Operational due diligence
- Risk evaluation
- Market positioning analysis

Guidelines for your analysis:
- Focus on factors most relevant to MnA decisions
- Provide specific, actionable insights
- Consider both opportunities and risks
- Use professional MnA terminology
- Maintain objectivity while highlighting key points
- Support conclusions with logical reasoning
- Consider UK/Ireland market context when relevant

Your explanations should be suitable for board-level presentations and investment committee reviews.`
  }

  private getMnAInsightsSystemPrompt(): string {
    return `You are a strategic MnA advisor and managing director at a top-tier investment bank. You have deep expertise in cross-border acquisitions, market analysis, and value creation strategies.

Your role is to provide executive-level insights that inform acquisition strategies and investment decisions. Your analysis should be:

- Strategic and forward-looking
- Grounded in market realities
- Focused on value creation potential
- Aware of integration challenges
- Sensitive to regulatory considerations
- Appropriate for £50M+ acquisition discussions

Consider the sophistication of your audience - these insights will be used by CEOs, CFOs, and investment committees making significant capital allocation decisions.

Frame recommendations in terms of:
- Strategic rationale and value creation
- Risk-adjusted returns and value drivers
- Implementation feasibility and timeline
- Competitive positioning and market dynamics
- Synergy potential and realization risks`
  }

  private parseSimilarityExplanationResponse(
    response: string, 
    context: ExplanationPromptContext
  ): SimilarityExplanation {
    // Parse the structured response from the LLM
    const sections = this.parseResponseSections(response)
    
    return {
      summary: sections.summary || sections.executiveSummary || this.extractFirstParagraph(response),
      keyReasons: this.extractKeyReasons(sections),
      financialRationale: sections.financialRationale || 'Financial analysis pending additional data',
      strategicRationale: sections.strategicRationale || 'Strategic assessment based on market positioning',
      riskConsiderations: sections.riskConsiderations || 'Standard acquisition risks apply',
      confidenceLevel: this.determineConfidenceLevel(context.benchmarkScores),
      dataQualityNote: this.assessDataQuality(context)
    }
  }

  private parseMnAInsightsResponse(
    response: string, 
    context: MnAInsightsContext
  ): MnAInsights {
    const sections = this.parseResponseSections(response)
    
    return {
      executiveSummary: sections.executiveSummary || sections.summary || this.extractFirstParagraph(response),
      keyOpportunities: this.parseOpportunityInsights(sections.keyOpportunities || ''),
      riskHighlights: this.parseRiskInsights(sections.riskHighlights || ''),
      strategicRecommendations: this.parseStrategyRecommendations(sections.strategicRecommendations || ''),
      valuationConsiderations: this.parseValuationInsights(sections.valuationConsiderations || ''),
      integrationConsiderations: this.parseIntegrationInsights(sections.integrationConsiderations || '')
    }
  }

  private parseResponseSections(response: string): Record<string, string> {
    const sections: Record<string, string> = {}
    const lines = response.split('\n')
    let currentSection = ''
    let currentContent: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      
      // Check if this is a section header
      if (this.isSectionHeader(trimmed)) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        
        // Start new section
        currentSection = this.normalizeSectionName(trimmed)
        currentContent = []
      } else if (currentSection) {
        // Add content to current section
        if (trimmed) {
          currentContent.push(trimmed)
        }
      }
    }

    // Save final section
    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim()
    }

    return sections
  }

  private isSectionHeader(line: string): boolean {
    const headerPatterns = [
      /^\d+\./,  // Numbered sections: "1. Executive Summary"
      /^[A-Z\s]+:$/,  // ALL CAPS with colon: "EXECUTIVE SUMMARY:"
      /^#{1,3}\s/,  // Markdown headers: "# Summary"
      /^(Executive Summary|Key Reasons|Financial Rationale|Strategic Rationale|Risk Considerations|Confidence)/i
    ]
    
    return headerPatterns.some(pattern => pattern.test(line))
  }

  private normalizeSectionName(header: string): string {
    return header
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/:$/, '') // Remove trailing colon
      .replace(/^#+\s*/, '') // Remove markdown headers
      .toLowerCase()
      .replace(/\s+/g, '') // Remove spaces
      .replace('executivesummary', 'summary')
      .replace('keyreasons', 'keyReasons')
      .replace('financialrationale', 'financialRationale')
      .replace('strategicrationale', 'strategicRationale')
      .replace('riskconsiderations', 'riskConsiderations')
      .replace('confidenceassessment', 'confidence')
  }

  private extractFirstParagraph(text: string): string {
    const paragraphs = text.split('\n\n')
    return paragraphs[0]?.trim() || text.substring(0, 200) + '...'
  }

  private extractKeyReasons(sections: Record<string, string>): string[] {
    const keyReasonsText = sections.keyReasons || sections.keyreasons || ''
    
    // Extract bullet points or numbered items
    const reasons = keyReasonsText
      .split('\n')
      .map(line => line.replace(/^[•\-\*\d+\.]\s*/, '').trim())
      .filter(line => line.length > 10) // Filter out short/empty lines
      .slice(0, 5) // Limit to 5 key reasons

    return reasons.length > 0 ? reasons : [
      'Industry alignment and market positioning',
      'Similar operational characteristics',
      'Comparable financial metrics',
      'Geographic or customer overlap',
      'Strategic value potential'
    ]
  }

  private parseOpportunityInsights(text: string): OpportunityInsight[] {
    const opportunities = this.extractBulletPoints(text)

    return opportunities.slice(0, 5).map(opp => ({
      category: this.categorizeOpportunity(opp),
      title: this.extractTitle(opp),
      description: opp,
      impact: this.assessImpact(opp),
      timeframe: this.assessTimeframe(opp),
      confidence: 'medium' as ConfidenceLevel
    })) as OpportunityInsight[]
  }

  private parseRiskInsights(text: string): RiskInsight[] {
    const risks = this.extractBulletPoints(text)

    return risks.slice(0, 4).map(risk => ({
      category: this.categorizeRisk(risk),
      title: this.extractTitle(risk),
      description: risk,
      severity: this.assessRiskSeverity(risk),
      probability: this.assessRiskProbability(risk),
      mitigation: this.extractMitigationStrategies(risk)
    })) as RiskInsight[]
  }

  private parseStrategyRecommendations(text: string): StrategyRecommendation[] {
    const recommendations = this.extractBulletPoints(text)
    
    return recommendations.slice(0, 4).map(rec => ({
      priority: this.assessPriority(rec),
      title: this.extractTitle(rec),
      rationale: rec,
      expectedOutcome: this.extractExpectedOutcome(rec),
      implementation: this.extractImplementationGuidance(rec)
    }))
  }

  private parseValuationInsights(text: string): ValuationInsight[] {
    const insights = this.extractBulletPoints(text)
    
    return insights.slice(0, 5).map(insight => ({
      metric: this.extractMetricName(insight),
      value: 0, // Would need to parse actual numbers
      benchmark: 0, // Would need benchmark data
      interpretation: insight
    }))
  }

  private parseIntegrationInsights(text: string): IntegrationInsight[] {
    const insights = this.extractBulletPoints(text)
    
    return insights.slice(0, 4).map(insight => ({
      area: this.categorizeIntegrationArea(insight),
      complexity: this.assessComplexity(insight),
      recommendations: [insight],
      timeline: this.extractTimeline(insight)
    }))
  }

  // Utility methods for parsing and categorization

  private extractBulletPoints(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.replace(/^[•\-\*\d+\.]\s*/, '').trim())
      .filter(line => line.length > 10)
  }

  private categorizeOpportunity(text: string): string {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('synergy') || lowerText.includes('efficiency')) return 'synergy'
    if (lowerText.includes('market') || lowerText.includes('expansion')) return 'expansion'
    if (lowerText.includes('innovation') || lowerText.includes('technology')) return 'innovation'
    if (lowerText.includes('cost') || lowerText.includes('operational')) return 'efficiency'
    return 'market'
  }

  private categorizeRisk(text: string): string {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('financial') || lowerText.includes('debt')) return 'financial'
    if (lowerText.includes('operational') || lowerText.includes('integration')) return 'operational'
    if (lowerText.includes('strategic') || lowerText.includes('market')) return 'strategic'
    if (lowerText.includes('regulatory') || lowerText.includes('compliance')) return 'regulatory'
    if (lowerText.includes('technology') || lowerText.includes('system')) return 'technology'
    return 'operational'
  }

  private extractTitle(text: string): string {
    // Extract first meaningful phrase as title
    const sentences = text.split('.')
    return sentences[0]?.substring(0, 60) || text.substring(0, 60)
  }

  private assessImpact(text: string): 'low' | 'medium' | 'high' {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('significant') || lowerText.includes('major') || lowerText.includes('substantial')) {
      return 'high'
    }
    if (lowerText.includes('moderate') || lowerText.includes('potential')) {
      return 'medium'
    }
    return 'low'
  }

  private assessTimeframe(text: string): 'immediate' | 'short' | 'medium' | 'long' {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('immediate') || lowerText.includes('now')) return 'immediate'
    if (lowerText.includes('short') || lowerText.includes('6 month') || lowerText.includes('quarter')) return 'short'
    if (lowerText.includes('medium') || lowerText.includes('year') || lowerText.includes('12 month')) return 'medium'
    return 'long'
  }

  private assessRiskSeverity(text: string): 'critical' | 'major' | 'moderate' | 'minor' {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('critical') || lowerText.includes('severe')) return 'critical'
    if (lowerText.includes('major') || lowerText.includes('significant')) return 'major'
    if (lowerText.includes('moderate')) return 'moderate'
    return 'minor'
  }

  private assessRiskProbability(text: string): 'certain' | 'likely' | 'possible' | 'unlikely' {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('certain') || lowerText.includes('definite')) return 'certain'
    if (lowerText.includes('likely') || lowerText.includes('probable')) return 'likely'
    if (lowerText.includes('possible') || lowerText.includes('potential')) return 'possible'
    return 'unlikely'
  }

  private extractMitigationStrategies(text: string): string[] {
    // Look for mitigation keywords and extract following text
    const mitigationKeywords = ['mitigate', 'address', 'manage', 'prevent', 'reduce']
    const sentences = text.split('.')
    
    const strategies = sentences.filter(sentence => 
      mitigationKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    )
    
    return strategies.length > 0 ? strategies.slice(0, 2) : ['Standard due diligence practices']
  }

  private assessPriority(text: string): 'high' | 'medium' | 'low' {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('critical') || lowerText.includes('urgent') || lowerText.includes('immediate')) {
      return 'high'
    }
    if (lowerText.includes('important') || lowerText.includes('significant')) {
      return 'medium'
    }
    return 'low'
  }

  private extractExpectedOutcome(text: string): string {
    // Look for outcome-related keywords
    const sentences = text.split('.')
    const outcomeKeywords = ['result', 'outcome', 'achieve', 'benefit', 'improve']
    
    const outcomeText = sentences.find(sentence => 
      outcomeKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    )
    
    return outcomeText || 'Positive strategic impact expected'
  }

  private extractImplementationGuidance(text: string): ImplementationGuidance {
    return {
      timeline: this.extractTimeline(text),
      resources: ['Management team', 'External advisors'],
      dependencies: ['Due diligence completion', 'Board approval'],
      successMetrics: ['Strategic objectives achieved', 'Integration milestones met']
    }
  }

  private extractTimeline(text: string): string {
    const timePatterns = [
      /\d+\s*(month|year|quarter|week)/gi,
      /(short|medium|long).term/gi,
      /(immediate|urgent|gradual)/gi
    ]
    
    for (const pattern of timePatterns) {
      const match = text.match(pattern)
      if (match) return match[0]
    }
    
    return '6-12 months'
  }

  private extractMetricName(text: string): string {
    const metricKeywords = ['revenue', 'ebitda', 'multiple', 'margin', 'growth', 'value']
    const foundMetric = metricKeywords.find(metric => 
      text.toLowerCase().includes(metric)
    )
    return foundMetric || 'valuation'
  }

  private categorizeIntegrationArea(text: string): string {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('technology') || lowerText.includes('system')) return 'Technology'
    if (lowerText.includes('culture') || lowerText.includes('people')) return 'Culture'
    if (lowerText.includes('operation') || lowerText.includes('process')) return 'Operations'
    if (lowerText.includes('financial') || lowerText.includes('reporting')) return 'Financial'
    return 'General'
  }

  private assessComplexity(text: string): 'low' | 'medium' | 'high' {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('complex') || lowerText.includes('difficult') || lowerText.includes('challenging')) {
      return 'high'
    }
    if (lowerText.includes('moderate') || lowerText.includes('standard')) {
      return 'medium'
    }
    return 'low'
  }

  private determineConfidenceLevel(scores: MnABenchmarkScores): ConfidenceLevel {
    const avgConfidence = (
      scores.financial.confidence +
      scores.strategic.confidence +
      scores.operational.confidence +
      scores.market.confidence +
      scores.risk.confidence
    ) / 5

    if (avgConfidence >= 0.8) return 'high'
    if (avgConfidence >= 0.6) return 'medium'
    return 'low'
  }

  private assessDataQuality(context: ExplanationPromptContext): string {
    const { targetCompany, similarCompany, benchmarkScores } = context
    
    const issues: string[] = []
    
    if (!targetCompany.description) issues.push('limited target company description')
    if (!similarCompany.description) issues.push('limited similar company description')
    if (benchmarkScores.financial.confidence < 0.7) issues.push('financial data quality concerns')
    
    if (issues.length === 0) {
      return 'High quality data available for comprehensive analysis'
    }
    
    return `Analysis based on available data with ${issues.join(', ')}`
  }

  // Cost calculation utilities

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 0.75 words
    return Math.ceil(text.split(/\s+/).length / 0.75)
  }

  private calculateCost(model: string, tokens: number): number {
    // OpenRouter pricing (approximate)
    const pricing: Record<string, number> = {
      'anthropic/claude-3.5-sonnet': 0.015, // $15 per 1M tokens
      'anthropic/claude-3-haiku': 0.0025,   // $2.50 per 1M tokens
      'openai/gpt-4-turbo': 0.01,          // $10 per 1M tokens
    }
    
    const pricePerMillion = pricing[model] || 0.01
    return (tokens / 1_000_000) * pricePerMillion
  }

  // Public utility methods

  async validateAPIAccess(): Promise<boolean> {
    try {
      await this.llmProvider.getStatus()
      return true
    } catch (error) {
      console.error('OpenRouter API access validation failed:', error)
      return false
    }
  }

  getModelCapabilities(): Record<string, unknown> {
    return {
      'anthropic/claude-3.5-sonnet': {
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxTokens: 4096,
        costPer1M: 0.015,
        bestFor: 'Complex analysis, detailed explanations'
      },
      'anthropic/claude-3-haiku': {
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        maxTokens: 4096,
        costPer1M: 0.0025,
        bestFor: 'Quick summaries, simple explanations'
      }
    }
  }
}