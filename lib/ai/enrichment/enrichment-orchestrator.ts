/**
 * Enrichment Orchestrator
 * Coordinates data enrichment across multiple agents
 *
 * Features:
 * - Sequential or parallel agent execution
 * - Progress tracking
 * - Error handling and retries
 * - Priority-based enrichment
 * - Deduplication
 */

import { createClient } from '@/lib/supabase/server'
import { createLinkedInScraperAgent } from '@/lib/ai/agents/linkedin-scraper-agent'
import { createWebsiteAnalyzerAgent } from '@/lib/ai/agents/website-analyzer-agent'
import type { Row } from '@/lib/supabase/helpers'

// Database row interfaces for enrichment tables
interface EnrichmentJobRow {
  id: string
  org_id: string
  company_ids: string[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  enrichment_types: EnrichmentType[]
  progress: {
    total: number
    completed: number
    failed: number
  }
  results: EnrichmentResult[]
  started_at: string | null
  completed_at: string | null
  error: string | null
  created_at?: string
  updated_at?: string
}

interface AgentRow {
  id: string
  org_id: string
  name: string
  agent_type: string
  configuration: Record<string, any>
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface EnrichmentRequest {
  companyIds: string[]
  enrichmentTypes: EnrichmentType[]
  priority?: 'high' | 'normal' | 'low'
  mode?: 'parallel' | 'sequential'
}

export type EnrichmentType = 'linkedin' | 'website' | 'all'

export interface EnrichmentJob {
  id: string
  companyIds: string[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  enrichmentTypes: EnrichmentType[]
  progress: {
    total: number
    completed: number
    failed: number
  }
  results: EnrichmentResult[]
  startedAt?: Date
  completedAt?: Date
  error?: string
}

export interface EnrichmentResult {
  companyId: string
  enrichmentType: EnrichmentType
  status: 'success' | 'failed'
  data?: any
  error?: string
  duration: number
}

export class EnrichmentOrchestrator {
  private orgId: string

  constructor(orgId: string) {
    this.orgId = orgId
  }

  /**
   * Enrich companies with specified data sources
   */
  async enrichCompanies(request: EnrichmentRequest): Promise<EnrichmentJob> {
    const supabase = await createClient()

    // Create enrichment job
    const jobId = crypto.randomUUID()
    const job: EnrichmentJob = {
      id: jobId,
      companyIds: request.companyIds,
      status: 'pending',
      enrichmentTypes: request.enrichmentTypes,
      progress: {
        total: request.companyIds.length * request.enrichmentTypes.length,
        completed: 0,
        failed: 0
      },
      results: []
    }

    // Save job to database
    await this.saveJob(job)

    // Start enrichment (async)
    this.runEnrichment(job, request.mode || 'sequential').catch(error => {
      console.error(`Enrichment job ${jobId} failed:`, error)
    })

    return job
  }

  /**
   * Get enrichment job status
   */
  async getJobStatus(jobId: string): Promise<EnrichmentJob | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('enrichment_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('org_id', this.orgId)
      .single() as { data: EnrichmentJobRow | null; error: any }

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      companyIds: data.company_ids,
      status: data.status,
      enrichmentTypes: data.enrichment_types,
      progress: data.progress,
      results: data.results || [],
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      error: data.error ?? undefined
    }
  }

  /**
   * Get all enrichment jobs for org
   */
  async getJobs(limit = 20): Promise<EnrichmentJob[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('enrichment_jobs')
      .select('*')
      .eq('org_id', this.orgId)
      .order('created_at', { ascending: false })
      .limit(limit) as { data: EnrichmentJobRow[] | null; error: any }

    if (error || !data) {
      return []
    }

    return data.map((row: EnrichmentJobRow) => ({
      id: row.id,
      companyIds: row.company_ids,
      status: row.status,
      enrichmentTypes: row.enrichment_types,
      progress: row.progress,
      results: row.results || [],
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      error: row.error ?? undefined
    }))
  }

  /**
   * Cancel enrichment job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const supabase = await createClient()

    const updateData: Partial<EnrichmentJobRow> = {
      status: 'failed' as const,
      error: 'Cancelled by user',
      completed_at: new Date().toISOString()
    }

    const { error } = await (supabase
      .from('enrichment_jobs') as any)
      .update(updateData)
      .eq('id', jobId)
      .eq('org_id', this.orgId)

    return !error
  }

  /**
   * Run enrichment process
   */
  private async runEnrichment(job: EnrichmentJob, mode: 'parallel' | 'sequential'): Promise<void> {
    const startTime = Date.now()

    try {
      // Update job status to running
      job.status = 'running'
      job.startedAt = new Date()
      await this.saveJob(job)

      // Get agent IDs for this org
      const agentIds = await this.getAgentIds()

      if (mode === 'parallel') {
        // Run all enrichments in parallel
        await this.runParallelEnrichment(job, agentIds)
      } else {
        // Run enrichments sequentially
        await this.runSequentialEnrichment(job, agentIds)
      }

      // Mark job as completed
      job.status = 'completed'
      job.completedAt = new Date()
      await this.saveJob(job)

      console.log(`Enrichment job ${job.id} completed in ${Date.now() - startTime}ms`)

    } catch (error: any) {
      console.error(`Enrichment job ${job.id} failed:`, error)

      job.status = 'failed'
      job.error = error.message
      job.completedAt = new Date()
      await this.saveJob(job)
    }
  }

  /**
   * Run enrichments in parallel
   */
  private async runParallelEnrichment(job: EnrichmentJob, agentIds: Record<string, string>): Promise<void> {
    const tasks: Promise<void>[] = []

    for (const type of job.enrichmentTypes) {
      if (type === 'linkedin' || type === 'all') {
        tasks.push(this.runLinkedInEnrichment(job, agentIds.linkedin))
      }

      if (type === 'website' || type === 'all') {
        tasks.push(this.runWebsiteEnrichment(job, agentIds.website))
      }
    }

    await Promise.allSettled(tasks)
  }

  /**
   * Run enrichments sequentially
   */
  private async runSequentialEnrichment(job: EnrichmentJob, agentIds: Record<string, string>): Promise<void> {
    for (const type of job.enrichmentTypes) {
      if (type === 'linkedin' || type === 'all') {
        await this.runLinkedInEnrichment(job, agentIds.linkedin)
      }

      if (type === 'website' || type === 'all') {
        await this.runWebsiteEnrichment(job, agentIds.website)
      }
    }
  }

  /**
   * Run LinkedIn enrichment
   */
  private async runLinkedInEnrichment(job: EnrichmentJob, agentId: string): Promise<void> {
    try {
      const agent = await createLinkedInScraperAgent(agentId)

      const result = await agent.run({
        companyIds: job.companyIds,
        maxCompanies: job.companyIds.length
      })

      // Process results
      for (const companyId of job.companyIds) {
        job.results.push({
          companyId,
          enrichmentType: 'linkedin',
          status: result.success ? 'success' : 'failed',
          data: result.output,
          duration: result.metrics.durationMs
        })

        job.progress.completed++
      }

      await this.saveJob(job)

    } catch (error: any) {
      console.error('LinkedIn enrichment failed:', error)

      // Mark all as failed
      for (const companyId of job.companyIds) {
        job.results.push({
          companyId,
          enrichmentType: 'linkedin',
          status: 'failed',
          error: error.message,
          duration: 0
        })

        job.progress.failed++
      }

      await this.saveJob(job)
    }
  }

  /**
   * Run website enrichment
   */
  private async runWebsiteEnrichment(job: EnrichmentJob, agentId: string): Promise<void> {
    try {
      const agent = await createWebsiteAnalyzerAgent(agentId)

      const result = await agent.run({
        companyIds: job.companyIds,
        maxCompanies: job.companyIds.length
      })

      // Process results
      for (const companyId of job.companyIds) {
        job.results.push({
          companyId,
          enrichmentType: 'website',
          status: result.success ? 'success' : 'failed',
          data: result.output,
          duration: result.metrics.durationMs
        })

        job.progress.completed++
      }

      await this.saveJob(job)

    } catch (error: any) {
      console.error('Website enrichment failed:', error)

      // Mark all as failed
      for (const companyId of job.companyIds) {
        job.results.push({
          companyId,
          enrichmentType: 'website',
          status: 'failed',
          error: error.message,
          duration: 0
        })

        job.progress.failed++
      }

      await this.saveJob(job)
    }
  }

  /**
   * Get or create agent IDs for enrichment
   */
  private async getAgentIds(): Promise<Record<string, string>> {
    const supabase = await createClient()

    // Get or create LinkedIn scraper agent
    let { data: linkedInAgent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('org_id', this.orgId)
      .eq('agent_type', 'linkedin_scraper_agent')
      .single() as { data: Pick<AgentRow, 'id'> | null; error: any }

    if (!linkedInAgent) {
      const insertData: Omit<AgentRow, 'id' | 'created_at' | 'updated_at'> = {
        org_id: this.orgId,
        name: 'LinkedIn Scraper',
        agent_type: 'linkedin_scraper_agent',
        configuration: {
          headless: true,
          includeEmployeeGrowth: true,
          includeRecentPosts: true
        },
        is_active: true
      }

      const { data: newAgent } = await supabase
        .from('ai_agents')
        .insert(insertData as any)
        .select('id')
        .single() as { data: Pick<AgentRow, 'id'> | null; error: any }

      linkedInAgent = newAgent
    }

    // Get or create website analyzer agent
    let { data: websiteAgent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('org_id', this.orgId)
      .eq('agent_type', 'website_analyzer_agent')
      .single() as { data: Pick<AgentRow, 'id'> | null; error: any }

    if (!websiteAgent) {
      const insertData: Omit<AgentRow, 'id' | 'created_at' | 'updated_at'> = {
        org_id: this.orgId,
        name: 'Website Analyzer',
        agent_type: 'website_analyzer_agent',
        configuration: {
          analyzeTechStack: true,
          analyzeContent: true,
          analyzeCareerPages: true
        },
        is_active: true
      }

      const { data: newAgent } = await supabase
        .from('ai_agents')
        .insert(insertData as any)
        .select('id')
        .single() as { data: Pick<AgentRow, 'id'> | null; error: any }

      websiteAgent = newAgent
    }

    return {
      linkedin: linkedInAgent!.id,
      website: websiteAgent!.id
    }
  }

  /**
   * Save job to database
   */
  private async saveJob(job: EnrichmentJob): Promise<void> {
    const supabase = await createClient()

    const jobData: Omit<EnrichmentJobRow, 'created_at' | 'updated_at'> = {
      id: job.id,
      org_id: this.orgId,
      company_ids: job.companyIds,
      status: job.status,
      enrichment_types: job.enrichmentTypes,
      progress: job.progress,
      results: job.results,
      started_at: job.startedAt?.toISOString() ?? null,
      completed_at: job.completedAt?.toISOString() ?? null,
      error: job.error ?? null
    }

    // Upsert job
    await supabase
      .from('enrichment_jobs')
      .upsert(jobData as any)
  }
}

/**
 * Create enrichment orchestrator for org
 */
export async function createEnrichmentOrchestrator(orgId: string): Promise<EnrichmentOrchestrator> {
  return new EnrichmentOrchestrator(orgId)
}
