/**
 * Base Agent Class
 * Abstract base class for all specialized agents in the multi-agent system
 */

import { getLLMProvider } from '@/lib/ai/llm-factory'
import type {
  AgentAnalysis,
  ResearchContext,
  Source,
  OppspotAgentType,
} from './agent-types'
import type { AgentConfig } from './agent-config'
import { DEFAULT_AGENT_TIMEOUT, DEFAULT_AGENT_RETRIES } from './agent-config'

// ============================================================================
// BASE AGENT CLASS
// ============================================================================

export abstract class BaseAgent {
  protected config: AgentConfig
  protected llmProvider: ReturnType<typeof getLLMProvider>

  constructor(config: AgentConfig) {
    this.config = config
    this.llmProvider = getLLMProvider()
  }

  /**
   * Abstract method: Each agent must implement its own analysis logic
   */
  abstract analyze(
    context: ResearchContext,
    specificQuery?: string
  ): Promise<AgentAnalysis>

  /**
   * Execute LLM request with retry logic and error handling
   */
  protected async executeLLM(prompt: string): Promise<string> {
    const startTime = Date.now()
    const maxRetries = this.config.retries || DEFAULT_AGENT_RETRIES
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[${this.config.name}] Executing LLM request (attempt ${attempt + 1}/${maxRetries + 1})`
        )

        const response = await Promise.race([
          this.llmProvider.complete(prompt, {
            model: this.config.model,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            system_prompt: this.config.systemPrompt,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('LLM request timeout')),
              this.config.timeout || DEFAULT_AGENT_TIMEOUT
            )
          ),
        ])

        const duration = Date.now() - startTime
        console.log(`[${this.config.name}] LLM request completed in ${duration}ms`)

        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(
          `[${this.config.name}] LLM request failed (attempt ${attempt + 1}):`,
          lastError.message
        )

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw new Error(
      `[${this.config.name}] Failed after ${maxRetries + 1} attempts: ${lastError?.message}`
    )
  }

  /**
   * Build context string from ResearchContext for LLM prompt
   */
  protected buildContextString(context: ResearchContext): string {
    const sections: string[] = []

    // Company Information
    sections.push('## Company Information')
    sections.push(`Name: ${context.companyData.name}`)
    if (context.companyData.description) {
      sections.push(`Description: ${context.companyData.description}`)
    }
    if (context.companyData.industry) {
      sections.push(`Industry: ${context.companyData.industry}`)
    }
    if (context.companyData.employee_count) {
      sections.push(`Employees: ${context.companyData.employee_count}`)
    }
    if (context.companyData.website) {
      sections.push(`Website: ${context.companyData.website}`)
    }

    // Financial Data
    if (context.financialData.length > 0) {
      sections.push('\n## Financial Data')
      context.financialData.forEach((data) => {
        const parts = [`Year ${data.year}`]
        if (data.revenue) parts.push(`Revenue: £${data.revenue.toLocaleString()}`)
        if (data.growth) parts.push(`Growth: ${data.growth}%`)
        if (data.profit) parts.push(`Profit: £${data.profit.toLocaleString()}`)
        sections.push(parts.join(' | '))
      })
    }

    // Funding History
    if (context.companyData.fundingRounds && context.companyData.fundingRounds.length > 0) {
      sections.push('\n## Funding History')
      context.companyData.fundingRounds.forEach((round) => {
        sections.push(
          `${round.date}: ${round.type} - ${round.amount} (Investors: ${round.investors.join(', ')})`
        )
      })
    }

    // Recent News
    if (context.newsArticles.length > 0) {
      sections.push('\n## Recent News & Developments')
      context.newsArticles.slice(0, 10).forEach((article) => {
        sections.push(`- ${article.title}`)
        if (article.summary) {
          sections.push(`  ${article.summary}`)
        }
        sections.push(`  Source: ${article.source} (${article.published_date || 'No date'})`)
      })
    }

    // Competitors
    if (context.competitors.length > 0) {
      sections.push('\n## Competitors')
      context.competitors.forEach((comp) => {
        sections.push(`- ${comp.name}: ${comp.description}`)
        if (comp.marketShare) {
          sections.push(`  Market Share: ${comp.marketShare}%`)
        }
      })
    }

    // Technologies
    if (context.technologies.length > 0) {
      sections.push('\n## Technology Stack')
      const techByCategory = context.technologies.reduce(
        (acc, tech) => {
          if (!acc[tech.category]) acc[tech.category] = []
          acc[tech.category].push(tech.name)
          return acc
        },
        {} as Record<string, string[]>
      )

      Object.entries(techByCategory).forEach(([category, techs]) => {
        sections.push(`${category}: ${techs.join(', ')}`)
      })
    }

    // People
    if (context.people && context.people.length > 0) {
      sections.push('\n## Key People')
      context.people.forEach((person) => {
        sections.push(`- ${person.name} - ${person.title}`)
        if (person.role) {
          sections.push(`  Role: ${person.role}`)
        }
      })
    }

    return sections.join('\n')
  }

  /**
   * Extract key insights from analysis content
   */
  protected extractKeyInsights(content: string): string[] {
    const insights: string[] = []

    // Look for bullet points or numbered lists
    const bulletPoints = content.match(/^[-•*]\s+(.+)$/gm)
    if (bulletPoints) {
      insights.push(...bulletPoints.map((point) => point.replace(/^[-•*]\s+/, '').trim()))
    }

    // Look for "Key insight:" or "Important:" patterns
    const keyPhrases = content.match(/(?:Key insight|Important|Notable|Significant):\s+(.+?)(?:\.|$)/gi)
    if (keyPhrases) {
      insights.push(...keyPhrases.map((phrase) => phrase.trim()))
    }

    // If we didn't find specific insights, extract first few sentences
    if (insights.length === 0) {
      const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20)
      insights.push(...sentences.slice(0, 3).map((s) => s.trim()))
    }

    return insights.slice(0, 5) // Max 5 insights
  }

  /**
   * Extract concerns or risks from content
   */
  protected extractConcerns(content: string): string[] {
    const concerns: string[] = []

    // Look for risk/concern indicators
    const riskPatterns = [
      /(?:Risk|Concern|Warning|Issue|Problem|Challenge):\s+(.+?)(?:\.|$)/gi,
      /(?:However|But|Unfortunately),\s+(.+?)(?:\.|$)/gi,
    ]

    riskPatterns.forEach((pattern) => {
      const matches = content.match(pattern)
      if (matches) {
        concerns.push(...matches.map((m) => m.trim()))
      }
    })

    return concerns.slice(0, 5) // Max 5 concerns
  }

  /**
   * Extract opportunities from content
   */
  protected extractOpportunities(content: string): string[] {
    const opportunities: string[] = []

    // Look for opportunity indicators
    const opportunityPatterns = [
      /(?:Opportunity|Potential|Growth area|Expansion|Advantage):\s+(.+?)(?:\.|$)/gi,
      /(?:Could|Should|Recommend|Consider)\s+(.+?)(?:\.|$)/gi,
    ]

    opportunityPatterns.forEach((pattern) => {
      const matches = content.match(pattern)
      if (matches) {
        opportunities.push(...matches.map((m) => m.trim()))
      }
    })

    return opportunities.slice(0, 5) // Max 5 opportunities
  }

  /**
   * Extract recommendations from content
   */
  protected extractRecommendations(content: string): string[] {
    const recommendations: string[] = []

    // Look for recommendation patterns
    const recPatterns = [
      /(?:Recommend|Suggest|Should|Action):\s+(.+?)(?:\.|$)/gi,
      /^[\d]+\.\s+(.+)$/gm, // Numbered lists often contain recommendations
    ]

    recPatterns.forEach((pattern) => {
      const matches = content.match(pattern)
      if (matches) {
        recommendations.push(...matches.map((m) => m.trim()))
      }
    })

    return recommendations.slice(0, 5) // Max 5 recommendations
  }

  /**
   * Extract and format sources from context
   */
  protected extractSources(context: ResearchContext): Source[] {
    return context.sources
      .filter((source) => source.url && source.title)
      .slice(0, 10) // Max 10 sources per agent
  }

  /**
   * Calculate confidence score based on data availability
   */
  protected calculateConfidence(context: ResearchContext): number {
    let score = 0.5 // Base confidence

    // Increase confidence based on available data
    if (context.companyData) score += 0.1
    if (context.financialData.length > 0) score += 0.1
    if (context.newsArticles.length > 0) score += 0.1
    if (context.sources.length >= 5) score += 0.1
    if (context.metadata.sources_failed === 0) score += 0.1

    return Math.min(score, 1.0)
  }

  /**
   * Get agent status and metrics
   */
  getStatus() {
    return {
      name: this.config.name,
      type: this.config.type,
      enabled: this.config.enabled,
      model: this.config.model,
      description: this.config.description,
    }
  }
}

export default BaseAgent
