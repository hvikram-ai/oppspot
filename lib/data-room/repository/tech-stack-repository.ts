/**
 * Tech Stack Repository
 * Database operations for tech stack analysis with RLS support
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  TechStackAnalysis,
  TechStackTechnology,
  TechStackFinding,
  TechStackComparison,
  TechStackAnalysisWithDetails,
  TechStackAnalysisListItem,
  TechStackTechnologyWithSource,
  TechStackFindingWithTechnologies,
  TechStackSummary,
  CreateTechStackAnalysisRequest,
  UpdateTechStackAnalysisRequest,
  TechStackAnalysisFilter,
  TechStackTechnologyFilter,
  TechStackFindingFilter,
  AddTechnologyManuallyRequest,
  UpdateTechnologyRequest,
  VerifyTechnologyRequest,
  CreateFindingRequest,
  ResolveFindingRequest,
  TechAnalysisStatus,
  TechRiskLevel,
} from '../types';
import {
  DataRoomError,
  DataRoomErrorCode,
  notFoundError,
  validationError,
} from '../utils/error-handler';

// Query result types for joined queries
interface AnalysisQueryResult {
  id: string;
  title: string;
  status: TechAnalysisStatus;
  risk_level: TechRiskLevel | null;
  technologies_identified: number;
  modernization_score: number | null;
  ai_authenticity_score: number | null;
  technical_debt_score: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_analyzed_at: string | null;
  creator?: Array<{ full_name: string | null }>;
  findings?: Array<{ severity: string }>;
}

interface TechnologyQueryResult {
  id: string;
  analysis_id: string;
  name: string;
  category: string;
  version: string | null;
  authenticity: string;
  confidence_score: number;
  risk_score: number | null;
  license_type: string | null;
  manual_note: string | null;
  manually_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  is_outdated: boolean;
  is_deprecated: boolean;
  has_security_issues: boolean;
  source_document_id: string | null;
  source_excerpt: string | null;
  security_details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  document?: Array<{
    filename: string;
    document_type: string;
    storage_path: string;
  }>;
}

interface FindingQueryResult {
  id: string;
  analysis_id: string;
  finding_type: string;
  severity: string;
  title: string;
  description: string;
  technology_ids: string[];
  impact_score: number | null;
  recommendation: string | null;
  metadata: Record<string, unknown>;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * TechStackRepository - CRUD operations for tech stack analyses
 */
export class TechStackRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  // ============================================================================
  // ANALYSIS CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new tech stack analysis
   */
  async createAnalysis(
    request: CreateTechStackAnalysisRequest,
    userId: string
  ): Promise<TechStackAnalysis> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_analyses')
        .insert({
          data_room_id: request.data_room_id,
          created_by: userId,
          title: request.title,
          description: request.description || null,
          tags: request.tags || [],
          metadata: request.metadata || {},
          status: 'pending' as TechAnalysisStatus,
          technologies_identified: 0,
          frontend_count: 0,
          backend_count: 0,
          database_count: 0,
          infrastructure_count: 0,
          ai_ml_count: 0,
          documents_analyzed: 0,
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to create tech stack analysis: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as TechStackAnalysis;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error creating tech stack analysis',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get a single analysis by ID
   */
  async getAnalysis(id: string): Promise<TechStackAnalysis> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_analyses')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        throw notFoundError('Tech stack analysis not found');
      }

      return data as TechStackAnalysis;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error fetching tech stack analysis',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get analysis with full details (technologies, findings summary, creator info)
   */
  async getAnalysisWithDetails(id: string): Promise<TechStackAnalysisWithDetails> {
    try {
      // Get base analysis
      const analysis = await this.getAnalysis(id);

      // Get creator info
      const { data: creator } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', analysis.created_by)
        .single();

      // Get technologies
      const { data: technologies } = await this.supabase
        .from('tech_stack_technologies')
        .select('*')
        .eq('analysis_id', id)
        .order('risk_score', { ascending: false, nullsFirst: false });

      // Get findings summary
      const { data: findingsSummary } = await this.supabase
        .from('tech_stack_findings')
        .select('severity, is_resolved')
        .eq('analysis_id', id);

      const critical_findings_count =
        findingsSummary?.filter((f) => f.severity === 'critical').length || 0;
      const high_findings_count =
        findingsSummary?.filter((f) => f.severity === 'high').length || 0;
      const medium_findings_count =
        findingsSummary?.filter((f) => f.severity === 'medium').length || 0;
      const low_findings_count =
        findingsSummary?.filter((f) => f.severity === 'low').length || 0;
      const resolved_findings_count =
        findingsSummary?.filter((f) => f.is_resolved).length || 0;
      const total_findings_count = findingsSummary?.length || 0;

      // Calculate category breakdown
      const technologies_by_category = [
        'frontend',
        'backend',
        'database',
        'infrastructure',
        'ml_ai',
        'devops',
        'security',
        'testing',
        'monitoring',
        'other',
      ].map((category) => {
        const categoryTechs = technologies?.filter((t) => t.category === category) || [];
        const avgRisk =
          categoryTechs.length > 0
            ? categoryTechs.reduce((sum, t) => sum + (t.risk_score || 0), 0) /
              categoryTechs.length
            : 0;
        return {
          category: category as TechStackTechnology['category'],
          count: categoryTechs.length,
          avg_risk_score: Math.round(avgRisk),
        };
      });

      // Calculate AI breakdown
      const aiTechnologies = technologies?.filter((t) => t.category === 'ml_ai') || [];
      const ai_breakdown =
        aiTechnologies.length > 0
          ? {
              proprietary: aiTechnologies.filter((t) => t.authenticity === 'proprietary')
                .length,
              wrapper: aiTechnologies.filter((t) => t.authenticity === 'wrapper').length,
              hybrid: aiTechnologies.filter((t) => t.authenticity === 'hybrid').length,
              third_party: aiTechnologies.filter((t) => t.authenticity === 'third_party')
                .length,
              unknown: aiTechnologies.filter((t) => t.authenticity === 'unknown').length,
            }
          : undefined;

      return {
        ...analysis,
        creator_name: creator?.full_name || 'Unknown',
        creator_email: creator?.email || '',
        technologies: (technologies || []) as TechStackTechnology[],
        critical_findings_count,
        high_findings_count,
        medium_findings_count,
        low_findings_count,
        resolved_findings_count,
        total_findings_count,
        technologies_by_category,
        ai_breakdown,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error fetching tech stack analysis details',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * List analyses with filters
   */
  async listAnalyses(filter: TechStackAnalysisFilter): Promise<{
    analyses: TechStackAnalysisListItem[];
    total: number;
  }> {
    try {
      let query = this.supabase
        .from('tech_stack_analyses')
        .select(
          `
          *,
          creator:profiles!tech_stack_analyses_created_by_fkey(full_name),
          findings:tech_stack_findings(severity)
        `,
          { count: 'exact' }
        )
        .eq('data_room_id', filter.data_room_id)
        .is('deleted_at', null);

      // Apply filters
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      if (filter.risk_level) {
        query = query.eq('risk_level', filter.risk_level);
      }
      if (filter.modernization_score_min !== undefined) {
        query = query.gte('modernization_score', filter.modernization_score_min);
      }
      if (filter.modernization_score_max !== undefined) {
        query = query.lte('modernization_score', filter.modernization_score_max);
      }
      if (filter.ai_authenticity_score_min !== undefined) {
        query = query.gte('ai_authenticity_score', filter.ai_authenticity_score_min);
      }
      if (filter.ai_authenticity_score_max !== undefined) {
        query = query.lte('ai_authenticity_score', filter.ai_authenticity_score_max);
      }
      if (filter.tags && filter.tags.length > 0) {
        query = query.overlaps('tags', filter.tags);
      }
      if (filter.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
      }

      // Pagination
      const limit = filter.limit || 20;
      const offset = filter.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Sort by most recent
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new DataRoomError(
          `Failed to list tech stack analyses: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      const analyses: TechStackAnalysisListItem[] = (data || []).map((item: AnalysisQueryResult) => {
        const criticalCount = item.findings?.filter((f) => f.severity === 'critical').length || 0;
        return {
          id: item.id,
          title: item.title,
          status: item.status,
          risk_level: item.risk_level,
          technologies_identified: item.technologies_identified,
          modernization_score: item.modernization_score,
          ai_authenticity_score: item.ai_authenticity_score,
          technical_debt_score: item.technical_debt_score,
          critical_findings_count: criticalCount,
          created_by: item.created_by,
          creator_name: item.creator?.[0]?.full_name || 'Unknown',
          created_at: item.created_at,
          updated_at: item.updated_at,
          last_analyzed_at: item.last_analyzed_at,
        };
      });

      return {
        analyses,
        total: count || 0,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error listing tech stack analyses',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Update an analysis
   */
  async updateAnalysis(
    id: string,
    request: UpdateTechStackAnalysisRequest
  ): Promise<TechStackAnalysis> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_analyses')
        .update({
          title: request.title,
          description: request.description,
          tags: request.tags,
          metadata: request.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error || !data) {
        throw notFoundError('Tech stack analysis not found');
      }

      return data as TechStackAnalysis;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error updating tech stack analysis',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Update analysis status
   */
  async updateAnalysisStatus(
    id: string,
    status: TechAnalysisStatus,
    errorMessage?: string
  ): Promise<TechStackAnalysis> {
    try {
      const updateData: Record<string, string> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.last_analyzed_at = new Date().toISOString();
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { data, error } = await this.supabase
        .from('tech_stack_analyses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        throw notFoundError('Tech stack analysis not found');
      }

      return data as TechStackAnalysis;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error updating analysis status',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Soft delete an analysis
   */
  async deleteAnalysis(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tech_stack_analyses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);

      if (error) {
        throw new DataRoomError(
          `Failed to delete tech stack analysis: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error deleting tech stack analysis',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  // ============================================================================
  // TECHNOLOGY CRUD OPERATIONS
  // ============================================================================

  /**
   * Add a technology (manually or from AI)
   */
  async addTechnology(
    request: AddTechnologyManuallyRequest,
    userId?: string
  ): Promise<TechStackTechnology> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_technologies')
        .insert({
          analysis_id: request.analysis_id,
          name: request.name,
          category: request.category,
          version: request.version || null,
          authenticity: request.authenticity || 'unknown',
          confidence_score: request.confidence_score,
          risk_score: request.risk_score || null,
          license_type: request.license_type || null,
          manual_note: request.manual_note || null,
          manually_verified: !!userId,
          verified_by: userId || null,
          verified_at: userId ? new Date().toISOString() : null,
          is_outdated: false,
          is_deprecated: false,
          has_security_issues: false,
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to add technology: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as TechStackTechnology;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error adding technology',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get a single technology by ID
   */
  async getTechnology(id: string): Promise<TechStackTechnology> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_technologies')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw notFoundError('Technology not found');
      }

      return data as TechStackTechnology;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error fetching technology',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * List technologies with filters
   */
  async listTechnologies(
    filter: TechStackTechnologyFilter
  ): Promise<{ technologies: TechStackTechnologyWithSource[]; total: number }> {
    try {
      let query = this.supabase
        .from('tech_stack_technologies')
        .select(
          `
          *,
          document:documents!tech_stack_technologies_source_document_id_fkey(
            filename,
            document_type,
            storage_path
          )
        `,
          { count: 'exact' }
        )
        .eq('analysis_id', filter.analysis_id);

      // Apply filters
      if (filter.category) {
        query = query.eq('category', filter.category);
      }
      if (filter.authenticity) {
        query = query.eq('authenticity', filter.authenticity);
      }
      if (filter.risk_score_min !== undefined) {
        query = query.gte('risk_score', filter.risk_score_min);
      }
      if (filter.risk_score_max !== undefined) {
        query = query.lte('risk_score', filter.risk_score_max);
      }
      if (filter.is_outdated !== undefined) {
        query = query.eq('is_outdated', filter.is_outdated);
      }
      if (filter.is_deprecated !== undefined) {
        query = query.eq('is_deprecated', filter.is_deprecated);
      }
      if (filter.has_security_issues !== undefined) {
        query = query.eq('has_security_issues', filter.has_security_issues);
      }
      if (filter.manually_verified !== undefined) {
        query = query.eq('manually_verified', filter.manually_verified);
      }
      if (filter.search) {
        query = query.ilike('name', `%${filter.search}%`);
      }

      // Pagination
      const limit = filter.limit || 50;
      const offset = filter.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Sort by risk score (high to low), then by name
      query = query.order('risk_score', { ascending: false, nullsFirst: false });
      query = query.order('name', { ascending: true });

      const { data, error, count } = await query;

      if (error) {
        throw new DataRoomError(
          `Failed to list technologies: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      const technologies: TechStackTechnologyWithSource[] = (data || []).map((item: TechnologyQueryResult) => ({
        ...item,
        document_filename: item.document?.[0]?.filename || null,
        document_type: item.document?.[0]?.document_type || null,
        document_storage_path: item.document?.[0]?.storage_path || null,
      } as TechStackTechnologyWithSource));

      return {
        technologies,
        total: count || 0,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error listing technologies',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Update a technology
   */
  async updateTechnology(
    id: string,
    request: UpdateTechnologyRequest
  ): Promise<TechStackTechnology> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_technologies')
        .update({
          version: request.version,
          authenticity: request.authenticity,
          risk_score: request.risk_score,
          license_type: request.license_type,
          has_security_issues: request.has_security_issues,
          security_details: request.security_details,
          manual_note: request.manual_note,
          manually_verified: request.manually_verified,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        throw notFoundError('Technology not found');
      }

      return data as TechStackTechnology;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error updating technology',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Verify a technology
   */
  async verifyTechnology(
    id: string,
    request: VerifyTechnologyRequest,
    userId: string
  ): Promise<TechStackTechnology> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_technologies')
        .update({
          manually_verified: request.verified,
          verified_by: request.verified ? userId : null,
          verified_at: request.verified ? new Date().toISOString() : null,
          manual_note: request.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        throw notFoundError('Technology not found');
      }

      return data as TechStackTechnology;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error verifying technology',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Delete a technology
   */
  async deleteTechnology(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tech_stack_technologies')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DataRoomError(
          `Failed to delete technology: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error deleting technology',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  // ============================================================================
  // FINDING CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a finding
   */
  async createFinding(request: CreateFindingRequest): Promise<TechStackFinding> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_findings')
        .insert({
          analysis_id: request.analysis_id,
          finding_type: request.finding_type,
          severity: request.severity,
          title: request.title,
          description: request.description,
          technology_ids: request.technology_ids || [],
          impact_score: request.impact_score || null,
          recommendation: request.recommendation || null,
          metadata: request.metadata || {},
          is_resolved: false,
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to create finding: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as TechStackFinding;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error creating finding',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * List findings with filters
   */
  async listFindings(
    filter: TechStackFindingFilter
  ): Promise<{ findings: TechStackFindingWithTechnologies[]; total: number }> {
    try {
      let query = this.supabase
        .from('tech_stack_findings')
        .select('*', { count: 'exact' })
        .eq('analysis_id', filter.analysis_id);

      // Apply filters
      if (filter.finding_type) {
        query = query.eq('finding_type', filter.finding_type);
      }
      if (filter.severity) {
        query = query.eq('severity', filter.severity);
      }
      if (filter.is_resolved !== undefined) {
        query = query.eq('is_resolved', filter.is_resolved);
      }

      // Pagination
      const limit = filter.limit || 50;
      const offset = filter.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Sort by severity, then created_at
      query = query.order('severity', { ascending: true });
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new DataRoomError(
          `Failed to list findings: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      // Enrich with technology info
      const findings: TechStackFindingWithTechnologies[] = await Promise.all(
        (data || []).map(async (finding: FindingQueryResult) => {
          if (finding.technology_ids && finding.technology_ids.length > 0) {
            const { data: techs } = await this.supabase
              .from('tech_stack_technologies')
              .select('id, name, category, version')
              .in('id', finding.technology_ids);

            return {
              ...finding,
              technologies: techs || [],
            } as TechStackFindingWithTechnologies;
          }
          return {
            ...finding,
            technologies: [],
          } as TechStackFindingWithTechnologies;
        })
      );

      return {
        findings,
        total: count || 0,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error listing findings',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Resolve a finding
   */
  async resolveFinding(
    id: string,
    request: ResolveFindingRequest,
    userId: string
  ): Promise<TechStackFinding> {
    try {
      const { data, error } = await this.supabase
        .from('tech_stack_findings')
        .update({
          is_resolved: true,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
          resolution_notes: request.resolution_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        throw notFoundError('Finding not found');
      }

      return data as TechStackFinding;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error resolving finding',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Delete a finding
   */
  async deleteFinding(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tech_stack_findings')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DataRoomError(
          `Failed to delete finding: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error deleting finding',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  // ============================================================================
  // SUMMARY & ANALYTICS
  // ============================================================================

  /**
   * Get tech stack summary for a data room
   */
  async getTechStackSummary(dataRoomId: string): Promise<TechStackSummary> {
    try {
      // Get all analyses for this data room
      const { data: analyses } = await this.supabase
        .from('tech_stack_analyses')
        .select(
          `
          *,
          creator:profiles!tech_stack_analyses_created_by_fkey(full_name),
          findings:tech_stack_findings(severity)
        `
        )
        .eq('data_room_id', dataRoomId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const total_analyses = analyses?.length || 0;
      const completed_analyses =
        analyses?.filter((a: AnalysisQueryResult) => a.status === 'completed').length || 0;
      const analyzing_count =
        analyses?.filter((a: AnalysisQueryResult) => a.status === 'analyzing').length || 0;
      const failed_count =
        analyses?.filter((a: AnalysisQueryResult) => a.status === 'failed').length || 0;

      // Calculate averages
      const completedAnalyses = analyses?.filter((a: AnalysisQueryResult) => a.status === 'completed') || [];
      const avg_modernization_score =
        completedAnalyses.length > 0
          ? Math.round(
              completedAnalyses.reduce(
                (sum: number, a: AnalysisQueryResult) => sum + (a.modernization_score || 0),
                0
              ) / completedAnalyses.length
            )
          : 0;

      const avg_ai_authenticity_score =
        completedAnalyses.length > 0
          ? Math.round(
              completedAnalyses.reduce(
                (sum: number, a: AnalysisQueryResult) => sum + (a.ai_authenticity_score || 0),
                0
              ) / completedAnalyses.length
            )
          : 0;

      const avg_technical_debt_score =
        completedAnalyses.length > 0
          ? Math.round(
              completedAnalyses.reduce(
                (sum: number, a: AnalysisQueryResult) => sum + (a.technical_debt_score || 0),
                0
              ) / completedAnalyses.length
            )
          : 0;

      // Sum technologies
      const total_technologies = completedAnalyses.reduce(
        (sum: number, a: AnalysisQueryResult) => sum + (a.technologies_identified || 0),
        0
      );

      // Count findings
      const allFindings = analyses?.flatMap((a: AnalysisQueryResult) => a.findings || []) || [];
      const total_critical_findings = allFindings.filter((f) => f.severity === 'critical').length;
      const total_high_findings = allFindings.filter((f) => f.severity === 'high').length;

      // Risk distribution
      const risk_distribution = {
        low: analyses?.filter((a: AnalysisQueryResult) => a.risk_level === 'low').length || 0,
        medium: analyses?.filter((a: AnalysisQueryResult) => a.risk_level === 'medium').length || 0,
        high: analyses?.filter((a: AnalysisQueryResult) => a.risk_level === 'high').length || 0,
        critical: analyses?.filter((a: AnalysisQueryResult) => a.risk_level === 'critical').length || 0,
      };

      // Recent analyses (top 5)
      const recent_analyses: TechStackAnalysisListItem[] = (analyses || [])
        .slice(0, 5)
        .map((item: AnalysisQueryResult) => {
          const criticalCount =
            item.findings?.filter((f) => f.severity === 'critical').length || 0;
          return {
            id: item.id,
            title: item.title,
            status: item.status,
            risk_level: item.risk_level,
            technologies_identified: item.technologies_identified,
            modernization_score: item.modernization_score,
            ai_authenticity_score: item.ai_authenticity_score,
            technical_debt_score: item.technical_debt_score,
            critical_findings_count: criticalCount,
            created_by: item.created_by,
            creator_name: item.creator?.[0]?.full_name || 'Unknown',
            created_at: item.created_at,
            updated_at: item.updated_at,
            last_analyzed_at: item.last_analyzed_at,
          };
        });

      return {
        total_analyses,
        completed_analyses,
        analyzing_count,
        failed_count,
        avg_modernization_score,
        avg_ai_authenticity_score,
        avg_technical_debt_score,
        total_technologies,
        total_critical_findings,
        total_high_findings,
        risk_distribution,
        recent_analyses,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error getting tech stack summary',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }
}
