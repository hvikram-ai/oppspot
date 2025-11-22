/**
 * OpportunityBot Agent
 * 24/7 Autonomous Deal Finder
 *
 * What it does:
 * - Scans for new opportunities based on criteria
 * - Scores and ranks opportunities
 * - Generates research summaries
 * - Sends notifications for high-priority leads
 *
 * Runs: Scheduled (daily, hourly, etc.)
 */

import { BaseAgent, AgentConfig, AgentExecutionContext, AgentExecutionResult } from './base-agent'
import { createClient } from '@/lib/supabase/server'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { ollamaEmbeddingService } from '@/lib/ai/embedding/ollama-embedding-service'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Row } from '@/lib/supabase/helpers'

// Company candidate type from database query
interface CompanyCandidate {
  id: string
  name: string
  description?: string
  sic_codes?: string[]
  website?: string
  address?: {
    city?: string
    region?: string
  }
  categories?: string[]
}

// Buying signal type
interface BuyingSignal {
  id: string
  company_id: string
  signal_type: string
  signal_strength: string
  confidence_score: number
  status: string
  detected_at: string
  metadata?: Record<string, unknown>
}

export interface OpportunityBotConfig {
  criteria: {
    industries?: string[] // SIC codes or industry names
    employeeRange?: { min?: number; max?: number }
    revenueRange?: { min?: number; max?: number }
    location?: string[] // Cities or regions
    fundingStage?: string[] // Seed, Series A, B, C, etc.
    signals?: string[] // Buying signals to look for
  }
  scoringWeights?: {
    fitScore?: number
    buyingSignals?: number
    recentActivity?: number
  }
  minScore?: number // Minimum score to qualify
  maxOpportunities?: number // Max opportunities per run
  notifications?: {
    email?: boolean
    slack?: boolean
    threshold?: number // Only notify if score > threshold
  }
}

interface Opportunity {
  companyId: string
  companyName: string
  score: number
  fitScore: number
  signalScore: number
  reasons: string[]
  signals: BuyingSignal[]
}

export class OpportunityBot extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now()
    const metrics = {
      durationMs: 0,
      itemsProcessed: 0,
      apiCalls: 0,
      tokensUsed: 0,
      cost: 0
    }

    const config = this.config.configuration as OpportunityBotConfig
    const opportunities: Opportunity[] = []

    this.log('Starting opportunity scan')

    try {
      // Step 1: Find candidate companies based on criteria
      const candidates = await this.findCandidates(config)
      this.log(`Found ${candidates.length} candidate companies`)

      // Step 2: Score each candidate
      for (const candidate of candidates) {
        const opportunity = await this.scoreOpportunity(candidate, config)

        if (opportunity.score >= (config.minScore || 70)) {
          opportunities.push(opportunity)
        }

        metrics.itemsProcessed++
      }

      // Step 3: Sort by score and limit
      opportunities.sort((a, b) => b.score - a.score)
      const topOpportunities = opportunities.slice(0, config.maxOpportunities || 10)

      this.log(`Identified ${topOpportunities.length} qualified opportunities`)

      // Step 4: Send notifications for high-priority opportunities
      if (config.notifications?.email || config.notifications?.slack) {
        const threshold = config.notifications.threshold || 85
        const highPriority = topOpportunities.filter(o => o.score >= threshold)

        if (highPriority.length > 0) {
          await this.sendNotifications(highPriority, config)
        }
      }

      metrics.durationMs = Date.now() - startTime

      return {
        success: true,
        output: {
          opportunities: topOpportunities,
          totalScanned: metrics.itemsProcessed,
          qualified: topOpportunities.length
        },
        metrics
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      metrics.durationMs = Date.now() - startTime
      return {
        success: false,
        output: {},
        error: errorMessage,
        metrics
      }
    }
  }

  async validateConfig(): Promise<boolean> {
    const config = this.config.configuration as OpportunityBotConfig

    if (!config.criteria) {
      this.log('Configuration error: No criteria specified', 'error')
      return false
    }

    // At least one criteria must be specified
    const hasCriteria =
      config.criteria.industries?.length ||
      config.criteria.employeeRange ||
      config.criteria.location?.length ||
      config.criteria.fundingStage?.length

    if (!hasCriteria) {
      this.log('Configuration error: At least one search criteria required', 'error')
      return false
    }

    return true
  }

  /**
   * Find candidate companies matching criteria
   */
  private async findCandidates(config: OpportunityBotConfig) {
    const supabase = await createClient()

    let query = supabase
      .from('businesses')
      .select('id, name, description, sic_codes, website, address, categories')

    // Apply industry filter
    if (config.criteria.industries && config.criteria.industries.length > 0) {
      query = query.overlaps('sic_codes', config.criteria.industries)
    }

    // Apply location filter
    if (config.criteria.location && config.criteria.location.length > 0) {
      // Simplified: would check address.city or address.region
      // For now, basic text search
    }

    // Limit initial candidates
    query = query.limit(200)

    const { data, error } = await query as { data: CompanyCandidate[] | null; error: PostgrestError | null }

    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`)
    }

    return data || []
  }

  /**
   * Score an opportunity
   */
  private async scoreOpportunity(
    company: CompanyCandidate,
    config: OpportunityBotConfig
  ): Promise<Opportunity> {
    const weights = config.scoringWeights || {
      fitScore: 0.5,
      buyingSignals: 0.3,
      recentActivity: 0.2
    }

    // Calculate fit score (how well they match criteria)
    const fitScore = await this.calculateFitScore(company, config)

    // Check for buying signals
    const signals = await this.checkBuyingSignals(company.id)
    const signalScore = signals.length > 0 ? Math.min(signals.length * 20, 100) : 0

    // Calculate activity score (recent updates, changes)
    const activityScore = 50 // TODO: Implement based on last_updated, etc.

    // Weighted total score
    const totalScore =
      (fitScore * weights.fitScore!) +
      (signalScore * weights.buyingSignals!) +
      (activityScore * weights.recentActivity!)

    const reasons = []
    if (fitScore >= 80) reasons.push('Strong ICP match')
    if (signals.length > 0) reasons.push(`${signals.length} buying signal(s)`)
    if (company.description?.toLowerCase().includes('growing')) reasons.push('Growth indicators')

    return {
      companyId: company.id,
      companyName: company.name,
      score: Math.round(totalScore),
      fitScore: Math.round(fitScore),
      signalScore: Math.round(signalScore),
      reasons,
      signals
    }
  }

  /**
   * Calculate how well company fits ideal customer profile
   */
  private async calculateFitScore(company: CompanyCandidate, config: OpportunityBotConfig): Promise<number> {
    let score = 50 // Base score

    // Industry match
    if (config.criteria.industries && company.sic_codes) {
      const hasMatch = config.criteria.industries.some(ind =>
        company.sic_codes.includes(ind)
      )
      if (hasMatch) score += 30
    }

    // Location match
    if (config.criteria.location && company.address) {
      const locationMatch = config.criteria.location.some(loc =>
        company.address.city?.toLowerCase().includes(loc.toLowerCase()) ||
        company.address.region?.toLowerCase().includes(loc.toLowerCase())
      )
      if (locationMatch) score += 20
    }

    return Math.min(score, 100)
  }

  /**
   * Check for buying signals
   */
  private async checkBuyingSignals(companyId: string) {
    const supabase = await createClient()

    const { data } = await supabase
      .from('buying_signals')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .gte('detected_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) as { data: BuyingSignal[] | null; error: PostgrestError | null } // Last 30 days

    return data || []
  }

  /**
   * Send notifications for high-priority opportunities
   */
  private async sendNotifications(opportunities: Opportunity[], config: OpportunityBotConfig) {
    this.log(`Sending notifications for ${opportunities.length} high-priority opportunities`)

    // TODO: Implement email notifications
    // TODO: Implement Slack notifications

    // For now, just log
    for (const opp of opportunities) {
      this.log(`🔥 High-priority opportunity: ${opp.companyName} (score: ${opp.score})`)
    }
  }
}

/**
 * Create an OpportunityBot instance from database config
 */
export async function createOpportunityBot(agentId: string): Promise<OpportunityBot> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .eq('agent_type', 'opportunity_bot')
    .single() as { data: Row<'ai_agents'> | null; error: PostgrestError | null }

  if (error || !data) {
    throw new Error(`OpportunityBot not found: ${agentId}`)
  }

  const config: AgentConfig = {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    type: data.agent_type,
    configuration: data.configuration,
    isActive: data.is_active,
    scheduleCron: data.schedule_cron
  }

  return new OpportunityBot(config)
}
