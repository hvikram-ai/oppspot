/**
 * Multi-Agent ChatSpot Service
 * Enhanced conversational AI using the multi-agent system for specialized responses
 */

import { getRouterAgent } from '@/lib/agents/router-agent'
import { getMultiAgentOrchestrator } from '@/lib/agents/orchestrator'
import { createClient } from '@/lib/supabase/server'
import type { ResearchContext } from '@/lib/agents/agent-types'
import type { ChatResult } from './types'

// ============================================================================
// MULTI-AGENT CHAT SERVICE
// ============================================================================

export class MultiAgentChatService {
  private routerAgent = getRouterAgent()
  private orchestrator = getMultiAgentOrchestrator()

  /**
   * Process query using multi-agent system
   */
  async processQuery(params: {
    query: string
    companyId?: string
    companyName?: string
  }): Promise<ChatResult> {
    try {
      console.log('[Multi-Agent Chat] Processing query:', params.query)

      // If query is about a specific company, use agent system
      if (params.companyId) {
        return await this.processCompanyQuery(
          params.query,
          params.companyId,
          params.companyName || 'the company'
        )
      }

      // Otherwise, use router for general queries
      const classification = await this.routerAgent.classify(params.query)

      return {
        type: 'summary',
        data: {
          agent_type: classification.agentType,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          multi_agent: classification.multiAgent,
          suggested_actions: this.routerAgent.getSuggestedFollowUps(classification),
        },
        preview: `This query has been classified as: ${classification.agentType} (${Math.round(classification.confidence * 100)}% confidence)`,
      }
    } catch (error) {
      console.error('[Multi-Agent Chat] Error:', error)

      return {
        type: 'error',
        data: { error: 'Query processing failed' },
        preview: 'Sorry, I encountered an error processing your query',
      }
    }
  }

  /**
   * Process company-specific query
   */
  private async processCompanyQuery(
    query: string,
    companyId: string,
    companyName: string
  ): Promise<ChatResult> {
    try {
      // Fetch company data
      const supabase = await createClient()
      const { data: company, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single<unknown>()

      if (error || !company) {
        return {
          type: 'error',
          data: { error: 'Company not found' },
          preview: `Could not find company: ${companyName}`,
        }
      }

      // Build minimal research context for chat
      const context: ResearchContext = {
        companyData: {
          id: companyId,
          name: companyName,
          company_number: company.company_number || null,
          website: company.website || null,
          description: company.description || null,
          industry: company.industry || null,
          employee_count: company.employee_count || null,
        },
        newsArticles: [],
        financialData: [],
        competitors: [],
        technologies: [],
        sources: [],
        metadata: {
          sources_fetched: 0,
          sources_failed: 0,
        },
      }

      // Route query to appropriate agent
      const analysis = await this.orchestrator.routeQuery(query, context)

      return {
        type: 'research',
        data: {
          agent_type: analysis.agentType,
          content: analysis.content,
          key_insights: analysis.keyInsights,
          opportunities: analysis.opportunities,
          concerns: analysis.concerns,
          recommendations: analysis.recommendations,
          confidence: analysis.confidence,
          sources: analysis.sources,
        },
        preview: `${analysis.agentType.charAt(0).toUpperCase() + analysis.agentType.slice(1)} analysis for ${companyName}`,
      }
    } catch (error) {
      console.error('[Multi-Agent Chat] Company query error:', error)

      return {
        type: 'error',
        data: { error: 'Analysis failed' },
        preview: 'Sorry, I encountered an error analyzing the company',
      }
    }
  }

  /**
   * Check if query should use multi-agent system
   */
  shouldUseMultiAgent(query: string): boolean {
    // Use multi-agent for analytical queries
    const analyticalKeywords = [
      'analyze',
      'compare',
      'evaluate',
      'assess',
      'research',
      'investigate',
      'examine',
      'review',
      'study',
    ]

    const queryLower = query.toLowerCase()
    return analyticalKeywords.some((keyword) => queryLower.includes(keyword))
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: MultiAgentChatService | null = null

export function getMultiAgentChatService(): MultiAgentChatService {
  if (!instance) {
    instance = new MultiAgentChatService()
  }
  return instance
}

export default MultiAgentChatService
