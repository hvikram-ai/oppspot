/**
 * Scoring Agent
 * Scores and prioritizes companies based on goal criteria
 *
 * Responsibilities:
 * - Re-score companies with updated data
 * - Prioritize companies based on fit
 * - Update quality scores
 * - Reorder stream items by priority
 */

import { BaseAgent, AgentConfig, AgentExecutionContext, AgentExecutionResult } from '@/lib/ai/agents/base-agent'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

export class ScoringAgent extends BaseAgent {
  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now()
    let itemsProcessed = 0
    let itemsUpdated = 0
    const qualityScores: number[] = []

    try {
      this.log('Starting company scoring...')

      const { stream_id, goal_context } = context.input

      if (!stream_id) {
        throw new Error('stream_id is required')
      }

      // Fetch stream
      const supabase = await createClient()
      const { data: stream } = await supabase
        .from('streams')
        .select('*')
        .eq('id', stream_id)
        .single() as { data: (Row<'streams'> & {
          goal_criteria?: unknown
          target_metrics?: unknown
        }) | null; error: unknown }

      if (!stream) {
        throw new Error(`Stream not found: ${stream_id}`)
      }

      const goalContextTyped = goal_context as Record<string, unknown> & {
        goal_criteria?: unknown
        target_metrics?: unknown
      } | undefined
      const criteria = (goalContextTyped?.goal_criteria || stream.goal_criteria || {}) as Record<string, unknown>
      const targetMetrics = (goalContextTyped?.target_metrics || stream.target_metrics || {}) as Record<string, unknown>

      // Fetch stream items to score
      const items = await this.getItemsToScore(stream_id as string)
      itemsProcessed = items.length

      this.log(`Scoring ${items.length} companies...`)

      // Score each item
      for (const item of items) {
        if (!item.business_id) continue

        // Fetch company data
        const { data: company } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', item.business_id)
          .single() as { data: Row<'businesses'> | null; error: unknown }

        if (!company) continue

        // Calculate new quality score
        const qualityScore = await this.calculateQualityScore(
          company,
          criteria,
          targetMetrics,
          item.metadata
        )

        qualityScores.push(qualityScore)

        // Determine priority
        const priority = this.determinePriority(qualityScore)

        // Update item
        await this.updateItemScore(item.id, qualityScore, priority)
        itemsUpdated++
      }

      // Reorder items by score
      await this.reorderStreamItems(stream_id as string)

      const avgQualityScore = qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0

      const durationMs = Date.now() - startTime

      this.log(`Completed in ${(durationMs / 1000).toFixed(1)}s. Scored ${itemsUpdated} companies (avg: ${avgQualityScore.toFixed(1)})`)

      return {
        success: true,
        output: {
          items_created: 0,
          items_updated: itemsUpdated,
          avg_quality_score: avgQualityScore,
          high_quality_count: qualityScores.filter(s => s >= 4.0).length
        },
        metrics: {
          durationMs,
          itemsProcessed,
          apiCalls: itemsProcessed,
          tokensUsed: 0,
          cost: 0
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`Execution failed: ${errorMessage}`, 'error')

      return {
        success: false,
        output: {},
        error: errorMessage,
        metrics: {
          durationMs: Date.now() - startTime,
          itemsProcessed,
          apiCalls: 0,
          tokensUsed: 0,
          cost: 0
        }
      }
    }
  }

  /**
   * Get stream items to score
   */
  private async getItemsToScore(streamId: string): Promise<any[]> {
    const supabase = await createClient()

    const { data: items, error } = await supabase
      .from('stream_items')
      .select('*')
      .eq('stream_id', streamId)
      .eq('item_type', 'company')
      .not('business_id', 'is', null) as { data: Row<'stream_items'>[] | null; error: unknown }

    if (error) {
      this.log(`Error fetching stream items: ${error.message}`, 'error')
      return []
    }

    return items || []
  }

  /**
   * Calculate quality score for a company
   */
  private async calculateQualityScore(
    company: Record<string, unknown>,
    criteria: Record<string, unknown>,
    targetMetrics: Record<string, unknown>,
    itemMetadata: Record<string, unknown>
  ): Promise<number> {
    let score = 0
    const weights = {
      criteriaMatch: 2.0,
      dataCompleteness: 1.0,
      enrichmentQuality: 1.0,
      buyingSignals: 1.0
    }

    // 1. Criteria Match Score (0-2 points)
    const criteriaScore = this.scoreCriteriaMatch(company, criteria)
    score += criteriaScore * weights.criteriaMatch

    // 2. Data Completeness Score (0-1 point)
    const completenessScore = this.scoreDataCompleteness(company)
    score += completenessScore * weights.dataCompleteness

    // 3. Enrichment Quality Score (0-1 point)
    const enrichmentScore = this.scoreEnrichmentQuality(itemMetadata)
    score += enrichmentScore * weights.enrichmentQuality

    // 4. Buying Signals Score (0-1 point)
    const signalsScore = await this.scoreBuyingSignals(company.id)
    score += signalsScore * weights.buyingSignals

    // Normalize to 0-5 scale
    const maxScore = Object.values(weights).reduce((a, b) => a + b, 0)
    const normalizedScore = (score / maxScore) * 5

    return Math.min(Math.max(normalizedScore, 0), 5)
  }

  /**
   * Score criteria match
   */
  private scoreCriteriaMatch(company: Record<string, unknown>, criteria: Record<string, unknown>): number {
    let score = 0.5 // Base score
    let matches = 0
    let total = 0

    // Industry match
    if (criteria.industry && Array.isArray(criteria.industry) && criteria.industry.length > 0) {
      total++
      if (criteria.industry.includes(company.industry)) {
        matches++
        score += 0.3
      }
    }

    // Location match
    if (criteria.location && Array.isArray(criteria.location) && criteria.location.length > 0) {
      total++
      if (criteria.location.includes(company.region)) {
        matches++
        score += 0.2
      }
    }

    // Employee count match
    if (criteria.employee_count) {
      total++
      const employeeCount = company.employee_count || 0
      const employeeRange = criteria.employee_count as { min?: number; max?: number }
      const min = employeeRange.min || 0
      const max = employeeRange.max || Number.MAX_SAFE_INTEGER

      if (employeeCount >= min && employeeCount <= max) {
        matches++
        score += 0.3
      }
    }

    // Revenue match
    if (criteria.revenue) {
      total++
      const revenue = company.revenue || 0
      const revenueRange = criteria.revenue as { min?: number; max?: number }
      const min = revenueRange.min || 0
      const max = revenueRange.max || Number.MAX_SAFE_INTEGER

      if (revenue >= min && revenue <= max) {
        matches++
        score += 0.4
      }
    }

    // Growth rate match
    if (criteria.growth_rate && company.growth_rate) {
      total++
      const growthRange = criteria.growth_rate as { min?: number }
      if (company.growth_rate >= (growthRange.min || 0)) {
        matches++
        score += 0.3
      }
    }

    return score
  }

  /**
   * Score data completeness
   */
  private scoreDataCompleteness(company: Record<string, unknown>): number {
    let score = 0
    const fields = [
      'name',
      'website',
      'description',
      'industry',
      'employee_count',
      'region',
      'linkedin_url',
      'phone',
      'email'
    ]

    const completedFields = fields.filter(field => company[field] && company[field].length > 0).length
    score = completedFields / fields.length

    return score
  }

  /**
   * Score enrichment quality
   */
  private scoreEnrichmentQuality(metadata: Record<string, unknown>): number {
    let score = 0

    if (metadata?.enriched_at) score += 0.2
    if (metadata?.tech_stack && Array.isArray(metadata.tech_stack) && metadata.tech_stack.length > 0) score += 0.2
    if (metadata?.companies_house_data) score += 0.2
    if (metadata?.social_media_score && typeof metadata.social_media_score === 'number' && metadata.social_media_score > 50) score += 0.2
    if (metadata?.employee_growth_rate && typeof metadata.employee_growth_rate === 'number' && metadata.employee_growth_rate > 10) score += 0.2

    return score
  }

  /**
   * Score buying signals
   */
  private async scoreBuyingSignals(companyId: string): Promise<number> {
    const supabase = await createClient()

    const { data: signals } = await supabase
      .from('buying_signals')
      .select('signal_strength, confidence_score')
      .eq('company_id', companyId)
      .eq('status', 'active') as { data: Row<'buying_signals'>[] | null; error: unknown }

    if (!signals || signals.length === 0) return 0

    // Weight signals by strength
    const strengthWeights = {
      very_strong: 1.0,
      strong: 0.75,
      moderate: 0.5,
      weak: 0.25
    }

    let totalScore = 0
    for (const signal of signals) {
      const weight = strengthWeights[signal.signal_strength as keyof typeof strengthWeights] || 0.5
      const confidence = signal.confidence_score / 100
      totalScore += weight * confidence
    }

    // Normalize to 0-1
    return Math.min(totalScore / signals.length, 1.0)
  }

  /**
   * Determine priority based on quality score
   */
  private determinePriority(qualityScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (qualityScore >= 4.5) return 'critical'
    if (qualityScore >= 4.0) return 'high'
    if (qualityScore >= 3.0) return 'medium'
    return 'low'
  }

  /**
   * Update item score and priority
   */
  private async updateItemScore(
    itemId: string,
    qualityScore: number,
    priority: string
  ): Promise<void> {
    const supabase = await createClient()

    // Fetch current metadata
    const { data: item } = await supabase
      .from('stream_items')
      .select('metadata')
      .eq('id', itemId)
      .single() as { data: Row<'stream_items'> | null; error: unknown }

    const metadata = item?.metadata || {}

    // Update item
    await supabase
      .from('stream_items')
      // @ts-expect-error - Supabase type inference issue
      .update({
        priority,
        metadata: {
          ...(metadata as Record<string, unknown>),
          quality_score: qualityScore,
          scored_at: new Date().toISOString()
        }
      })
      .eq('id', itemId)
  }

  /**
   * Reorder stream items by quality score
   */
  private async reorderStreamItems(streamId: string): Promise<void> {
    const supabase = await createClient()

    // Fetch all items ordered by quality score
    const { data: items } = await supabase
      .from('stream_items')
      .select('id, metadata')
      .eq('stream_id', streamId)
      .eq('item_type', 'company')
      .order('priority', { ascending: false }) as { data: Row<'stream_items'>[] | null; error: unknown }

    if (!items) return

    // Sort by quality score within same priority
    items.sort((a, b) => {
      const metadataA = a.metadata as Record<string, unknown> & { quality_score?: number } | null
      const metadataB = b.metadata as Record<string, unknown> & { quality_score?: number } | null
      const scoreA = metadataA?.quality_score || 0
      const scoreB = metadataB?.quality_score || 0
      return scoreB - scoreA
    })

    // Update positions
    for (let i = 0; i < items.length; i++) {
      await supabase
        .from('stream_items')
        // @ts-expect-error - Supabase type inference issue
        .update({ position: i })
        .eq('id', items[i].id)
    }

    this.log(`Reordered ${items.length} stream items by quality score`)
  }

  async validateConfig(): Promise<boolean> {
    // Scoring agent doesn't need special configuration
    return true
  }
}

/**
 * Create ScoringAgent instance
 */
export async function createScoringAgent(agentId: string): Promise<ScoringAgent> {
  const supabase = await createClient()

  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single() as { data: Row<'ai_agents'> | null; error: unknown }

  if (error || !agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  const config: AgentConfig = {
    id: agent.id ?? '',
    orgId: agent.org_id ?? '',
    name: agent.name,
    type: agent.agent_type,
    configuration: (agent.configuration as Record<string, unknown>) || {},
    isActive: agent.is_active,
    scheduleCron: agent.schedule_cron ?? undefined
  }

  return new ScoringAgent(config)
}
