/**
 * Router Agent
 * Classifies queries and routes them to appropriate specialized agents
 */

import { getLLMProvider } from '@/lib/ai/llm-factory'
import type { RouterClassification, OppspotAgentType, ResearchContext } from './agent-types'
import { getDefaultAgentConfig } from './agent-config'

// ============================================================================
// ROUTER AGENT
// ============================================================================

export class RouterAgent {
  private llmProvider: ReturnType<typeof getLLMProvider>
  private config: ReturnType<typeof getDefaultAgentConfig>

  constructor() {
    this.llmProvider = getLLMProvider()
    this.config = getDefaultAgentConfig('router' as OppspotAgentType)
  }

  /**
   * Classify a user query and determine which agent(s) should handle it
   */
  async classify(
    query: string,
    context?: Partial<ResearchContext>
  ): Promise<RouterClassification> {
    const startTime = Date.now()

    try {
      console.log('[Router Agent] Classifying query:', query)

      const prompt = this.buildClassificationPrompt(query, context)
      const response = await this.llmProvider.complete(prompt, {
        model: this.config.model,
        temperature: 0.1, // Low temperature for consistent routing
        max_tokens: 500,
        system_prompt: this.config.systemPrompt,
      })

      const classification = this.parseClassificationResponse(response)

      const duration = Date.now() - startTime
      console.log(
        `[Router Agent] Classification complete in ${duration}ms:`,
        classification.agentType,
        `(confidence: ${classification.confidence})`
      )

      return classification
    } catch (error) {
      console.error('[Router Agent] Classification error:', error)

      // Fallback to GENERAL agent on error
      return {
        agentType: 'general' as OppspotAgentType,
        confidence: 0.3,
        reasoning: 'Error during classification, routing to general agent',
        multiAgent: false,
      }
    }
  }

  /**
   * Build prompt for classification
   */
  private buildClassificationPrompt(
    query: string,
    context?: Partial<ResearchContext>
  ): string {
    const parts: string[] = []

    // Add context if available
    if (context?.companyData) {
      parts.push('## Company Context')
      parts.push(`Company: ${context.companyData.name}`)
      if (context.companyData.industry) {
        parts.push(`Industry: ${context.companyData.industry}`)
      }
      parts.push('')
    }

    // Add the query
    parts.push('## User Query')
    parts.push(query)
    parts.push('')

    // Add classification instructions
    parts.push('## Task')
    parts.push('Classify this query into ONE of these agent types:')
    parts.push('- RESEARCH: Deep company research, business overview, history, mission')
    parts.push('- FINANCIAL: Revenue, funding, financial health, burn rate, profitability')
    parts.push('- MARKET: Competitive analysis, market positioning, opportunities, threats')
    parts.push('- TECHNICAL: Tech stack, engineering capabilities, infrastructure, integrations')
    parts.push('- LEGAL: Compliance, regulatory, governance, legal status, filings')
    parts.push('- CONTACTS: Decision makers, key people, organizational structure, hiring')
    parts.push('- GENERAL: Greetings, uncategorized queries, or multi-domain questions')
    parts.push('')
    parts.push('If the query requires multiple specialized agents, set multi_agent=true and list all relevant agent types.')
    parts.push('')
    parts.push('Respond with ONLY valid JSON in this exact format:')
    parts.push('{')
    parts.push('  "agent_type": "financial",')
    parts.push('  "confidence": 0.92,')
    parts.push('  "reasoning": "Query asks about funding and revenue trends",')
    parts.push('  "multi_agent": false,')
    parts.push('  "agent_types": ["financial"]')
    parts.push('}')

    return parts.join('\n')
  }

  /**
   * Parse classification response from LLM
   */
  private parseClassificationResponse(response: string): RouterClassification {
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      let jsonStr = response.trim()

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      }

      const parsed = JSON.parse(jsonStr)

      // Validate required fields
      if (!parsed.agent_type) {
        throw new Error('Missing agent_type in response')
      }

      // Normalize agent type
      const agentType = (parsed.agent_type.toLowerCase()) as OppspotAgentType

      // Validate agent type
      const validTypes = [
        'router',
        'research',
        'financial',
        'market',
        'technical',
        'legal',
        'contacts',
        'general',
      ]
      if (!validTypes.includes(agentType)) {
        throw new Error(`Invalid agent type: ${agentType}`)
      }

      return {
        agentType,
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || 'No reasoning provided',
        multiAgent: parsed.multi_agent || false,
        agentTypes: parsed.agent_types || [agentType],
        parameters: parsed.parameters || {},
      }
    } catch (error) {
      console.error('[Router Agent] Failed to parse classification response:', error)
      console.error('[Router Agent] Response was:', response)

      // Fallback: try to extract agent type from text
      const agentType = this.extractAgentTypeFromText(response)

      return {
        agentType,
        confidence: 0.5,
        reasoning: 'Fallback classification due to parse error',
        multiAgent: false,
      }
    }
  }

  /**
   * Fallback: Extract agent type from free text
   */
  private extractAgentTypeFromText(text: string): OppspotAgentType {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('financial') || lowerText.includes('funding') || lowerText.includes('revenue')) {
      return 'financial' as OppspotAgentType
    }
    if (lowerText.includes('market') || lowerText.includes('competitor') || lowerText.includes('competitive')) {
      return 'market' as OppspotAgentType
    }
    if (lowerText.includes('technical') || lowerText.includes('tech stack') || lowerText.includes('engineering')) {
      return 'technical' as OppspotAgentType
    }
    if (lowerText.includes('legal') || lowerText.includes('compliance') || lowerText.includes('regulatory')) {
      return 'legal' as OppspotAgentType
    }
    if (lowerText.includes('contact') || lowerText.includes('people') || lowerText.includes('decision maker')) {
      return 'contacts' as OppspotAgentType
    }
    if (lowerText.includes('research') || lowerText.includes('overview') || lowerText.includes('about')) {
      return 'research' as OppspotAgentType
    }

    // Default to general
    return 'general' as OppspotAgentType
  }

  /**
   * Determine if query requires comprehensive multi-agent research
   */
  async isComprehensiveResearch(query: string): Promise<boolean> {
    const comprehensiveKeywords = [
      'full report',
      'complete analysis',
      'comprehensive',
      'everything about',
      'tell me about',
      'research',
      'analyze',
      'full picture',
      'due diligence',
    ]

    return comprehensiveKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword)
    )
  }

  /**
   * Get suggested follow-up queries based on classification
   */
  getSuggestedFollowUps(classification: RouterClassification): string[] {
    const suggestions: Record<string, string[]> = {
      financial: [
        'What is their revenue growth trend?',
        'Who are their investors?',
        'What is their burn rate?',
      ],
      market: [
        'Who are their main competitors?',
        'What is their market share?',
        'What are their growth opportunities?',
      ],
      technical: [
        'What is their tech stack?',
        'Do they have a public API?',
        'What cloud provider do they use?',
      ],
      legal: [
        'Are they compliant with regulations?',
        'Who are the company directors?',
        'When was the company founded?',
      ],
      contacts: [
        'Who is the CEO?',
        'Who are the key decision makers?',
        'Are they hiring?',
      ],
      research: [
        'What products do they offer?',
        'What is their business model?',
        'What are their recent milestones?',
      ],
      general: [
        'Tell me about this company',
        'What are their buying signals?',
        'Generate a full research report',
      ],
    }

    return suggestions[classification.agentType] || suggestions.general
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: RouterAgent | null = null

export function getRouterAgent(): RouterAgent {
  if (!instance) {
    instance = new RouterAgent()
  }
  return instance
}

export default RouterAgent
