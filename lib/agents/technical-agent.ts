/**
 * Technical Assessment Agent
 * Specialized agent for tech stack and engineering capabilities analysis
 */

import { BaseAgent } from './base-agent'
import type { AgentAnalysis, ResearchContext, OppspotAgentType } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

export class TechnicalAgent extends BaseAgent {
  constructor() {
    super(getDefaultAgentConfig('technical' as OppspotAgentType))
  }

  async analyze(context: ResearchContext, specificQuery?: string): Promise<AgentAnalysis> {
    const startTime = Date.now()

    const techContext = [
      `## Company: ${context.companyData.name}`,
      context.companyData.website ? `Website: ${context.companyData.website}` : '',
      '\n## Technology Stack',
      ...context.technologies.map(t => `- ${t.category}: ${t.name}`),
    ].filter(Boolean).join('\n')

    const query = specificQuery || `Analyze the technical capabilities and infrastructure of ${context.companyData.name}.`
    const prompt = `${techContext}\n\n## Analysis Request\n${query}\n\n## Instructions\nAnalyze:\n1. Technology Stack Assessment\n2. Engineering Capabilities\n3. Infrastructure Maturity\n4. Integration Capabilities\n5. Technical Buying Signals\n\nFocus on technical fit for B2B partnerships.`

    const content = await this.executeLLM(prompt)

    return {
      agentType: this.config.type,
      content,
      keyInsights: this.extractKeyInsights(content),
      recommendations: this.extractRecommendations(content),
      confidence: this.calculateConfidence(context),
      sources: this.extractSources(context),
      metadata: { processing_time_ms: Date.now() - startTime, model_used: this.config.model },
    }
  }
}

let instance: TechnicalAgent | null = null
export function getTechnicalAgent(): TechnicalAgent {
  if (!instance) instance = new TechnicalAgent()
  return instance
}
