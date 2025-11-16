/**
 * Multi-Agent Research Service
 * Enhanced ResearchGPT using the multi-agent system for specialized analysis
 */

import { getMultiAgentOrchestrator } from '@/lib/agents/orchestrator'
import { getDataSourceFactory } from './data-sources/data-source-factory'
import { getResearchRepository } from './repository/research-repository'
import type { ResearchReport, ReportStatus } from '@/types/research-gpt'
import type { ResearchContext } from '@/lib/agents/agent-types'

// ============================================================================
// TYPES
// ============================================================================

export interface MultiAgentResearchOptions {
  user_id: string
  company_id: string
  company_name: string
  company_number: string | null
  website_url?: string
  force_refresh?: boolean
  user_context?: string
  focus_areas?: string[]
}

// ============================================================================
// MULTI-AGENT RESEARCH SERVICE
// ============================================================================

export class MultiAgentResearchService {
  private orchestrator = getMultiAgentOrchestrator()
  private dataSourceFactory = getDataSourceFactory()
  private repository = getResearchRepository()

  /**
   * Generate research using multi-agent system
   */
  async generateResearch(
    options: MultiAgentResearchOptions
  ): Promise<ResearchReport> {
    const startTime = Date.now()

    console.log(
      `[Multi-Agent Research] Starting research for ${options.company_name}...`
    )

    try {
      // Step 1: Check quota
      await this.checkQuota(options.user_id)

      // Step 2: Check for cached report (unless force refresh)
      if (!options.force_refresh) {
        const cached = await this.getCachedReport(options)
        if (cached) {
          console.log(
            `[Multi-Agent Research] Returning cached report (${cached.id})`
          )
          return cached
        }
      }

      // Step 3: Create new report record
      const report = await this.repository.createReport(
        options.user_id,
        options.company_id,
        options.company_name,
        options.company_number
      )

      console.log(`[Multi-Agent Research] Created report ${report.id}`)

      // Step 4: Update to generating status
      await this.repository.updateReportStatus(report.id, 'generating')

      // Step 5: Fetch data from all sources (parallel)
      const aggregatedData = await this.dataSourceFactory.fetchAllSources({
        company_number: options.company_number || '',
        company_name: options.company_name,
        website_url: options.website_url,
        force_refresh: options.force_refresh,
      })

      // Step 6: Build research context for agents
      const researchContext = this.buildResearchContext(
        options,
        aggregatedData
      )

      // Step 7: Execute multi-agent research
      const multiAgentReport =
        await this.orchestrator.comprehensiveResearch(researchContext)

      // Step 8: Store agent analyses as sections
      await this.storeAgentSections(report.id, multiAgentReport)

      // Step 9: Store sources
      await this.repository.addSources(
        report.id,
        multiAgentReport.allSources.map((s) => ({
          section_type: null,
          url: s.url,
          title: s.title,
          published_date: s.published_date ?? null,
          source_type: s.source_type,
          reliability_score: s.reliability_score ?? 0,
          domain: s.domain ?? null,
          content_snippet: s.content_snippet ?? null,
        })) as unknown
      )

      // Step 10: Mark as complete
      const duration = Date.now() - startTime
      await this.repository.updateReportStatus(report.id, 'complete', {
        sections_complete: Object.keys(multiAgentReport.sections).length + 1, // +1 for agent_synthesis
        generated_at: new Date().toISOString(),
        cached_until: this.calculateCacheExpiry(),
        metadata: {
          generation_time_ms: duration,
          agents_used: multiAgentReport.metadata.total_agents_used,
          parallel_execution: multiAgentReport.metadata.parallel_execution,
          sources_fetched: aggregatedData.metadata.sources_fetched,
          sources_failed: aggregatedData.metadata.sources_failed,
          multi_agent: true,
        },
      })

      // Increment quota
      await this.repository.incrementQuota(options.user_id)

      console.log(`[Multi-Agent Research] Research complete in ${duration}ms`)

      // Return complete report
      const completeReport = await this.repository.getReportById(report.id)
      return completeReport!
    } catch (error) {
      console.error('[Multi-Agent Research] Error:', error)
      throw error
    }
  }

  interface AggregatedData {
    company?: {
      description?: string;
      industry?: string;
      employee_count?: number;
      founded_date?: string;
    };
    news?: unknown[];
    financialHistory?: unknown[];
    competitors?: unknown[];
    technologies?: unknown[];
    people?: unknown[];
    sources?: unknown[];
    metadata?: {
      sources_fetched: number;
      sources_failed: number;
    };
  }

  /**
   * Build research context from aggregated data
   */
  private buildResearchContext(
    options: MultiAgentResearchOptions,
    aggregatedData: AggregatedData
  ): ResearchContext {
    return {
      companyData: {
        id: options.company_id,
        name: options.company_name,
        company_number: options.company_number || undefined,
        website: options.website_url,
        description: aggregatedData.company?.description,
        industry: aggregatedData.company?.industry,
        employee_count: aggregatedData.company?.employee_count,
        founded_date: aggregatedData.company?.founded_date,
      },
      newsArticles: aggregatedData.news || [],
      financialData: aggregatedData.financialHistory || [],
      competitors: aggregatedData.competitors || [],
      technologies: aggregatedData.technologies || [],
      people: aggregatedData.people || [],
      sources: aggregatedData.sources || [],
      metadata: aggregatedData.metadata || {
        sources_fetched: 0,
        sources_failed: 0,
      },
    }
  }

  interface MultiAgentReport {
    sections: Record<string, {
      content: string;
      keyInsights: unknown[];
      opportunities: unknown[];
      concerns: unknown[];
      recommendations: unknown[];
      confidence: number;
      sources: unknown[];
      metadata?: {
        processing_time_ms?: number;
      };
    }>;
    executiveSummary: string;
    buyingSignals?: unknown[];
    opportunityScore?: number;
    allSources: Array<{
      url: string;
      title: string;
      published_date?: string | null;
      source_type: string;
      reliability_score?: number;
      domain?: string | null;
      content_snippet?: string | null;
    }>;
    metadata: {
      total_agents_used: number;
      parallel_execution: boolean;
    };
  }

  /**
   * Store agent analyses as report sections
   */
  private async storeAgentSections(
    reportId: string,
    multiAgentReport: MultiAgentReport
  ): Promise<void> {
    const sectionTimes: Record<string, number> = {}

    // Store each agent's analysis as a section
    const agentTypes = [
      'research',
      'financial',
      'market',
      'technical',
      'legal',
      'contacts',
    ]

    let sectionsComplete = 0

    for (const agentType of agentTypes) {
      if (multiAgentReport.sections[agentType]) {
        const analysis = multiAgentReport.sections[agentType]
        const startTime = Date.now()

        await this.repository.upsertSection(
          reportId,
          `agent_${agentType}` as unknown, // New section type for agent results
          {
            content: analysis.content,
            key_insights: analysis.keyInsights,
            opportunities: analysis.opportunities,
            concerns: analysis.concerns,
            recommendations: analysis.recommendations,
          },
          analysis.confidence >= 0.8
            ? 'high'
            : analysis.confidence >= 0.6
              ? 'medium'
              : 'low',
          analysis.sources.length,
          analysis.metadata?.processing_time_ms || 0
        )

        sectionTimes[agentType] = Date.now() - startTime
        sectionsComplete++

        await this.repository.updateReportStatus(reportId, 'generating', {
          sections_complete: sectionsComplete,
        })
      }
    }

    // Store executive summary as agent_synthesis section
    await this.repository.upsertSection(
      reportId,
      'agent_synthesis' as unknown,
      {
        executive_summary: multiAgentReport.executiveSummary,
        buying_signals: multiAgentReport.buyingSignals || [],
        opportunity_score: multiAgentReport.opportunityScore || 0,
      },
      'high',
      0,
      0
    )

    console.log(`[Multi-Agent Research] Stored ${sectionsComplete} agent sections`)
  }

  /**
   * Check user quota
   */
  private async checkQuota(userId: string): Promise<void> {
    const hasQuota = await this.repository.checkQuota(userId)
    if (!hasQuota) {
      throw new Error('Research quota exceeded')
    }
  }

  /**
   * Get cached report if available
   */
  private async getCachedReport(
    options: MultiAgentResearchOptions
  ): Promise<ResearchReport | null> {
    const latest = await this.repository.getLatestReportForCompany(
      options.user_id,
      options.company_id
    )

    if (!latest) return null

    // Check if cache is still valid
    if (latest.cached_until) {
      const cacheExpiry = new Date(latest.cached_until)
      if (cacheExpiry > new Date()) {
        return latest
      }
    }

    return null
  }

  /**
   * Calculate cache expiry (7 days)
   */
  private calculateCacheExpiry(): string {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 7)
    return expiry.toISOString()
  }

  /**
   * Get complete report with all sections and sources
   */
  async getCompleteReport(reportId: string, userId?: string) {
    return this.repository.getCompleteReport(reportId, userId)
  }

  /**
   * Get user's research history
   */
  async getHistory(userId: string, limit = 50, offset = 0) {
    return this.repository.getResearchHistory(userId, limit, offset)
  }

  /**
   * Get user quota
   */
  async getQuota(userId: string) {
    return this.repository.getUserQuota(userId)
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: MultiAgentResearchService | null = null

export function getMultiAgentResearchService(): MultiAgentResearchService {
  if (!instance) {
    instance = new MultiAgentResearchService()
  }
  return instance
}

export default MultiAgentResearchService
