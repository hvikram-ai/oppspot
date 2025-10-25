/**
 * Legal & Compliance Agent
 * Specialized agent for legal status and regulatory analysis
 */

import { BaseAgent } from './base-agent'
import type { AgentAnalysis, ResearchContext, OppspotAgentType } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

export class LegalAgent extends BaseAgent {
  constructor() {
    super(getDefaultAgentConfig('legal' as OppspotAgentType))
  }

  async analyze(context: ResearchContext, specificQuery?: string): Promise<AgentAnalysis> {
    const startTime = Date.now()

    const legalContext = [
      `## Company: ${context.companyData.name}`,
      context.companyData.company_number ? `Company Number: ${context.companyData.company_number}` : '',
      context.companyData.founded_date ? `Incorporated: ${context.companyData.founded_date}` : '',
      '\n## Financial Data',
      ...context.financialData.slice(0, 3).map(d => `Year ${d.year}: Assets £${d.assets?.toLocaleString() || 'N/A'}, Liabilities £${d.liabilities?.toLocaleString() || 'N/A'}`),
    ].filter(Boolean).join('\n')

    const query = specificQuery || `Analyze the legal status and compliance of ${context.companyData.name}.`
    const prompt = `${legalContext}\n\n## Analysis Request\n${query}\n\n## Instructions\nAnalyze:\n1. Company Registration Status\n2. Legal Structure & Officers\n3. Compliance Status\n4. Regulatory Requirements\n5. Legal Risks & Red Flags\n\nHighlight compliance issues affecting sales cycles.`

    const content = await this.executeLLM(prompt)

    return {
      agentType: this.config.type,
      content,
      keyInsights: this.extractKeyInsights(content),
      concerns: this.extractConcerns(content),
      confidence: this.calculateConfidence(context),
      sources: this.extractSources(context),
      metadata: { processing_time_ms: Date.now() - startTime, model_used: this.config.model },
    }
  }
}

let instance: LegalAgent | null = null
export function getLegalAgent(): LegalAgent {
  if (!instance) instance = new LegalAgent()
  return instance
}
