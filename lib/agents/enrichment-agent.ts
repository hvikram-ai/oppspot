/**
 * Enrichment Agent
 * Enriches companies with additional data
 *
 * Responsibilities:
 * - Fetch additional company data from external sources
 * - Update company profiles with enriched data
 * - Add social media links, tech stack, funding info
 */

import { BaseAgent, AgentConfig, AgentExecutionContext, AgentExecutionResult } from '@/lib/ai/agents/base-agent'
import { createClient } from '@/lib/supabase/server'

export class EnrichmentAgent extends BaseAgent {
  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now()
    let itemsProcessed = 0
    let itemsUpdated = 0

    try {
      this.log('Starting company enrichment...')

      const { stream_id } = context.input

      if (!stream_id) {
        throw new Error('stream_id is required')
      }

      // Fetch stream items that need enrichment
      const companies = await this.getCompaniesToEnrich(stream_id)
      itemsProcessed = companies.length

      this.log(`Found ${companies.length} companies to enrich`)

      // Enrich each company
      for (const item of companies) {
        if (!item.business_id) continue

        const enriched = await this.enrichCompany(item.business_id)

        if (enriched) {
          // Update stream item metadata
          await this.updateStreamItemMetadata(item.id, enriched)
          itemsUpdated++
        }
      }

      const durationMs = Date.now() - startTime

      this.log(`Completed in ${(durationMs / 1000).toFixed(1)}s. Enriched ${itemsUpdated}/${itemsProcessed} companies`)

      return {
        success: true,
        output: {
          items_created: 0,
          items_updated: itemsUpdated,
          enriched_count: itemsUpdated
        },
        metrics: {
          durationMs,
          itemsProcessed,
          apiCalls: itemsProcessed,
          tokensUsed: 0,
          cost: 0
        }
      }

    } catch (error: any) {
      this.log(`Execution failed: ${error.message}`, 'error')

      return {
        success: false,
        output: {},
        error: error.message,
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
   * Get companies from stream that need enrichment
   */
  private async getCompaniesToEnrich(streamId: string): Promise<any[]> {
    const supabase = await createClient()

    const { data: items, error } = await supabase
      .from('stream_items')
      .select('id, business_id, metadata')
      .eq('stream_id', streamId)
      .eq('item_type', 'company')
      .not('business_id', 'is', null)
      .limit(50)

    if (error) {
      this.log(`Error fetching stream items: ${error.message}`, 'error')
      return []
    }

    // Filter items that haven't been enriched yet
    return (items || []).filter(item =>
      !item.metadata?.enriched_at ||
      new Date(item.metadata.enriched_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
    )
  }

  /**
   * Enrich company with additional data
   */
  private async enrichCompany(businessId: string): Promise<Record<string, any> | null> {
    const supabase = await createClient()

    // Fetch company
    const { data: company, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (error || !company) {
      return null
    }

    const enrichedData: Record<string, any> = {
      enriched_at: new Date().toISOString()
    }

    // Enrich with Companies House data if available
    if (company.companies_house_number) {
      const chData = await this.fetchCompaniesHouseData(company.companies_house_number)
      if (chData) {
        enrichedData.companies_house_data = chData
        enrichedData.filing_history_count = chData.accounts?.overdue ? 0 : 1
      }
    }

    // Estimate tech stack based on website
    if (company.website) {
      enrichedData.tech_stack = await this.detectTechStack(company.website)
    }

    // Estimate employee growth
    if (company.employee_count) {
      enrichedData.employee_growth_rate = this.estimateEmployeeGrowth(company)
    }

    // Social media presence score
    enrichedData.social_media_score = this.calculateSocialMediaScore(company)

    return enrichedData
  }

  /**
   * Fetch Companies House data
   */
  private async fetchCompaniesHouseData(companyNumber: string): Promise<any> {
    // Mock implementation - replace with actual API call
    this.log(`Fetching Companies House data for ${companyNumber}`)

    return {
      company_number: companyNumber,
      company_status: 'active',
      accounts: {
        overdue: false,
        next_due: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
      },
      confirmation_statement: {
        overdue: false
      }
    }
  }

  /**
   * Detect tech stack from website
   */
  private async detectTechStack(website: string): Promise<string[]> {
    // Mock implementation - could integrate with BuiltWith, Wappalyzer, etc.
    this.log(`Detecting tech stack for ${website}`)

    // Return mock data
    const techStacks = [
      ['React', 'Next.js', 'Vercel'],
      ['WordPress', 'PHP', 'MySQL'],
      ['Shopify', 'Liquid'],
      ['Vue.js', 'Nuxt'],
      ['Angular', 'TypeScript']
    ]

    return techStacks[Math.floor(Math.random() * techStacks.length)]
  }

  /**
   * Estimate employee growth rate
   */
  private estimateEmployeeGrowth(company: any): number {
    // Mock implementation - could integrate with LinkedIn, Crunchbase, etc.
    const employeeCount = company.employee_count || 0

    // Simulate growth rate based on company size
    if (employeeCount < 10) return 50 // 50% growth for small companies
    if (employeeCount < 50) return 30
    if (employeeCount < 200) return 20
    return 10
  }

  /**
   * Calculate social media presence score
   */
  private calculateSocialMediaScore(company: any): number {
    let score = 0

    if (company.linkedin_url) score += 30
    if (company.twitter_url) score += 20
    if (company.facebook_url) score += 15
    if (company.instagram_url) score += 15
    if (company.youtube_url) score += 10
    if (company.github_url) score += 10

    return score
  }

  /**
   * Update stream item metadata with enriched data
   */
  private async updateStreamItemMetadata(
    itemId: string,
    enrichedData: Record<string, any>
  ): Promise<void> {
    const supabase = await createClient()

    // Fetch current metadata
    const { data: item } = await supabase
      .from('stream_items')
      .select('metadata')
      .eq('id', itemId)
      .single()

    const currentMetadata = item?.metadata || {}

    // Merge enriched data
    const updatedMetadata = {
      ...currentMetadata,
      ...enrichedData
    }

    // Update item
    await supabase
      .from('stream_items')
      .update({
        metadata: updatedMetadata
      })
      .eq('id', itemId)

    this.log(`Updated stream item ${itemId} with enriched data`)
  }

  async validateConfig(): Promise<boolean> {
    // Enrichment agent doesn't need special configuration
    return true
  }
}

/**
 * Create EnrichmentAgent instance
 */
export async function createEnrichmentAgent(agentId: string): Promise<EnrichmentAgent> {
  const supabase = await createClient()

  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  const config: AgentConfig = {
    id: agent.id,
    orgId: agent.org_id,
    name: agent.name,
    type: agent.agent_type,
    configuration: agent.configuration || {},
    isActive: agent.is_active,
    scheduleCron: agent.schedule_cron
  }

  return new EnrichmentAgent(config)
}
