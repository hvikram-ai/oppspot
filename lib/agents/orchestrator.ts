/**
 * Multi-Agent Orchestrator
 * Coordinates multiple agents for comprehensive research and analysis
 */

import { getRouterAgent } from './router-agent'
import { getFinancialAgent } from './financial-agent'
import { getMarketAgent } from './market-agent'
import { getTechnicalAgent } from './technical-agent'
import { getLegalAgent } from './legal-agent'
import { getResearchAgent } from './research-agent'
import { getContactsAgent } from './contacts-agent'
import { getGeneralAgent } from './general-agent'
import { getAgentManager } from './agent-manager'
import type {
  ResearchContext,
  OppspotAgentType,
  AgentAnalysis,
  MultiAgentReport,
  BuyingSignal,
  Source,
  AgentExecutionMetrics,
} from './agent-types'
import type { BaseAgent } from './base-agent'

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class MultiAgentOrchestrator {
  private routerAgent = getRouterAgent()
  private agentManager = getAgentManager()

  // Lazy-loaded agents
  private agents: Map<OppspotAgentType, BaseAgent>

  constructor() {
    this.agents = new Map()
  }

  /**
   * Get agent by type (lazy loading)
   */
  private getAgent(type: OppspotAgentType): BaseAgent {
    if (this.agents.has(type)) {
      return this.agents.get(type)!
    }

    // Load agent based on type
    let agent: BaseAgent
    switch (type) {
      case 'financial':
        agent = getFinancialAgent()
        break
      case 'market':
        agent = getMarketAgent()
        break
      case 'technical':
        agent = getTechnicalAgent()
        break
      case 'legal':
        agent = getLegalAgent()
        break
      case 'research':
        agent = getResearchAgent()
        break
      case 'contacts':
        agent = getContactsAgent()
        break
      case 'general':
        agent = getGeneralAgent()
        break
      default:
        agent = getGeneralAgent()
    }

    this.agents.set(type, agent)
    return agent
  }

  /**
   * Route a specific query to the appropriate agent
   */
  async routeQuery(
    query: string,
    context: ResearchContext
  ): Promise<AgentAnalysis> {
    const startTime = Date.now()

    console.log('[Orchestrator] Routing query:', query)

    // Classify query using router
    const classification = await this.routerAgent.classify(query, context)

    console.log(
      `[Orchestrator] Routed to ${classification.agentType} agent (confidence: ${classification.confidence})`
    )

    // If multi-agent query, execute all relevant agents in parallel
    if (classification.multiAgent && classification.agentTypes) {
      const analyses = await this.parallelExecute(
        classification.agentTypes,
        context,
        query
      )

      // Synthesize results
      return this.synthesizeAnalyses(analyses, context)
    }

    // Single agent execution
    const agent = this.getAgent(classification.agentType)
    const analysis = await agent.analyze(context, query)

    // Record metrics
    this.recordMetrics({
      agentType: classification.agentType,
      executionTime: Date.now() - startTime,
      success: true,
    })

    return analysis
  }

  /**
   * Execute comprehensive multi-agent research
   * Runs all specialized agents in parallel for complete analysis
   */
  async comprehensiveResearch(
    context: ResearchContext
  ): Promise<MultiAgentReport> {
    const startTime = Date.now()

    console.log(
      `[Orchestrator] Starting comprehensive research for ${context.companyData.name}`
    )

    // Define agents to run based on available data
    const agentsToRun: OppspotAgentType[] = [
      'research' as OppspotAgentType,
      'financial' as OppspotAgentType,
      'market' as OppspotAgentType,
    ]

    // Add optional agents if we have relevant data
    if (context.technologies.length > 0) {
      agentsToRun.push('technical' as OppspotAgentType)
    }
    if (context.companyData.company_number) {
      agentsToRun.push('legal' as OppspotAgentType)
    }
    if (context.people && context.people.length > 0) {
      agentsToRun.push('contacts' as OppspotAgentType)
    }

    console.log(`[Orchestrator] Running ${agentsToRun.length} agents in parallel`)

    // Execute agents in parallel
    const analyses = await this.parallelExecute(agentsToRun, context)

    // Build comprehensive report
    const report = this.buildComprehensiveReport(
      analyses,
      context,
      Date.now() - startTime
    )

    console.log(
      `[Orchestrator] Comprehensive research complete in ${report.metadata.total_processing_time_ms}ms`
    )

    return report
  }

  /**
   * Execute multiple agents in parallel
   */
  async parallelExecute(
    agentTypes: OppspotAgentType[],
    context: ResearchContext,
    query?: string
  ): Promise<AgentAnalysis[]> {
    const startTime = Date.now()

    // Create promises for all agents
    const agentPromises = agentTypes.map(async (type) => {
      const agentStartTime = Date.now()
      try {
        const agent = this.getAgent(type)
        const analysis = await agent.analyze(context, query)

        // Record success metrics
        this.recordMetrics({
          agentType: type,
          executionTime: Date.now() - agentStartTime,
          success: true,
        })

        return analysis
      } catch (error) {
        console.error(`[Orchestrator] Agent ${type} failed:`, error)

        // Record failure metrics
        this.recordMetrics({
          agentType: type,
          executionTime: Date.now() - agentStartTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // Return partial result on error
        return {
          agentType: type,
          content: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          keyInsights: [],
          confidence: 0,
          sources: [],
        }
      }
    })

    // Wait for all agents to complete
    const results = await Promise.all(agentPromises)

    const duration = Date.now() - startTime
    console.log(
      `[Orchestrator] Parallel execution complete in ${duration}ms (${agentTypes.length} agents)`
    )

    // Filter out failed analyses
    return results.filter((r) => r.confidence > 0)
  }

  /**
   * Synthesize multiple agent analyses into single response
   */
  private synthesizeAnalyses(
    analyses: AgentAnalysis[],
    context: ResearchContext
  ): AgentAnalysis {
    // Combine content from all agents
    const combinedContent = analyses
      .map(
        (a) =>
          `## ${a.agentType.charAt(0).toUpperCase() + a.agentType.slice(1)} Analysis\n\n${a.content}`
      )
      .join('\n\n---\n\n')

    // Aggregate insights
    const allInsights = analyses.flatMap((a) => a.keyInsights || [])
    const allOpportunities = analyses.flatMap((a) => a.opportunities || [])
    const allConcerns = analyses.flatMap((a) => a.concerns || [])
    const allRecommendations = analyses.flatMap((a) => a.recommendations || [])

    // Aggregate sources and deduplicate
    const allSources = this.deduplicateSources(
      analyses.flatMap((a) => a.sources || [])
    )

    // Calculate average confidence
    const avgConfidence =
      analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length

    return {
      agentType: 'general' as OppspotAgentType, // Multi-agent result
      content: combinedContent,
      keyInsights: allInsights.slice(0, 10), // Top 10 insights
      opportunities: allOpportunities.slice(0, 5),
      concerns: allConcerns.slice(0, 5),
      recommendations: allRecommendations.slice(0, 5),
      confidence: avgConfidence,
      sources: allSources.slice(0, 20), // Top 20 sources
    }
  }

  /**
   * Build comprehensive multi-agent report
   */
  private buildComprehensiveReport(
    analyses: AgentAnalysis[],
    context: ResearchContext,
    totalTime: number
  ): MultiAgentReport {
    // Organize analyses by agent type
    const sections: MultiAgentReport['sections'] = {}
    analyses.forEach((analysis) => {
      sections[analysis.agentType as keyof MultiAgentReport['sections']] =
        analysis
    })

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(analyses, context)

    // Detect buying signals
    const buyingSignals = this.detectBuyingSignals(analyses, context)

    // Calculate opportunity score
    const opportunityScore = this.calculateOpportunityScore(analyses)

    // Aggregate all sources
    const allSources = this.deduplicateSources(
      analyses.flatMap((a) => a.sources || [])
    )

    return {
      company: context.companyData.name,
      executiveSummary,
      sections,
      buyingSignals,
      opportunityScore,
      allSources,
      metadata: {
        total_agents_used: analyses.length,
        parallel_execution: true,
        total_processing_time_ms: totalTime,
        generated_at: new Date().toISOString(),
      },
    }
  }

  /**
   * Generate executive summary from all agent analyses
   */
  private generateExecutiveSummary(
    analyses: AgentAnalysis[],
    context: ResearchContext
  ): string {
    const parts: string[] = []

    parts.push(`# ${context.companyData.name} - Executive Summary`)
    parts.push('')

    // Company overview
    if (context.companyData.description) {
      parts.push(`**Overview:** ${context.companyData.description}`)
      parts.push('')
    }

    // Key insights from each agent
    analyses.forEach((analysis) => {
      if (analysis.keyInsights && analysis.keyInsights.length > 0) {
        parts.push(
          `**${analysis.agentType.charAt(0).toUpperCase() + analysis.agentType.slice(1)}:**`
        )
        parts.push(`- ${analysis.keyInsights[0]}`) // Top insight from each agent
      }
    })

    // Overall assessment
    const avgConfidence =
      analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
    parts.push('')
    parts.push(
      `**Analysis Confidence:** ${Math.round(avgConfidence * 100)}% (based on ${analyses.length} specialized agents)`
    )

    return parts.join('\n')
  }

  /**
   * Detect buying signals from agent analyses
   */
  private detectBuyingSignals(
    analyses: AgentAnalysis[],
    context: ResearchContext
  ): BuyingSignal[] {
    const signals: BuyingSignal[] = []

    // Look for hiring signals from contacts agent
    const contactsAnalysis = analyses.find((a) => a.agentType === 'contacts')
    if (contactsAnalysis?.content.toLowerCase().includes('hiring')) {
      signals.push({
        type: 'hiring',
        description: 'Company is actively hiring',
        confidence: contactsAnalysis.confidence,
        detected_at: new Date().toISOString(),
        source: 'contacts_agent',
      })
    }

    // Look for funding signals from financial agent
    const financialAnalysis = analyses.find((a) => a.agentType === 'financial')
    if (
      financialAnalysis?.content.toLowerCase().includes('funding') ||
      financialAnalysis?.content.toLowerCase().includes('investment')
    ) {
      signals.push({
        type: 'funding',
        description: 'Recent funding or investment activity',
        confidence: financialAnalysis.confidence,
        detected_at: new Date().toISOString(),
        source: 'financial_agent',
      })
    }

    // Look for expansion signals from market agent
    const marketAnalysis = analyses.find((a) => a.agentType === 'market')
    if (
      marketAnalysis?.content.toLowerCase().includes('expansion') ||
      marketAnalysis?.content.toLowerCase().includes('growth')
    ) {
      signals.push({
        type: 'expansion',
        description: 'Market expansion or growth indicators',
        confidence: marketAnalysis.confidence,
        detected_at: new Date().toISOString(),
        source: 'market_agent',
      })
    }

    // Look for technology adoption signals
    const technicalAnalysis = analyses.find((a) => a.agentType === 'technical')
    if (
      technicalAnalysis?.content.toLowerCase().includes('adopting') ||
      technicalAnalysis?.content.toLowerCase().includes('implementing')
    ) {
      signals.push({
        type: 'technology',
        description: 'New technology adoption',
        confidence: technicalAnalysis.confidence,
        detected_at: new Date().toISOString(),
        source: 'technical_agent',
      })
    }

    return signals
  }

  /**
   * Calculate overall opportunity score
   */
  private calculateOpportunityScore(analyses: AgentAnalysis[]): number {
    // Weight each agent's contribution
    const weights: Record<string, number> = {
      financial: 0.25,
      market: 0.25,
      technical: 0.15,
      legal: 0.10,
      research: 0.15,
      contacts: 0.10,
    }

    let weightedScore = 0
    let totalWeight = 0

    analyses.forEach((analysis) => {
      const weight = weights[analysis.agentType] || 0.1
      weightedScore += analysis.confidence * weight * 100
      totalWeight += weight
    })

    return Math.round(weightedScore / totalWeight)
  }

  /**
   * Deduplicate sources by URL
   */
  private deduplicateSources(sources: Source[]): Source[] {
    const seen = new Set<string>()
    return sources.filter((source) => {
      if (seen.has(source.url)) {
        return false
      }
      seen.add(source.url)
      return true
    })
  }

  /**
   * Record agent execution metrics
   */
  private recordMetrics(metrics: AgentExecutionMetrics): void {
    this.agentManager.recordExecution(metrics)
  }

  /**
   * Get orchestrator health status
   */
  async getHealth() {
    const systemHealth = this.agentManager.getSystemHealth()

    return {
      ...systemHealth,
      orchestrator: {
        initialized: this.agents.size > 0,
        availableAgents: Array.from(this.agents.keys()),
      },
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: MultiAgentOrchestrator | null = null

export function getMultiAgentOrchestrator(): MultiAgentOrchestrator {
  if (!instance) {
    instance = new MultiAgentOrchestrator()
  }
  return instance
}

export default MultiAgentOrchestrator
