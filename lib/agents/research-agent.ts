/**
 * Deep Research Agent
 * Specialized agent for comprehensive business intelligence
 */

import { BaseAgent } from './base-agent'
import type { AgentAnalysis, ResearchContext, OppspotAgentType } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

export class ResearchAgent extends BaseAgent {
  constructor() {
    super(getDefaultAgentConfig('research' as OppspotAgentType))
  }

  async analyze(context: ResearchContext, specificQuery?: string): Promise<AgentAnalysis> {
    const startTime = Date.now()

    const researchContext = this.buildContextString(context)
    const query = specificQuery || `Provide comprehensive business intelligence on ${context.companyData.name}.`
    const prompt = `${researchContext}\n\n## Analysis Request\n${query}\n\n## Instructions\nProvide comprehensive overview:\n1. Company Background & History\n2. Business Model & Revenue Streams\n3. Products & Services\n4. Growth Trajectory & Milestones\n5. Strategic Initiatives\n\nCreate executive summary for B2B sales teams.`

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
}

let instance: ResearchAgent | null = null
export function getResearchAgent(): ResearchAgent {
  if (!instance) instance = new ResearchAgent()
  return instance
}
