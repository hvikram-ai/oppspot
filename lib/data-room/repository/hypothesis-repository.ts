/**
 * Hypothesis Repository
 * Database operations for deal hypothesis tracking with RLS support
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  Hypothesis,
  HypothesisEvidence,
  HypothesisMetric,
  HypothesisValidation,
  HypothesisWithDetails,
  HypothesisListItem,
  EvidenceWithDocument,
  CreateHypothesisRequest,
  UpdateHypothesisRequest,
  LinkEvidenceRequest,
  CreateMetricRequest,
  UpdateMetricRequest,
  CreateValidationRequest,
  HypothesisStatus,
  HypothesisType,
} from '../types';
import {
  DataRoomError,
  DataRoomErrorCode,
  notFoundError,
  validationError,
} from '../utils/error-handler';

export interface HypothesisFilter {
  status?: HypothesisStatus;
  hypothesis_type?: HypothesisType;
  confidence_min?: number;
  confidence_max?: number;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * HypothesisRepository - CRUD operations for hypotheses
 */
export class HypothesisRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Create a new hypothesis
   */
  async createHypothesis(request: CreateHypothesisRequest, userId: string): Promise<Hypothesis> {
    try {
      const { data, error } = await this.supabase
        .from('hypotheses')
        .insert({
          data_room_id: request.data_room_id,
          created_by: userId,
          title: request.title,
          description: request.description,
          hypothesis_type: request.hypothesis_type,
          tags: request.tags || [],
          metadata: request.metadata || {},
          status: 'draft',
          confidence_score: null,
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to create hypothesis: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as Hypothesis;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Unexpected error creating hypothesis',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get a single hypothesis by ID
   */
  async getHypothesis(id: string): Promise<Hypothesis> {
    try {
      const { data, error } = await this.supabase
        .from('hypotheses')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        throw notFoundError('Hypothesis');
      }

      return data as Hypothesis;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw notFoundError('Hypothesis');
    }
  }

  /**
   * Get hypothesis with all related details
   */
  async getHypothesisWithDetails(id: string): Promise<HypothesisWithDetails> {
    try {
      // Get hypothesis
      const hypothesis = await this.getHypothesis(id);

      // Get evidence
      const { data: evidence } = await this.supabase
        .from('hypothesis_evidence')
        .select('*')
        .eq('hypothesis_id', id)
        .order('created_at', { ascending: false });

      // Get metrics
      const { data: metrics } = await this.supabase
        .from('hypothesis_metrics')
        .select('*')
        .eq('hypothesis_id', id)
        .order('created_at', { ascending: false });

      // Get validations
      const { data: validations } = await this.supabase
        .from('hypothesis_validations')
        .select('*')
        .eq('hypothesis_id', id)
        .order('created_at', { ascending: false });

      // Get creator info
      const { data: creator } = await this.supabase
        .from('profiles')
        .select('name, email')
        .eq('id', hypothesis.created_by)
        .single();

      // Calculate derived stats
      const avgRelevanceScore =
        evidence && evidence.length > 0
          ? evidence.reduce((sum, e) => sum + (e.relevance_score || 0), 0) / evidence.length
          : null;

      const metricsCompletionRate =
        metrics && metrics.length > 0
          ? (metrics.filter((m) => m.status === 'met').length / metrics.length) * 100
          : 0;

      return {
        ...hypothesis,
        evidence: (evidence as HypothesisEvidence[]) || [],
        metrics: (metrics as HypothesisMetric[]) || [],
        validations: (validations as HypothesisValidation[]) || [],
        creator_name: creator?.name || 'Unknown',
        creator_email: creator?.email || '',
        avg_relevance_score: avgRelevanceScore,
        metrics_completion_rate: metricsCompletionRate,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to fetch hypothesis details',
        DataRoomErrorCode.DATABASE_ERROR,
        500
      );
    }
  }

  /**
   * List hypotheses in a data room with filters
   */
  async listHypotheses(
    dataRoomId: string,
    filters: HypothesisFilter = {}
  ): Promise<HypothesisListItem[]> {
    try {
      let query = this.supabase
        .from('hypotheses')
        .select(
          `
          id,
          title,
          hypothesis_type,
          status,
          confidence_score,
          evidence_count,
          supporting_evidence_count,
          contradicting_evidence_count,
          metrics_count,
          metrics_met_count,
          created_by,
          created_at,
          updated_at,
          profiles!hypotheses_created_by_fkey(name)
        `
        )
        .eq('data_room_id', dataRoomId)
        .is('deleted_at', null);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.hypothesis_type) {
        query = query.eq('hypothesis_type', filters.hypothesis_type);
      }

      if (filters.confidence_min !== undefined) {
        query = query.gte('confidence_score', filters.confidence_min);
      }

      if (filters.confidence_max !== undefined) {
        query = query.lte('confidence_score', filters.confidence_max);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Order by updated_at desc
      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new DataRoomError(
          `Failed to list hypotheses: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      // Transform data to include creator_name
      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        hypothesis_type: row.hypothesis_type,
        status: row.status,
        confidence_score: row.confidence_score,
        evidence_count: row.evidence_count,
        supporting_evidence_count: row.supporting_evidence_count,
        contradicting_evidence_count: row.contradicting_evidence_count,
        metrics_count: row.metrics_count,
        metrics_met_count: row.metrics_met_count,
        created_by: row.created_by,
        creator_name: row.profiles?.name || 'Unknown',
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to list hypotheses',
        DataRoomErrorCode.DATABASE_ERROR,
        500
      );
    }
  }

  /**
   * Update a hypothesis
   */
  async updateHypothesis(id: string, updates: UpdateHypothesisRequest): Promise<Hypothesis> {
    try {
      const { data, error } = await this.supabase
        .from('hypotheses')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        throw new DataRoomError(
          `Failed to update hypothesis: ${error?.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as Hypothesis;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to update hypothesis',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Soft delete a hypothesis
   */
  async deleteHypothesis(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('hypotheses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new DataRoomError(
          `Failed to delete hypothesis: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to delete hypothesis',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Recalculate and update hypothesis confidence score
   */
  async updateConfidenceScore(hypothesisId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('calculate_hypothesis_confidence', {
        p_hypothesis_id: hypothesisId,
      });

      if (error) {
        throw new DataRoomError(
          `Failed to calculate confidence: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      const confidenceScore = data as number;

      // Update the hypothesis with new confidence score
      await this.supabase
        .from('hypotheses')
        .update({ confidence_score: confidenceScore })
        .eq('id', hypothesisId);

      return confidenceScore;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to update confidence score',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  // ============================================================================
  // EVIDENCE OPERATIONS
  // ============================================================================

  /**
   * Link evidence to a hypothesis
   */
  async linkEvidence(request: LinkEvidenceRequest, userId: string): Promise<HypothesisEvidence> {
    try {
      const { data, error } = await this.supabase
        .from('hypothesis_evidence')
        .insert({
          hypothesis_id: request.hypothesis_id,
          document_id: request.document_id,
          evidence_type: request.evidence_type,
          excerpt_text: request.excerpt_text,
          page_number: request.page_number,
          manual_note: request.manual_note,
          manually_verified: false,
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to link evidence: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as HypothesisEvidence;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to link evidence',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get all evidence for a hypothesis
   */
  async getEvidence(hypothesisId: string): Promise<EvidenceWithDocument[]> {
    try {
      const { data, error } = await this.supabase
        .from('hypothesis_evidence')
        .select(
          `
          *,
          documents!hypothesis_evidence_document_id_fkey(
            filename,
            document_type,
            storage_path
          )
        `
        )
        .eq('hypothesis_id', hypothesisId)
        .order('relevance_score', { ascending: false, nullsFirst: false });

      if (error) {
        throw new DataRoomError(
          `Failed to fetch evidence: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return (data || []).map((row: any) => ({
        ...row,
        document_filename: row.documents?.filename || 'Unknown',
        document_type: row.documents?.document_type || 'other',
        document_storage_path: row.documents?.storage_path || '',
      }));
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError('Failed to fetch evidence', DataRoomErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Update evidence
   */
  async updateEvidence(
    evidenceId: string,
    updates: Partial<HypothesisEvidence>
  ): Promise<HypothesisEvidence> {
    try {
      const { data, error } = await this.supabase
        .from('hypothesis_evidence')
        .update(updates)
        .eq('id', evidenceId)
        .select()
        .single();

      if (error || !data) {
        throw new DataRoomError(
          `Failed to update evidence: ${error?.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as HypothesisEvidence;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError('Failed to update evidence', DataRoomErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(evidenceId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('hypothesis_evidence')
        .delete()
        .eq('id', evidenceId);

      if (error) {
        throw new DataRoomError(
          `Failed to delete evidence: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError('Failed to delete evidence', DataRoomErrorCode.INTERNAL_ERROR, 500);
    }
  }

  // ============================================================================
  // METRICS OPERATIONS
  // ============================================================================

  /**
   * Add a metric to a hypothesis
   */
  async addMetric(request: CreateMetricRequest): Promise<HypothesisMetric> {
    try {
      const { data, error } = await this.supabase
        .from('hypothesis_metrics')
        .insert({
          hypothesis_id: request.hypothesis_id,
          metric_name: request.metric_name,
          description: request.description,
          target_value: request.target_value,
          actual_value: request.actual_value,
          unit: request.unit,
          source_document_id: request.source_document_id,
          status: 'not_tested',
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to add metric: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as HypothesisMetric;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError('Failed to add metric', DataRoomErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Get all metrics for a hypothesis
   */
  async getMetrics(hypothesisId: string): Promise<HypothesisMetric[]> {
    try {
      const { data, error } = await this.supabase
        .from('hypothesis_metrics')
        .select('*')
        .eq('hypothesis_id', hypothesisId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new DataRoomError(
          `Failed to fetch metrics: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return (data as HypothesisMetric[]) || [];
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError('Failed to fetch metrics', DataRoomErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Update a metric
   */
  async updateMetric(metricId: string, updates: UpdateMetricRequest): Promise<HypothesisMetric> {
    try {
      const { data, error } = await this.supabase
        .from('hypothesis_metrics')
        .update(updates)
        .eq('id', metricId)
        .select()
        .single();

      if (error || !data) {
        throw new DataRoomError(
          `Failed to update metric: ${error?.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as HypothesisMetric;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError('Failed to update metric', DataRoomErrorCode.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Delete a metric
   */
  async deleteMetric(metricId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('hypothesis_metrics')
        .delete()
        .eq('id', metricId);

      if (error) {
        throw new DataRoomError(
          `Failed to delete metric: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError('Failed to delete metric', DataRoomErrorCode.INTERNAL_ERROR, 500);
    }
  }

  // ============================================================================
  // VALIDATION OPERATIONS
  // ============================================================================

  /**
   * Record a validation for a hypothesis
   */
  async recordValidation(
    request: CreateValidationRequest,
    userId: string
  ): Promise<HypothesisValidation> {
    try {
      const { data, error } = await this.supabase
        .from('hypothesis_validations')
        .insert({
          hypothesis_id: request.hypothesis_id,
          validated_by: userId,
          validation_status: request.validation_status,
          notes: request.notes,
          confidence_adjustment: request.confidence_adjustment,
          evidence_summary: request.evidence_summary,
          key_findings: request.key_findings || [],
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to record validation: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      // Update hypothesis status based on validation
      let newStatus: HypothesisStatus = 'active';
      if (request.validation_status === 'pass') {
        newStatus = 'validated';
      } else if (request.validation_status === 'fail') {
        newStatus = 'invalidated';
      } else {
        newStatus = 'needs_revision';
      }

      await this.updateHypothesis(request.hypothesis_id, { status: newStatus });

      // Recalculate confidence score
      await this.updateConfidenceScore(request.hypothesis_id);

      return data as HypothesisValidation;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to record validation',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }

  /**
   * Get all validations for a hypothesis
   */
  async getValidations(hypothesisId: string): Promise<HypothesisValidation[]> {
    try {
      const { data, error } = await this.supabase
        .from('hypothesis_validations')
        .select('*')
        .eq('hypothesis_id', hypothesisId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new DataRoomError(
          `Failed to fetch validations: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return (data as HypothesisValidation[]) || [];
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to fetch validations',
        DataRoomErrorCode.INTERNAL_ERROR,
        500
      );
    }
  }
}
