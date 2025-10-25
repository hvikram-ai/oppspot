/**
 * Market Intelligence Agent
 * Specialized agent for competitive analysis and market positioning
 */

import { BaseAgent } from './base-agent'
import type { AgentAnalysis, ResearchContext, OppspotAgentType } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

export class MarketAgent extends BaseAgent {
  constructor() {
    super(getDefaultAgentConfig('market' as OppspotAgentType))
  }

  async analyze(context: ResearchContext, specificQuery?: string): Promise<AgentAnalysis> {
    const startTime = Date.now()

    const marketContext = this.buildMarketContext(context)
    const query = specificQuery || `Analyze the market position and competitive landscape for ${context.companyData.name}.`
    const prompt = `${marketContext}\n\n## Analysis Request\n${query}\n\n## Instructions\nProvide comprehensive market intelligence including:\n1. Market Positioning & Differentiation\n2. Competitive Landscape Analysis\n3. Market Size & Growth Potential\n4. Customer Segments & ICP\n5. Growth Opportunities & Threats\n\nFocus on actionable insights for B2B sales teams targeting UK/Ireland.`

    const content = await this.executeLLM(prompt)

    return {
      agentType: this.config.type,
      content,
      keyInsights: this.extractKeyInsights(content),
      opportunities: this.extractOpportunities(content),
      recommendations: this.extractRecommendations(content),
      confidence: this.calculateConfidence(context),
      sources: this.extractSources(context),
      metadata: { processing_time_ms: Date.now() - startTime, model_used: this.config.model },
    }
  }

  private buildMarketContext(context: ResearchContext): string {
    const sections = [`## Company: ${context.companyData.name}`]

    if (context.companyData.description) sections.push(`Description: ${context.companyData.description}`)
    if (context.companyData.industry) sections.push(`Industry: ${context.companyData.industry}`)

    if (context.competitors.length > 0) {
      sections.push('\n## Competitors')
      context.competitors.forEach(c => sections.push(`- ${c.name}: ${c.description}${c.marketShare ? ` (${c.marketShare}% market share)` : ''}`))
    }

    if (context.newsArticles.length > 0) {
      sections.push('\n## Recent Market News')
      context.newsArticles.slice(0, 5).forEach(a => sections.push(`- ${a.title} (${a.source})`))
    }

    return sections.join('\n')
  }
}

let instance: MarketAgent | null = null
export function getMarketAgent(): MarketAgent {
  if (!instance) instance = new MarketAgent()
  return instance
}
