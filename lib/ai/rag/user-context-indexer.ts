/**
 * User Context Indexer
 * Extracts user-specific data and indexes it to pgvector (Supabase) for RAG
 *
 * Data sources:
 * 1. Saved companies (highest signal)
 * 2. Won/lost deals (learning patterns)
 * 3. Active ICP profile
 * 4. Research reports
 * 5. Business followers
 * 6. Search patterns (future)
 */

import { createClient } from '@/lib/supabase/server'
import { getPgVectorClient as getPineconeClient, type PineconeVector, type PineconeMetadata } from './pgvector-client'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import type { Row } from '@/lib/supabase/helpers'

export interface IndexingResult {
  success: boolean
  userId: string
  itemsIndexed: {
    saved_companies: number
    won_deals: number
    lost_deals: number
    icp_profiles: number
    research_reports: number
    business_followers: number
    total: number
  }
  errors: string[]
  duration_ms: number
}

export interface IndexingOptions {
  includeTypes?: Array<'saved_companies' | 'deals' | 'icp' | 'research' | 'followers'>
  forceRefresh?: boolean // Re-index even if already indexed
  batchSize?: number
}

export class UserContextIndexer {
  private pinecone = getPineconeClient()

  /**
   * Index all user context
   */
  async indexUserContext(
    userId: string,
    options: IndexingOptions = {}
  ): Promise<IndexingResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const counts = {
      saved_companies: 0,
      won_deals: 0,
      lost_deals: 0,
      icp_profiles: 0,
      research_reports: 0,
      business_followers: 0,
      total: 0
    }

    console.log(`[Context Indexer] Starting indexing for user ${userId}`)

    const includeTypes = options.includeTypes || ['saved_companies', 'deals', 'icp', 'research', 'followers']

    try {
      // Index saved companies
      if (includeTypes.includes('saved_companies')) {
        const count = await this.indexSavedCompanies(userId)
        counts.saved_companies = count
        counts.total += count
      }

      // Index deals
      if (includeTypes.includes('deals')) {
        const { won, lost } = await this.indexDeals(userId)
        counts.won_deals = won
        counts.lost_deals = lost
        counts.total += won + lost
      }

      // Index ICP profile
      if (includeTypes.includes('icp')) {
        const count = await this.indexICPProfile(userId)
        counts.icp_profiles = count
        counts.total += count
      }

      // Index research reports
      if (includeTypes.includes('research')) {
        const count = await this.indexResearchReports(userId)
        counts.research_reports = count
        counts.total += count
      }

      // Index business followers
      if (includeTypes.includes('followers')) {
        const count = await this.indexBusinessFollowers(userId)
        counts.business_followers = count
        counts.total += count
      }

      const duration = Date.now() - startTime
      console.log(`[Context Indexer] Completed for user ${userId}: ${counts.total} items in ${duration}ms`)

      return {
        success: true,
        userId,
        itemsIndexed: counts,
        errors,
        duration_ms: duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[Context Indexer] Error for user ${userId}:`, error)

      return {
        success: false,
        userId,
        itemsIndexed: counts,
        errors: [errorMessage],
        duration_ms: duration
      }
    }
  }

  /**
   * Index saved companies with user notes
   */
  private async indexSavedCompanies(userId: string): Promise<number> {
    const supabase = await createClient()

    // Fetch saved companies with business details
    const { data, error } = await supabase
      .from('saved_businesses')
      .select(`
        id,
        business_id,
        notes,
        created_at,
        businesses!inner(
          id,
          name,
          description,
          industry,
          categories,
          website
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100) // Only index recent 100 saves

    if (error || !data || data.length === 0) {
      console.log(`[Context Indexer] No saved companies for user ${userId}`)
      return 0
    }

    console.log(`[Context Indexer] Found ${data.length} saved companies`)

    const vectors: PineconeVector[] = []

    for (const saved of data) {
      try {
        const business = (saved as { businesses: Row<'businesses'> }).businesses

        // Build text for embedding
        const text = this.buildSavedCompanyText(business, saved.notes)

        // Generate embedding
        const { embedding } = await embeddingService.generateCompanyEmbedding({
          name: business.name,
          description: business.description,
          industry: business.industry,
          categories: business.categories,
          website: business.website
        })

        // Create metadata
        const metadata: PineconeMetadata = {
          type: 'saved_company',
          user_id: userId,
          created_at: saved.created_at,
          company_id: business.id,
          company_name: business.name,
          user_notes: saved.notes || undefined,
          tags: business.categories || undefined,
          saved_date: saved.created_at,
          industry: business.industry || undefined
        }

        vectors.push({
          id: `saved_${saved.id}`,
          values: embedding,
          metadata
        })
      } catch (error) {
        console.error(`[Context Indexer] Error indexing saved company ${saved.id}:`, error)
      }
    }

    if (vectors.length > 0) {
      await this.pinecone.upsert(userId, vectors)
    }

    return vectors.length
  }

  /**
   * Index won and lost deals
   */
  private async indexDeals(userId: string): Promise<{ won: number; lost: number }> {
    const supabase = await createClient()

    // Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single() as { data: { org_id: string } | null }

    if (!profile?.org_id) {
      return { won: 0, lost: 0 }
    }

    // Fetch deal outcomes
    const { data, error } = await supabase
      .from('deal_outcomes')
      .select('*')
      .eq('org_id', profile.org_id)
      .in('outcome', ['won', 'lost'])
      .order('outcome_date', { ascending: false })
      .limit(50) // Last 50 deals

    if (error || !data || data.length === 0) {
      return { won: 0, lost: 0 }
    }

    console.log(`[Context Indexer] Found ${data.length} deals`)

    const vectors: PineconeVector[] = []
    let wonCount = 0
    let lostCount = 0

    for (const deal of data) {
      try {
        const snapshot = deal.company_snapshot as Record<string, unknown>

        // Build text for embedding
        const text = this.buildDealText(deal as { deal_name: string; outcome: string; outcome_reason?: string }, snapshot)

        // Generate embedding
        const { embedding } = await embeddingService.generateCompanyEmbedding({
          name: deal.deal_name,
          description: `${deal.outcome} deal: ${deal.outcome_reason || 'No reason provided'}`
        })

        // Create metadata
        const metadata: PineconeMetadata = {
          type: deal.outcome === 'won' ? 'won_deal' : 'lost_deal',
          user_id: userId,
          org_id: profile.org_id,
          created_at: deal.outcome_date || deal.created_at,
          deal_id: deal.id,
          deal_value: deal.deal_value,
          outcome: deal.outcome,
          outcome_reason: deal.outcome_reason || undefined,
          industry: snapshot.industry as string | undefined,
          employee_count: snapshot.employee_count as number | undefined,
          revenue: snapshot.revenue as number | undefined
        }

        vectors.push({
          id: `deal_${deal.id}`,
          values: embedding,
          metadata
        })

        if (deal.outcome === 'won') wonCount++
        else lostCount++
      } catch (error) {
        console.error(`[Context Indexer] Error indexing deal ${deal.id}:`, error)
      }
    }

    if (vectors.length > 0) {
      await this.pinecone.upsert(userId, vectors)
    }

    return { won: wonCount, lost: lostCount }
  }

  /**
   * Index active ICP profile
   */
  private async indexICPProfile(userId: string): Promise<number> {
    const supabase = await createClient()

    // Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single() as { data: { org_id: string } | null }

    if (!profile?.org_id) {
      return 0
    }

    // Fetch active ICP
    const { data, error } = await supabase
      .from('icp_profiles')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return 0
    }

    console.log(`[Context Indexer] Found active ICP profile`)

    // Build text from ICP criteria
    const text = this.buildICPText(data as { name: string; description: string; criteria: Record<string, unknown>; metrics: Record<string, unknown> })

    // Generate embedding
    const { embedding } = await embeddingService.generateCompanyEmbedding({
      name: data.name,
      description: text
    })

    // Create metadata
    const metadata: PineconeMetadata = {
      type: 'icp',
      user_id: userId,
      org_id: profile.org_id,
      created_at: data.last_trained_at || data.created_at,
      icp_version: data.version,
      win_rate: (data.metrics as { win_rate: number }).win_rate,
      confidence_score: Object.values(data.confidence_scores as Record<string, number>).reduce((a, b) => a + b, 0) / Object.keys(data.confidence_scores as Record<string, number>).length,
      avg_deal_size: (data.metrics as { avg_deal_size: number }).avg_deal_size
    }

    await this.pinecone.upsert(userId, [{
      id: `icp_${data.id}`,
      values: embedding,
      metadata
    }])

    return 1
  }

  /**
   * Index research reports
   */
  private async indexResearchReports(userId: string): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('research_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('generated_at', { ascending: false })
      .limit(20) // Last 20 reports

    if (error || !data || data.length === 0) {
      return 0
    }

    console.log(`[Context Indexer] Found ${data.length} research reports`)

    const vectors: PineconeVector[] = []

    for (const report of data) {
      try {
        const text = this.buildResearchText(report as { company_name: string; executive_summary?: string; key_findings?: string[] })

        const { embedding } = await embeddingService.generateCompanyEmbedding({
          name: report.company_name,
          description: text
        })

        const metadata: PineconeMetadata = {
          type: 'research',
          user_id: userId,
          created_at: report.generated_at || report.created_at,
          report_id: report.id,
          company_name: report.company_name,
          research_date: report.generated_at,
          signals: report.signals_detected as string[] | undefined,
          key_findings: report.key_findings ? (report.key_findings as string[]).slice(0, 3).join('; ') : undefined
        }

        vectors.push({
          id: `research_${report.id}`,
          values: embedding,
          metadata
        })
      } catch (error) {
        console.error(`[Context Indexer] Error indexing research ${report.id}:`, error)
      }
    }

    if (vectors.length > 0) {
      await this.pinecone.upsert(userId, vectors)
    }

    return vectors.length
  }

  /**
   * Index business followers (companies user is tracking)
   */
  private async indexBusinessFollowers(userId: string): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_followers')
      .select(`
        id,
        business_id,
        created_at,
        businesses!inner(
          id,
          name,
          description,
          industry
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !data || data.length === 0) {
      return 0
    }

    console.log(`[Context Indexer] Found ${data.length} followed companies`)

    const vectors: PineconeVector[] = []

    for (const follower of data) {
      try {
        const business = (follower as { businesses: Row<'businesses'> }).businesses

        const { embedding } = await embeddingService.generateCompanyEmbedding({
          name: business.name,
          description: business.description,
          industry: business.industry
        })

        const metadata: PineconeMetadata = {
          type: 'follower',
          user_id: userId,
          created_at: follower.created_at,
          company_id: business.id,
          company_name: business.name,
          industry: business.industry || undefined
        }

        vectors.push({
          id: `follower_${follower.id}`,
          values: embedding,
          metadata
        })
      } catch (error) {
        console.error(`[Context Indexer] Error indexing follower ${follower.id}:`, error)
      }
    }

    if (vectors.length > 0) {
      await this.pinecone.upsert(userId, vectors)
    }

    return vectors.length
  }

  // Helper methods to build text representations

  private buildSavedCompanyText(business: Row<'businesses'>, notes: string | null): string {
    const parts: string[] = []
    parts.push(`Saved company: ${business.name}`)
    if (business.description) parts.push(business.description)
    if (business.industry) parts.push(`Industry: ${business.industry}`)
    if (notes) parts.push(`User notes: ${notes}`)
    return parts.join(' | ')
  }

  private buildDealText(deal: { deal_name: string; outcome: string; outcome_reason?: string }, snapshot: Record<string, unknown>): string {
    const parts: string[] = []
    parts.push(`${deal.outcome} deal: ${deal.deal_name}`)
    if (deal.outcome_reason) parts.push(`Reason: ${deal.outcome_reason}`)
    if (snapshot.industry) parts.push(`Industry: ${snapshot.industry}`)
    if (snapshot.employee_count) parts.push(`Size: ${snapshot.employee_count} employees`)
    return parts.join(' | ')
  }

  private buildICPText(icp: { name: string; description: string; criteria: Record<string, unknown>; metrics: Record<string, unknown> }): string {
    const parts: string[] = []
    parts.push(icp.name)
    parts.push(icp.description)

    const criteria = icp.criteria
    if (criteria.industries) parts.push(`Industries: ${(criteria.industries as string[]).join(', ')}`)
    if (criteria.locations) parts.push(`Locations: ${(criteria.locations as string[]).join(', ')}`)
    if (criteria.employee_range) {
      const range = criteria.employee_range as { min?: number; max?: number }
      parts.push(`Size: ${range.min || 0}-${range.max || '∞'} employees`)
    }

    const metrics = icp.metrics as { win_rate: number; avg_deal_size: number }
    parts.push(`Win rate: ${(metrics.win_rate * 100).toFixed(1)}%`)
    parts.push(`Avg deal: $${metrics.avg_deal_size.toLocaleString()}`)

    return parts.join(' | ')
  }

  private buildResearchText(report: { company_name: string; executive_summary?: string; key_findings?: string[] }): string {
    const parts: string[] = []
    parts.push(`Research: ${report.company_name}`)
    if (report.executive_summary) parts.push(report.executive_summary.substring(0, 500))
    if (report.key_findings) parts.push(report.key_findings.join(' | '))
    return parts.join(' | ')
  }
}

// Singleton
let indexer: UserContextIndexer | null = null

export function getUserContextIndexer(): UserContextIndexer {
  if (!indexer) {
    indexer = new UserContextIndexer()
  }
  return indexer
}
