/**
 * General Purpose Agent
 * Handles conversational and multi-domain queries
 */

import { BaseAgent } from './base-agent'
import type { AgentAnalysis, ResearchContext, OppspotAgentType } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

export class GeneralAgent extends BaseAgent {
  constructor() {
    super(getDefaultAgentConfig('general' as OppspotAgentType))
  }

  async analyze(context: ResearchContext, specificQuery?: string): Promise<AgentAnalysis> {
    const startTime = Date.now()

    const generalContext = [
      `## Company: ${context.companyData.name}`,
      context.companyData.description || '',
      context.companyData.industry ? `Industry: ${context.companyData.industry}` : '',
      context.newsArticles.length > 0 ? `\n## Recent News: ${context.newsArticles.length} articles available` : '',
      context.financialData.length > 0 ? `Financial Data: ${context.financialData.length} years available` : '',
    ].filter(Boolean).join('\n')

    const query = specificQuery || `Provide information about ${context.companyData.name}.`
    const prompt = `${generalContext}\n\n## Query\n${query}\n\n## Instructions\nProvide helpful, concise response. Be professional and action-oriented. Keep under 200 words unless detailed explanation needed.`

    const content = await this.executeLLM(prompt)

    return {
      agentType: this.config.type,
      content,
      keyInsights: this.extractKeyInsights(content),
      confidence: this.calculateConfidence(context),
      sources: this.extractSources(context),
      metadata: { processing_time_ms: Date.now() - startTime, model_used: this.config.model },
    }
  }
}

let instance: GeneralAgent | null = null
export function getGeneralAgent(): GeneralAgent {
  if (!instance) instance = new GeneralAgent()
  return instance
}
