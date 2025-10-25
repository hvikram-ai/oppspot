/**
 * Contacts & People Agent
 * Specialized agent for decision makers and organizational structure
 */

import { BaseAgent } from './base-agent'
import type { AgentAnalysis, ResearchContext, OppspotAgentType } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

export class ContactsAgent extends BaseAgent {
  constructor() {
    super(getDefaultAgentConfig('contacts' as OppspotAgentType))
  }

  async analyze(context: ResearchContext, specificQuery?: string): Promise<AgentAnalysis> {
    const startTime = Date.now()

    const contactsContext = [
      `## Company: ${context.companyData.name}`,
      context.people && context.people.length > 0 ? '\n## Key People' : '',
      ...(context.people || []).map(p => `- ${p.name} - ${p.title}${p.role ? ` (${p.role})` : ''}`),
      '\n## Recent News (People/Hiring)',
      ...context.newsArticles.filter(a => a.title.toLowerCase().match(/hire|appoint|ceo|cfo|cto|join/)).slice(0, 5).map(a => `- ${a.title}`),
    ].filter(Boolean).join('\n')

    const query = specificQuery || `Identify key decision makers and organizational structure for ${context.companyData.name}.`
    const prompt = `${contactsContext}\n\n## Analysis Request\n${query}\n\n## Instructions\nAnalyze:\n1. C-level Executives & Founders\n2. Key Decision Makers by Function\n3. Recent Hiring Patterns\n4. Organizational Structure\n5. Key Influencers for B2B Sales\n\nFocus on buying committee identification.`

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

let instance: ContactsAgent | null = null
export function getContactsAgent(): ContactsAgent {
  if (!instance) instance = new ContactsAgent()
  return instance
}
