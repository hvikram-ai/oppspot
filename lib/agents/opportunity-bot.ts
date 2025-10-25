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
import type { Row } from '@/lib/supabase/helpers'

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
      const { data: stream } = await supabase
        .from('streams')
        .select('*')
        .eq('id', stream_id)
        .single() as { data: Row<'streams'> | null; error: any }

      if (!stream) {
        throw new Error(`Stream not found: ${stream_id}`)
      }

      // Extract goal criteria
      const streamData = stream as any;
      const goalContext = (goal_context || {}) as any;
      const criteria = goalContext.goal_criteria || streamData.goal_criteria || {}
      const targetMetrics = goalContext.target_metrics || streamData.target_metrics || {}

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
      const qualifiedCompanies = []
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
    criteria: Record<string, unknown>,
    limit: number
  ): Promise<any[]> {
    const supabase = await createClient()

    // Build query based on criteria
    let query = supabase
      .from('businesses')
      .select('*')
      .limit(limit)

    // Apply filters based on criteria
    if (criteria.industry && Array.isArray(criteria.industry) && criteria.industry.length > 0) {
      query = query.in('industry', criteria.industry)
    }

    if (criteria.location && Array.isArray(criteria.location) && criteria.location.length > 0) {
      query = query.in('region', criteria.location)
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
    const { data: companies, error } = await query

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
    company: any,
    criteria: Record<string, unknown>,
    targetMetrics: Record<string, unknown>
  ): Promise<number> {
    let score = 3.0 // Base score

    // Industry match
    if (criteria.industry && Array.isArray(criteria.industry)) {
      if (criteria.industry.includes(company.industry)) {
        score += 0.5
      }
    }

    // Location match
    if (criteria.location && Array.isArray(criteria.location)) {
      if (criteria.location.includes(company.region)) {
        score += 0.3
      }
    }

    // Employee count match
    if (criteria.employee_count) {
      const employeeCount = company.employee_count || 0
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
    if (company.linkedin_url || company.twitter_url) {
      score += 0.2
    }

    // Revenue signals (if available)
    if (company.revenue_range) {
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
    company: any,
    executionId: string
  ): Promise<void> {
    const supabase = await createClient()

    // Check if company already exists in stream
    const { data: existing } = await supabase
      .from('stream_items')
      .select('id')
      .eq('stream_id', streamId)
      .eq('business_id', company.id)
      .single() as { data: Row<'stream_items'> | null; error: any }

    if (existing) {
      this.log(`Company ${company.name} already in stream, skipping`)
      return
    }

    // Get first stage of stream
    const { data: stream } = await supabase
      .from('streams')
      .select('stages')
      .eq('id', streamId)
      .single() as { data: Row<'streams'> | null; error: any }

    const streamData = stream as any;
    const stages = Array.isArray(streamData?.stages) ? streamData.stages : [];
    const firstStage = stages.length > 0 ? stages[0] : null;

    // Add to stream
    await supabase
      .from('stream_items')
      .insert({
        stream_id: streamId,
        item_type: 'company',
        business_id: company.id,
        title: company.name,
        description: company.description || '',
        stage_id: firstStage?.id || null,
        priority: company.quality_score >= 4.5 ? 'high' : company.quality_score >= 4.0 ? 'medium' : 'low',
        status: 'open',
        position: 0,
        metadata: {
          quality_score: company.quality_score,
          discovered_by_execution: executionId,
          industry: company.industry,
          employee_count: company.employee_count,
          region: company.region
        },
        added_by: this.config.id // Agent ID as added_by
      } as any)

    this.log(`Added ${company.name} to stream (score: ${company.quality_score.toFixed(1)})`)
  }

  /**
   * Detect buying signals for a company
   */
  private async detectBuyingSignals(company: any): Promise<void> {
    // Detect signals based on available data
    const signals: Array<{
      type: string
      strength: string
      confidence: number
      data: any
    }> = []

    // Job posting signal
    if (company.jobs_count && company.jobs_count > 5) {
      signals.push({
        type: 'job_posting',
        strength: company.jobs_count > 20 ? 'strong' : 'moderate',
        confidence: 75,
        data: {
          jobs_count: company.jobs_count,
          detected_at: new Date().toISOString()
        }
      })
    }

    // Website activity (if tracked)
    if (company.website_updated_recently) {
      signals.push({
        type: 'website_activity',
        strength: 'moderate',
        confidence: 60,
        data: {
          last_updated: company.website_last_updated,
          detected_at: new Date().toISOString()
        }
      })
    }

    // Create buying signals
    for (const signal of signals) {
      await this.createBuyingSignal(
        company.id,
        signal.type,
        signal.strength as any,
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
    .single() as { data: Row<'ai_agents'> | null; error: any }

  if (error || !agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  const config: AgentConfig = {
    id: agent.id,
    orgId: agent.org_id || '',
    name: agent.name || 'OpportunityBot',
    type: agent.agent_type as any,
    configuration: (agent.configuration as any) || {},
    isActive: agent.is_active,
    scheduleCron: agent.schedule_cron || undefined
  }

  return new OpportunityBot(config)
}
