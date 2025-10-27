/**
 * Opportunity Bot Agent
 * Discovers new business opportunities based on goal criteria
 *
 * Responsibilities:
 * - Search for companies matching ICP criteria
 * - Qualify leads based on goal requirements
 * - Add qualified companies to stream
 * - Detect buying signals
 */

import { BaseAgent, AgentConfig, AgentExecutionContext, AgentExecutionResult } from '@/lib/ai/agents/base-agent'
import { createClient } from '@/lib/supabase/server'
import { createProgressBroadcaster } from './progress-broadcaster'
import type { Database, Json } from '@/types/database'

// Type aliases for database tables
type StreamRow = Database['public']['Tables']['streams']['Row']
type StreamItemInsert = Database['public']['Tables']['stream_items']['Insert']
type BusinessRow = Database['public']['Tables']['businesses']['Row']
type AIAgentRow = Database['public']['Tables']['ai_agents']['Row']

// Helper types for criteria and metrics
interface GoalCriteria {
  industry?: string[]
  location?: string[]
  employee_count?: {
    min?: number
    max?: number
  }
  [key: string]: unknown
}

interface TargetMetrics {
  companies_to_find?: number
  min_quality_score?: number
  [key: string]: unknown
}

// Extended business type with quality score
interface ScoredBusiness extends BusinessRow {
  quality_score: number
}

export class OpportunityBot extends BaseAgent {
  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now()
    let itemsProcessed = 0
    let itemsCreated = 0
    const qualityScores: number[] = []

    try {
      this.log('Starting opportunity discovery...')

      const { stream_id, goal_context } = context.input

      if (!stream_id) {
        throw new Error('stream_id is required')
      }

      // Create progress broadcaster
      const broadcaster = createProgressBroadcaster(stream_id as string)

      // Broadcast agent started
      await broadcaster.broadcastAgentStarted(
        this.config.id,
        this.config.name,
        this.config.type
      )

      // Fetch stream details
      const supabase = await createClient()
      const { data: stream, error: streamError } = await supabase
        .from('streams')
        .select('*')
        .eq('id', stream_id)
        .single<StreamRow>()

      if (streamError || !stream) {
        throw new Error(`Stream not found: ${stream_id}`)
      }

      // Extract goal criteria
      const goalContext = (goal_context || {}) as { goal_criteria?: GoalCriteria; target_metrics?: TargetMetrics }
      const streamMetadata = (stream.metadata || {}) as { goal_criteria?: GoalCriteria; target_metrics?: TargetMetrics }
      const criteria: GoalCriteria = goalContext.goal_criteria || streamMetadata.goal_criteria || {}
      const targetMetrics: TargetMetrics = goalContext.target_metrics || streamMetadata.target_metrics || {}

      const targetCount = targetMetrics.companies_to_find || 50
      const minQualityScore = targetMetrics.min_quality_score || 3.0

      this.log(`Searching for ${targetCount} companies with quality score >= ${minQualityScore}`)

      // Search for companies matching criteria
      const companies = await this.searchCompanies(criteria, targetCount * 2) // Get 2x to filter
      itemsProcessed = companies.length

      this.log(`Found ${companies.length} candidate companies`)

      // Broadcast progress
      await broadcaster.broadcastAgentProgress(
        this.config.id,
        this.config.name,
        this.config.type,
        `Found ${companies.length} candidate companies, now qualifying...`,
        { candidates_found: companies.length }
      )

      // Qualify and score each company
      const qualifiedCompanies: ScoredBusiness[] = []
      for (const company of companies) {
        const qualityScore = await this.scoreCompany(company, criteria, targetMetrics)

        if (qualityScore >= minQualityScore) {
          qualifiedCompanies.push({
            ...company,
            quality_score: qualityScore
          })
          qualityScores.push(qualityScore)
        }

        // Stop if we've reached target
        if (qualifiedCompanies.length >= targetCount) {
          break
        }
      }

      this.log(`Qualified ${qualifiedCompanies.length}/${companies.length} companies`)

      // Add qualified companies to stream with progress updates
      for (let i = 0; i < qualifiedCompanies.length; i++) {
        const company = qualifiedCompanies[i]
        await this.addCompanyToStream(stream_id as string, company, context.executionId)
        itemsCreated++

        // Broadcast progress every 5 companies
        if ((i + 1) % 5 === 0 || i === qualifiedCompanies.length - 1) {
          const currentAvgScore = qualityScores.length > 0
            ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
            : 0

          await broadcaster.broadcastProgress({
            completed: itemsCreated,
            total: targetCount,
            percentage: Math.round((itemsCreated / targetCount) * 100),
            quality_score: currentAvgScore
          })

          await broadcaster.broadcastAgentProgress(
            this.config.id,
            this.config.name,
            this.config.type,
            `Added ${itemsCreated} companies to stream`,
            {
              items_created: itemsCreated,
              avg_score: currentAvgScore
            }
          )
        }
      }

      // Detect buying signals for high-quality companies
      const highQualityCompanies = qualifiedCompanies.filter(c => c.quality_score >= 4.0)
      for (const company of highQualityCompanies) {
        await this.detectBuyingSignals(company)
      }

      const avgQualityScore = qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0

      const durationMs = Date.now() - startTime

      this.log(`Completed in ${(durationMs / 1000).toFixed(1)}s. Added ${itemsCreated} companies (avg score: ${avgQualityScore.toFixed(1)})`)

      // Broadcast completion
      await broadcaster.broadcastAgentCompleted(
        this.config.id,
        this.config.name,
        this.config.type,
        `Completed! Added ${itemsCreated} high-quality companies with avg score ${avgQualityScore.toFixed(1)}/5`,
        {
          items_created: itemsCreated,
          avg_score: avgQualityScore,
          high_quality_count: highQualityCompanies.length
        }
      )

      // Broadcast final progress
      await broadcaster.broadcastProgress({
        completed: itemsCreated,
        total: targetCount,
        percentage: Math.round((itemsCreated / targetCount) * 100),
        quality_score: avgQualityScore
      })

      // Broadcast milestone if target reached
      if (itemsCreated >= targetCount) {
        await broadcaster.broadcastMilestone({
          type: 'target_reached',
          title: 'Target Reached!',
          description: `Successfully found ${itemsCreated} companies matching your criteria`,
          data: {
            items_created: itemsCreated,
            avg_score: avgQualityScore
          }
        })
      }

      // Generate AI insights after execution
      try {
        const { InsightGenerator } = await import('./insight-generator')
        await InsightGenerator.generateInsights(stream_id as string, context.executionId)
        this.log('Generated insights for stream')
      } catch (error) {
        this.log(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn')
      }

      return {
        success: true,
        output: {
          companies_found: companies.length,
          items_created: itemsCreated,
          qualified_count: qualifiedCompanies.length,
          avg_quality_score: avgQualityScore,
          high_quality_count: highQualityCompanies.length
        },
        metrics: {
          durationMs,
          itemsProcessed,
          apiCalls: companies.length + itemsCreated,
          tokensUsed: 0, // Not using AI for scoring in this version
          cost: 0
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`Execution failed: ${errorMessage}`, 'error')

      // Broadcast failure
      const { stream_id } = context.input
      if (stream_id) {
        const broadcaster = createProgressBroadcaster(stream_id as string)
        await broadcaster.broadcastAgentFailed(
          this.config.id,
          this.config.name,
          this.config.type,
          errorMessage
        )
      }

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
   * Search for companies matching criteria
   */
  private async searchCompanies(
    criteria: GoalCriteria,
    limit: number
  ): Promise<BusinessRow[]> {
    const supabase = await createClient()

    // Build query based on criteria
    let query = supabase
      .from('businesses')
      .select('*')
      .limit(limit)

    // Apply filters based on criteria
    if (criteria.industry && Array.isArray(criteria.industry) && criteria.industry.length > 0) {
      query = query.in('categories', criteria.industry)
    }

    if (criteria.location && Array.isArray(criteria.location) && criteria.location.length > 0) {
      // Note: businesses table doesn't have region, would need to filter by address or other location field
      // This is a placeholder - adjust based on actual schema
    }

    if (criteria.employee_count) {
      if (criteria.employee_count.min) {
        query = query.gte('employee_count', criteria.employee_count.min)
      }
      if (criteria.employee_count.max) {
        query = query.lte('employee_count', criteria.employee_count.max)
      }
    }

    // Execute query
    const { data: companies, error } = await query.returns<BusinessRow[]>()

    if (error) {
      this.log(`Error searching companies: ${error.message}`, 'error')
      return []
    }

    return companies || []
  }

  /**
   * Score a company based on criteria and metrics
   */
  private async scoreCompany(
    company: BusinessRow,
    criteria: GoalCriteria,
    targetMetrics: TargetMetrics
  ): Promise<number> {
    let score = 3.0 // Base score

    // Get metadata fields
    const metadata = (company.metadata || {}) as Record<string, unknown>
    const aiInsights = (company.ai_insights || {}) as Record<string, unknown>
    const socialLinks = (company.social_links || {}) as Record<string, unknown>

    // Industry match (using categories)
    if (criteria.industry && Array.isArray(criteria.industry)) {
      const hasMatch = company.categories.some(cat => criteria.industry?.includes(cat))
      if (hasMatch) {
        score += 0.5
      }
    }

    // Location match (from metadata if available)
    if (criteria.location && Array.isArray(criteria.location)) {
      const region = metadata.region as string | undefined
      if (region && criteria.location.includes(region)) {
        score += 0.3
      }
    }

    // Employee count match (from metadata if available)
    if (criteria.employee_count) {
      const employeeCount = (metadata.employee_count as number) || 0
      const min = criteria.employee_count.min || 0
      const max = criteria.employee_count.max || Number.MAX_SAFE_INTEGER

      if (employeeCount >= min && employeeCount <= max) {
        score += 0.4
      }
    }

    // Has website
    if (company.website) {
      score += 0.2
    }

    // Has description
    if (company.description) {
      score += 0.1
    }

    // Has social media
    if (socialLinks.linkedin_url || socialLinks.twitter_url) {
      score += 0.2
    }

    // Revenue signals (from metadata if available)
    if (metadata.revenue_range) {
      score += 0.3
    }

    // Cap at 5.0
    return Math.min(score, 5.0)
  }

  /**
   * Add company to stream as item
   */
  private async addCompanyToStream(
    streamId: string,
    company: ScoredBusiness,
    executionId: string
  ): Promise<void> {
    const supabase = await createClient()

    // Check if company already exists in stream
    const { data: existing } = await supabase
      .from('stream_items')
      .select('id')
      .eq('stream_id', streamId)
      .eq('item_id', company.id)
      .maybeSingle()

    if (existing) {
      this.log(`Company ${company.name} already in stream, skipping`)
      return
    }

    // Get first stage of stream
    const { data: stream } = await supabase
      .from('streams')
      .select('stages')
      .eq('id', streamId)
      .single<Pick<StreamRow, 'stages'>>()

    const stages = Array.isArray(stream?.stages) ? stream.stages as Array<{ id: string }> : []
    const firstStage = stages.length > 0 ? stages[0] : null

    // Get company metadata
    const metadata = (company.metadata || {}) as Record<string, unknown>

    // Add to stream
    const itemData: StreamItemInsert = {
      stream_id: streamId,
      item_type: 'company',
      item_id: company.id,
      position: 0,
      stage_id: firstStage?.id || null,
      metadata: {
        quality_score: company.quality_score,
        discovered_by_execution: executionId,
        categories: company.categories,
        employee_count: (metadata.employee_count as number) ?? null,
        region: (metadata.region as string) ?? null,
        website: company.website ?? null
      } satisfies Record<string, Json>,
      created_by: this.config.id
    }

    const { error: insertError } = await supabase
      .from('stream_items')
      .insert(itemData as never)

    if (insertError) {
      this.log(`Error adding company to stream: ${insertError.message}`, 'error')
      throw insertError
    }

    this.log(`Added ${company.name} to stream (score: ${company.quality_score.toFixed(1)})`)
  }

  /**
   * Detect buying signals for a company
   */
  private async detectBuyingSignals(company: ScoredBusiness): Promise<void> {
    // Detect signals based on available data
    const signals: Array<{
      type: string
      strength: 'very_strong' | 'strong' | 'moderate' | 'weak'
      confidence: number
      data: Record<string, unknown>
    }> = []

    // Get metadata
    const metadata = (company.metadata || {}) as Record<string, unknown>
    const aiInsights = (company.ai_insights || {}) as Record<string, unknown>

    // Job posting signal
    const jobsCount = metadata.jobs_count as number | undefined
    if (jobsCount && jobsCount > 5) {
      signals.push({
        type: 'job_posting',
        strength: jobsCount > 20 ? 'strong' : 'moderate',
        confidence: 75,
        data: {
          jobs_count: jobsCount,
          detected_at: new Date().toISOString()
        }
      })
    }

    // Website activity (if tracked)
    const websiteUpdatedRecently = metadata.website_updated_recently as boolean | undefined
    const websiteLastUpdated = metadata.website_last_updated as string | undefined
    if (websiteUpdatedRecently) {
      signals.push({
        type: 'website_activity',
        strength: 'moderate',
        confidence: 60,
        data: {
          last_updated: websiteLastUpdated,
          detected_at: new Date().toISOString()
        }
      })
    }

    // Create buying signals
    for (const signal of signals) {
      await this.createBuyingSignal(
        company.id,
        signal.type,
        signal.strength,
        signal.confidence,
        signal.data
      )
    }

    if (signals.length > 0) {
      this.log(`Detected ${signals.length} buying signals for ${company.name}`)
    }
  }

  async validateConfig(): Promise<boolean> {
    // Opportunity bot doesn't need special configuration
    return true
  }
}

/**
 * Create OpportunityBot instance
 */
export async function createOpportunityBot(agentId: string): Promise<OpportunityBot> {
  const supabase = await createClient()

  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single<AIAgentRow>()

  if (error || !agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  const config: AgentConfig = {
    id: agent.id,
    orgId: agent.org_id || '',
    name: agent.name,
    type: agent.agent_type,
    configuration: (agent.configuration as Record<string, unknown>) || {},
    isActive: agent.is_active,
    scheduleCron: agent.schedule_cron || undefined
  }

  return new OpportunityBot(config)
}
