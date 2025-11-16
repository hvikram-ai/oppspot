/**
 * ResearchGPT™ Main Service
 *
 * Orchestrates the complete research generation pipeline:
 * 1. Check quota availability
 * 2. Fetch data from all sources (parallel)
 * 3. Analyze with AI (snapshot, signals, decision makers, revenue)
 * 4. Generate recommendations
 * 5. Store in database
 * 6. Track progress and handle errors
 *
 * Target: <30 seconds for 95% of requests
 */

import { getDataSourceFactory } from './data-sources/data-source-factory';
import { getSnapshotAnalyzer } from './analyzers/snapshot-analyzer';
import { getSignalsAnalyzer } from './analyzers/signals-analyzer';
import { getDecisionMakerAnalyzer } from './analyzers/decision-maker-analyzer';
import { getRevenueAnalyzer } from './analyzers/revenue-analyzer';
import { getRecommendationGenerator } from './analyzers/recommendation-generator';
import { getResearchRepository } from './repository/research-repository';

import type {
  ResearchReport,
  ReportStatus,
  SectionType,
} from '@/types/research-gpt';

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchOptions {
  user_id: string;
  company_id: string;
  company_name: string;
  company_number: string | null;
  website_url?: string;
  force_refresh?: boolean;
  user_context?: string;
  focus_areas?: string[];
}

export interface ResearchProgress {
  report_id: string;
  status: ReportStatus;
  sections_complete: number;
  total_sections: number;
  estimated_completion_seconds: number;
  current_step?: string;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class ResearchGPTService {
  private dataSourceFactory = getDataSourceFactory();
  private snapshotAnalyzer = getSnapshotAnalyzer();
  private signalsAnalyzer = getSignalsAnalyzer();
  private decisionMakerAnalyzer = getDecisionMakerAnalyzer();
  private revenueAnalyzer = getRevenueAnalyzer();
  private recommendationGenerator = getRecommendationGenerator();
  private repository = getResearchRepository();

  /**
   * Generate complete research report
   */
  async generateResearch(options: ResearchOptions): Promise<ResearchReport> {
    const startTime = Date.now();

    console.log(`[ResearchGPT] Starting research for ${options.company_name}...`);

    try {
      // Step 1: Check quota
      await this.checkQuota(options.user_id);

      // Step 2: Check for existing cached report
      if (!options.force_refresh) {
        const cached = await this.getCachedReport(options);
        if (cached) {
          console.log(`[ResearchGPT] Returning cached report (${cached.id})`);
          return cached;
        }
      }

      // Step 3: Create new report record
      const report = await this.repository.createReport(
        options.user_id,
        options.company_id,
        options.company_name,
        options.company_number
      );

      console.log(`[ResearchGPT] Created report ${report.id}`);

      // Step 4: Update to generating status
      await this.repository.updateReportStatus(report.id, 'generating');

      // Step 5: Fetch data from all sources (parallel)
      const aggregatedData = await this.dataSourceFactory.fetchAllSources({
        company_number: options.company_number || '',
        company_name: options.company_name,
        website_url: options.website_url,
        force_refresh: options.force_refresh,
      });

      // Step 6: Analyze data in sequence (each depends on previous)
      await this.analyzeAndStore(report.id, aggregatedData, options);

      // Step 7: Mark as complete and increment quota
      const duration = Date.now() - startTime;
      await this.repository.updateReportStatus(report.id, 'complete', {
        sections_complete: 6,
        generated_at: new Date().toISOString(),
        cached_until: this.calculateCacheExpiry(),
        metadata: {
          generation_time_ms: duration,
          sources_fetched: aggregatedData.metadata.sources_fetched,
          sources_failed: aggregatedData.metadata.sources_failed,
        },
      });

      // Increment quota (only on successful generation)
      await this.repository.incrementQuota(options.user_id);

      console.log(`[ResearchGPT] Research complete in ${duration}ms`);

      // Return complete report
      const completeReport = await this.repository.getReportById(report.id);
      return completeReport!;
    } catch (error) {
      console.error('[ResearchGPT] Error:', error);
      throw error;
    }
  }

  interface AggregatedData {
    snapshot: unknown;
    buying_signals: unknown[];
    decision_makers: unknown[];
    revenue_signals: unknown[];
    sources: Array<{
      source_type: string;
      url: string;
      title: string;
      published_date?: string | null;
      reliability_score?: number;
      domain?: string;
      content_snippet?: string;
      [key: string]: unknown;
    }>;
    metadata: {
      sources_fetched: number;
      sources_failed: number;
      [key: string]: unknown;
    };
  }

  /**
   * Analyze data and store all sections
   */
  private async analyzeAndStore(
    reportId: string,
    aggregatedData: AggregatedData,
    options: ResearchOptions
  ): Promise<void> {
    const sectionTimes: Record<string, number> = {};

    // Section 1: Snapshot
    const snapshotStart = Date.now();
    const snapshotResult = await this.snapshotAnalyzer.analyze(aggregatedData);
    sectionTimes.snapshot = Date.now() - snapshotStart;

    await this.repository.upsertSection(
      reportId,
      'snapshot',
      snapshotResult.snapshot,
      snapshotResult.confidence,
      aggregatedData.sources.filter((s) => s.source_type === 'companies_house').length,
      sectionTimes.snapshot
    );

    await this.repository.updateReportStatus(reportId, 'generating', {
      sections_complete: 1,
    });

    // Section 2: Buying Signals
    const signalsStart = Date.now();
    const signalsResult = await this.signalsAnalyzer.analyze(aggregatedData);
    sectionTimes.buying_signals = Date.now() - signalsStart;

    await this.repository.upsertSection(
      reportId,
      'buying_signals',
      {
        hiring_signals: signalsResult.signals.hiring_signals,
        expansion_signals: signalsResult.signals.expansion_signals,
        leadership_changes: signalsResult.signals.leadership_changes,
        product_signals: signalsResult.signals.product_signals,
        financial_signals: signalsResult.signals.financial_signals,
        summary: signalsResult.signals.summary,
      },
      signalsResult.confidence,
      signalsResult.signals.all_signals.length,
      sectionTimes.buying_signals
    );

    await this.repository.updateReportStatus(reportId, 'generating', {
      sections_complete: 2,
    });

    // Section 3: Decision Makers
    const dmStart = Date.now();
    const dmResult = await this.decisionMakerAnalyzer.analyze(aggregatedData);
    sectionTimes.decision_makers = Date.now() - dmStart;

    await this.repository.upsertSection(
      reportId,
      'decision_makers',
      {
        key_people: dmResult.decision_makers.all_decision_makers,
        org_chart: dmResult.decision_makers.org_chart,
        summary: dmResult.decision_makers.summary,
      },
      dmResult.confidence,
      dmResult.decision_makers.all_decision_makers.length,
      sectionTimes.decision_makers
    );

    await this.repository.updateReportStatus(reportId, 'generating', {
      sections_complete: 3,
    });

    // Section 4: Revenue Signals
    const revenueStart = Date.now();
    const revenueResult = await this.revenueAnalyzer.analyze(aggregatedData);
    sectionTimes.revenue_signals = Date.now() - revenueStart;

    await this.repository.upsertSection(
      reportId,
      'revenue_signals',
      {
        financial_health: revenueResult.revenue_signals.financial_health_signals,
        growth_signals: revenueResult.revenue_signals.growth_signals,
        risk_signals: revenueResult.revenue_signals.risk_signals,
        summary: revenueResult.revenue_signals.financial_summary,
      },
      revenueResult.confidence,
      revenueResult.revenue_signals.all_signals.length,
      sectionTimes.revenue_signals
    );

    await this.repository.updateReportStatus(reportId, 'generating', {
      sections_complete: 4,
    });

    // Section 5: Recommended Approach (AI-powered)
    const recStart = Date.now();
    const recResult = await this.recommendationGenerator.generate({
      snapshot: snapshotResult.snapshot,
      signals: signalsResult.signals,
      decision_makers: dmResult.decision_makers,
      revenue_signals: revenueResult.revenue_signals,
      user_context: options.user_context,
      focus_areas: options.focus_areas,
    });
    sectionTimes.recommended_approach = Date.now() - recStart;

    await this.repository.upsertSection(
      reportId,
      'recommended_approach',
      recResult.recommendations,
      recResult.confidence,
      0,
      sectionTimes.recommended_approach
    );

    await this.repository.updateReportStatus(reportId, 'generating', {
      sections_complete: 5,
    });

    // Section 6: Sources
    const sourcesStart = Date.now();
    await this.repository.addSources(
      reportId,
      aggregatedData.sources.map((s) => ({
        section_type: null,
        url: s.url,
        title: s.title,
        published_date: s.published_date,
        source_type: s.source_type,
        reliability_score: s.reliability_score,
        domain: s.domain,
        content_snippet: s.content_snippet,
      }))
    );
    sectionTimes.sources = Date.now() - sourcesStart;

    await this.repository.upsertSection(
      reportId,
      'sources',
      { sources: aggregatedData.sources },
      'high',
      aggregatedData.sources.length,
      sectionTimes.sources
    );

    await this.repository.updateReportStatus(reportId, 'generating', {
      sections_complete: 6,
      total_sources: aggregatedData.sources.length,
      confidence_score: this.calculateOverallConfidence(
        snapshotResult.confidence,
        signalsResult.confidence,
        dmResult.confidence,
        revenueResult.confidence,
        recResult.confidence
      ),
    });

    console.log(`[ResearchGPT] Section times:`, sectionTimes);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check user quota availability
   */
  private async checkQuota(userId: string): Promise<void> {
    const hasQuota = await this.repository.checkQuota(userId);

    if (!hasQuota) {
      throw new Error('Research quota exceeded');
    }
  }

  /**
   * Get cached report if available and valid
   */
  private async getCachedReport(options: ResearchOptions): Promise<ResearchReport | null> {
    const latest = await this.repository.getLatestReportForCompany(
      options.user_id,
      options.company_id
    );

    if (!latest) return null;

    // Check if cache is still valid
    if (latest.cached_until) {
      const cacheExpiry = new Date(latest.cached_until);
      if (cacheExpiry > new Date()) {
        return latest;
      }
    }

    return null;
  }

  /**
   * Calculate cache expiry (7 days for overall report)
   */
  private calculateCacheExpiry(): string {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    return expiry.toISOString();
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(...confidences: string[]): number {
    const scores = confidences.map((c) => {
      switch (c) {
        case 'high':
          return 0.9;
        case 'medium':
          return 0.7;
        case 'low':
          return 0.5;
        default:
          return 0.5;
      }
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Get research progress
   */
  async getProgress(reportId: string): Promise<ResearchProgress | null> {
    const report = await this.repository.getReportById(reportId);

    if (!report) return null;

    return {
      report_id: report.id,
      status: report.status,
      sections_complete: report.sections_complete,
      total_sections: 6,
      estimated_completion_seconds: this.estimateCompletion(report.sections_complete),
      current_step: this.getCurrentStep(report.sections_complete),
    };
  }

  private estimateCompletion(sectionsComplete: number): number {
    const avgTimePerSection = 5; // 5 seconds per section
    const remaining = 6 - sectionsComplete;
    return remaining * avgTimePerSection;
  }

  private getCurrentStep(sectionsComplete: number): string {
    const steps = [
      'Fetching company data...',
      'Analyzing company snapshot...',
      'Detecting buying signals...',
      'Identifying decision makers...',
      'Assessing financial health...',
      'Generating recommendations...',
      'Finalizing report...',
    ];

    return steps[sectionsComplete] || 'Complete';
  }

  /**
   * Get complete report with all sections and sources
   */
  async getCompleteReport(
    reportId: string,
    userId?: string
  ): Promise<{
    report: ResearchReport;
    sections: unknown[];
    sources: unknown[];
  } | null> {
    return this.repository.getCompleteReport(reportId, userId);
  }

  /**
   * Get user's research history
   */
  async getHistory(userId: string, limit = 50, offset = 0) {
    return this.repository.getResearchHistory(userId, limit, offset);
  }

  /**
   * Get user quota
   */
  async getQuota(userId: string) {
    return this.repository.getUserQuota(userId);
  }

  /**
   * Delete report (GDPR)
   */
  async deleteReport(reportId: string, userId: string): Promise<void> {
    return this.repository.deleteReport(reportId, userId);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: ResearchGPTService | null = null;

export function getResearchGPTService(): ResearchGPTService {
  if (!instance) {
    instance = new ResearchGPTService();
  }
  return instance;
}

export default ResearchGPTService;
