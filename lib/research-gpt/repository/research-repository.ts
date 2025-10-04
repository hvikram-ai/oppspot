/**
 * Research Repository for ResearchGPT™
 *
 * Handles all database operations for research reports:
 * - Create/read/update research reports
 * - Store sections with differential TTL
 * - Track sources for GDPR compliance
 * - Manage user quotas
 * - Cache management
 *
 * Uses Supabase PostgreSQL with Row Level Security (RLS)
 */

import { createClient } from '@/lib/supabase/server';
import SmartCacheManager from '../cache/smart-cache-manager';

import type {
  ResearchReport,
  ResearchSection,
  ResearchSource,
  UserResearchQuota,
  ReportStatus,
  SectionType,
  ConfidenceLevel,
  SourceType,
} from '@/types/research-gpt';

// ============================================================================
// REPOSITORY CLASS
// ============================================================================

export class ResearchRepository {
  /**
   * Create a new research report
   */
  async createReport(
    userId: string,
    companyId: string,
    companyName: string,
    companyNumber: string | null
  ): Promise<ResearchReport> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('research_reports')
      .insert({
        user_id: userId,
        company_id: companyId,
        company_name: companyName,
        company_number: companyNumber,
        status: 'pending',
        sections_complete: 0,
        total_sources: 0,
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create research report:', error);
      throw new Error(`Failed to create research report: ${error.message}`);
    }

    return data as ResearchReport;
  }

  /**
   * Get research report by ID
   */
  async getReportById(reportId: string, userId?: string): Promise<ResearchReport | null> {
    const supabase = await createClient();

    let query = supabase
      .from('research_reports')
      .select('*')
      .eq('id', reportId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Failed to get research report:', error);
      throw new Error(`Failed to get research report: ${error.message}`);
    }

    return data as ResearchReport;
  }

  /**
   * Get most recent research report for a company by user
   */
  async getLatestReportForCompany(
    userId: string,
    companyId: string
  ): Promise<ResearchReport | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('research_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Failed to get latest report:', error);
      return null;
    }

    return data as ResearchReport;
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    updates?: {
      sections_complete?: number;
      total_sources?: number;
      confidence_score?: number;
      generated_at?: string;
      cached_until?: string;
      metadata?: any;
    }
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('research_reports')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      console.error('Failed to update report status:', error);
      throw new Error(`Failed to update report status: ${error.message}`);
    }
  }

  /**
   * Create or update a section
   */
  async upsertSection(
    reportId: string,
    sectionType: SectionType,
    content: any,
    confidence: ConfidenceLevel,
    sourcesCount: number,
    generationTimeMs: number
  ): Promise<ResearchSection> {
    const supabase = await createClient();

    const expiresAt = SmartCacheManager.calculateCacheExpiration(sectionType);

    const { data, error } = await supabase
      .from('research_sections')
      .upsert({
        report_id: reportId,
        section_type: sectionType,
        content,
        confidence,
        sources_count: sourcesCount,
        expires_at: expiresAt,
        cached_at: new Date().toISOString(),
        generation_time_ms: generationTimeMs,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert section:', error);
      throw new Error(`Failed to upsert section: ${error.message}`);
    }

    return data as ResearchSection;
  }

  /**
   * Get all sections for a report
   */
  async getSections(reportId: string): Promise<ResearchSection[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('research_sections')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to get sections:', error);
      throw new Error(`Failed to get sections: ${error.message}`);
    }

    return data as ResearchSection[];
  }

  /**
   * Get specific section
   */
  async getSection(reportId: string, sectionType: SectionType): Promise<ResearchSection | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('research_sections')
      .select('*')
      .eq('report_id', reportId)
      .eq('section_type', sectionType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Failed to get section:', error);
      throw new Error(`Failed to get section: ${error.message}`);
    }

    return data as ResearchSection;
  }

  /**
   * Check if section cache is valid
   */
  async isSectionCacheValid(reportId: string, sectionType: SectionType): Promise<boolean> {
    const section = await this.getSection(reportId, sectionType);

    if (!section) return false;

    return SmartCacheManager.isCacheValid(section.cached_at, section.expires_at);
  }

  /**
   * Add sources to report
   */
  async addSources(reportId: string, sources: Array<{
    section_type: SectionType | null;
    url: string;
    title: string;
    published_date: string | null;
    source_type: SourceType;
    reliability_score: number;
    domain: string | null;
    content_snippet: string | null;
  }>): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('research_sources')
      .insert(
        sources.map((source) => ({
          report_id: reportId,
          ...source,
        }))
      );

    if (error) {
      console.error('Failed to add sources:', error);
      throw new Error(`Failed to add sources: ${error.message}`);
    }
  }

  /**
   * Get sources for a report
   */
  async getSources(reportId: string): Promise<ResearchSource[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('research_sources')
      .select('*')
      .eq('report_id', reportId)
      .order('reliability_score', { ascending: false });

    if (error) {
      console.error('Failed to get sources:', error);
      throw new Error(`Failed to get sources: ${error.message}`);
    }

    return data as ResearchSource[];
  }

  // ============================================================================
  // QUOTA MANAGEMENT
  // ============================================================================

  /**
   * Get user quota
   */
  async getUserQuota(userId: string): Promise<UserResearchQuota> {
    const supabase = await createClient();

    // Try to get existing quota
    const { data, error } = await supabase
      .from('user_research_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create new quota
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: newData, error: createError } = await supabase
        .from('user_research_quotas')
        .insert({
          user_id: userId,
          period_start: periodStart,
          period_end: periodEnd,
          researches_used: 0,
          researches_limit: 100,
          tier: 'standard',
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create quota: ${createError.message}`);
      }

      return newData as UserResearchQuota;
    }

    if (error) {
      throw new Error(`Failed to get quota: ${error.message}`);
    }

    // Check if we need to reset for new period
    const now = new Date();
    const periodEnd = new Date(data.period_end);

    if (now > periodEnd) {
      // Reset quota
      const newPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const newPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: updatedData, error: updateError } = await supabase
        .from('user_research_quotas')
        .update({
          period_start: newPeriodStart,
          period_end: newPeriodEnd,
          researches_used: 0,
          notification_90_percent_sent: false,
          notification_100_percent_sent: false,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to reset quota: ${updateError.message}`);
      }

      return updatedData as UserResearchQuota;
    }

    return data as UserResearchQuota;
  }

  /**
   * Check if user has quota available
   */
  async checkQuota(userId: string): Promise<boolean> {
    const quota = await this.getUserQuota(userId);
    return quota.researches_used < quota.researches_limit;
  }

  /**
   * Increment user quota
   */
  async incrementQuota(userId: string): Promise<void> {
    const supabase = await createClient();

    // Use database function for atomic increment
    const { error } = await supabase.rpc('increment_research_quota', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Failed to increment quota:', error);
      throw new Error(`Failed to increment quota: ${error.message}`);
    }
  }

  /**
   * Get research history for user
   */
  async getResearchHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ reports: ResearchReport[]; total: number }> {
    const supabase = await createClient();

    // Get count
    const { count } = await supabase
      .from('research_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get reports
    const { data, error } = await supabase
      .from('research_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get research history: ${error.message}`);
    }

    return {
      reports: data as ResearchReport[],
      total: count || 0,
    };
  }

  /**
   * Delete report (GDPR compliance)
   */
  async deleteReport(reportId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('research_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  /**
   * Anonymize old personal data (GDPR - 6 month cleanup)
   */
  async anonymizeOldData(monthsOld = 6): Promise<number> {
    const supabase = await createClient();

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

    // Find old reports
    const { data: oldReports } = await supabase
      .from('research_reports')
      .select('id')
      .lt('generated_at', cutoffDate.toISOString());

    if (!oldReports || oldReports.length === 0) {
      return 0;
    }

    // Anonymize decision makers (remove contact info)
    const reportIds = oldReports.map((r) => r.id);

    for (const reportId of reportIds) {
      const sections = await this.getSections(reportId);

      for (const section of sections) {
        if (section.section_type === 'decision_makers' && section.content.key_people) {
          // Remove personal contact info
          const anonymized = section.content.key_people.map((person: any) => ({
            ...person,
            business_email: null,
            phone_number: null,
            linkedin_url: null,
          }));

          await supabase
            .from('research_sections')
            .update({
              content: { ...section.content, key_people: anonymized },
            })
            .eq('id', section.id);
        }
      }
    }

    return reportIds.length;
  }

  /**
   * Get report with all sections and sources
   */
  async getCompleteReport(reportId: string, userId?: string): Promise<{
    report: ResearchReport;
    sections: ResearchSection[];
    sources: ResearchSource[];
  } | null> {
    const report = await this.getReportById(reportId, userId);

    if (!report) {
      return null;
    }

    const [sections, sources] = await Promise.all([
      this.getSections(reportId),
      this.getSources(reportId),
    ]);

    return {
      report,
      sections,
      sources,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: ResearchRepository | null = null;

export function getResearchRepository(): ResearchRepository {
  if (!instance) {
    instance = new ResearchRepository();
  }
  return instance;
}

export default ResearchRepository;
