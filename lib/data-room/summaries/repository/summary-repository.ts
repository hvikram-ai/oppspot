/**
 * Summary Repository - Database operations for summaries
 *
 * Handles all CRUD operations for:
 * - summary_templates
 * - summary_fields
 * - summary_runs
 * - document_summaries
 * - summary_field_values
 * - summary_quality_issues
 */

import { createClient } from '@/lib/supabase/server';
import type {
  SummaryTemplate,
  SummaryField,
  SummaryRun,
  DocumentSummary,
  SummaryFieldValue,
  SummaryQualityIssue,
  RunStatus,
  RunDetails,
  SummaryWithFields,
} from '../types';

export class SummaryRepository {
  /**
   * Get all active templates (system + org templates)
   */
  async getActiveTemplates(orgId?: string | null): Promise<SummaryTemplate[]> {
    const supabase = await createClient();

    let query = supabase
      .from('summary_templates')
      .select('*')
      .eq('active', true);

    // Include system templates (org_id IS NULL) + org-specific templates
    if (orgId) {
      query = query.or(`org_id.is.null,org_id.eq.${orgId}`);
    } else {
      query = query.is('org_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get templates: ${error.message}`);
    return data || [];
  }

  /**
   * Get template by key
   */
  async getTemplateByKey(key: string, orgId?: string | null): Promise<SummaryTemplate | null> {
    const supabase = await createClient();

    let query = supabase
      .from('summary_templates')
      .select('*')
      .eq('key', key)
      .eq('active', true);

    if (orgId) {
      query = query.or(`org_id.is.null,org_id.eq.${orgId}`);
    } else {
      query = query.is('org_id', null);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get template: ${error.message}`);
    }

    return data;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<SummaryTemplate | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('summary_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get template: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all fields for a template
   */
  async getTemplateFields(templateId: string): Promise<SummaryField[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('summary_fields')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true });

    if (error) throw new Error(`Failed to get template fields: ${error.message}`);
    return data || [];
  }

  /**
   * Create a new summary run
   */
  async createRun(
    documentId: string,
    templateId: string,
    createdBy?: string
  ): Promise<SummaryRun> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('summary_runs')
      .insert({
        document_id: documentId,
        template_id: templateId,
        status: 'queued',
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create run: ${error.message}`);
    return data;
  }

  /**
   * Update run status
   */
  async updateRunStatus(
    runId: string,
    status: RunStatus,
    details?: Partial<{
      coverage: number;
      avg_confidence: number;
      quality_pass: boolean;
      finished_at: string;
      duration_ms: number;
      details: RunDetails;
    }>
  ): Promise<void> {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = { status };

    if (details?.coverage !== undefined) updateData.coverage = details.coverage;
    if (details?.avg_confidence !== undefined) updateData.avg_confidence = details.avg_confidence;
    if (details?.quality_pass !== undefined) updateData.quality_pass = details.quality_pass;
    if (details?.finished_at) updateData.finished_at = details.finished_at;
    if (details?.duration_ms !== undefined) updateData.duration_ms = details.duration_ms;
    if (details?.details) updateData.details = details.details;

    const { error } = await supabase
      .from('summary_runs')
      .update(updateData)
      .eq('id', runId);

    if (error) throw new Error(`Failed to update run: ${error.message}`);
  }

  /**
   * Get run by ID
   */
  async getRun(runId: string): Promise<SummaryRun | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('summary_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get run: ${error.message}`);
    }

    return data;
  }

  /**
   * Get latest run for a document
   */
  async getLatestRun(documentId: string, templateId?: string): Promise<SummaryRun | null> {
    const supabase = await createClient();

    let query = supabase
      .from('summary_runs')
      .select('*')
      .eq('document_id', documentId)
      .order('started_at', { ascending: false })
      .limit(1);

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get latest run: ${error.message}`);
    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * Create document summary
   */
  async createSummary(
    runId: string,
    documentId: string,
    templateId: string,
    coverage: number,
    avgConfidence: number,
    qualityPass: boolean
  ): Promise<DocumentSummary> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('document_summaries')
      .insert({
        run_id: runId,
        document_id: documentId,
        template_id: templateId,
        coverage,
        avg_confidence: avgConfidence,
        quality_pass: qualityPass,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create summary: ${error.message}`);
    return data;
  }

  /**
   * Get summary for a document
   */
  async getSummary(documentId: string, templateId?: string): Promise<DocumentSummary | null> {
    const supabase = await createClient();

    let query = supabase
      .from('document_summaries')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get summary: ${error.message}`);
    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * Get summary with all related data (template, fields, values, issues)
   */
  async getSummaryWithFields(summaryId: string): Promise<SummaryWithFields | null> {
    const supabase = await createClient();

    // Get summary
    const { data: summary, error: summaryError } = await supabase
      .from('document_summaries')
      .select('*')
      .eq('id', summaryId)
      .single();

    if (summaryError) {
      if (summaryError.code === 'PGRST116') return null;
      throw new Error(`Failed to get summary: ${summaryError.message}`);
    }

    // Get template
    const template = await this.getTemplateById(summary.template_id);
    if (!template) throw new Error('Template not found');

    // Get fields
    const fields = await this.getTemplateFields(summary.template_id);

    // Get field values
    const { data: values, error: valuesError } = await supabase
      .from('summary_field_values')
      .select('*')
      .eq('summary_id', summaryId);

    if (valuesError) throw new Error(`Failed to get field values: ${valuesError.message}`);

    // Get quality issues
    const { data: issues, error: issuesError } = await supabase
      .from('summary_quality_issues')
      .select('*')
      .eq('run_id', summary.run_id);

    if (issuesError) throw new Error(`Failed to get quality issues: ${issuesError.message}`);

    // Combine data
    const fieldsWithValues = fields.map((field) => ({
      field,
      value: (values || []).find((v) => v.field_id === field.id) || null,
    }));

    return {
      ...summary,
      template,
      fields: fieldsWithValues,
      qualityIssues: issues || [],
    };
  }

  /**
   * Insert field values (batch)
   */
  async insertFieldValues(
    summaryId: string,
    values: Omit<SummaryFieldValue, 'id' | 'summary_id' | 'created_at'>[]
  ): Promise<SummaryFieldValue[]> {
    const supabase = await createClient();

    const insertData = values.map((v) => ({
      summary_id: summaryId,
      field_id: v.field_id,
      value_json: v.value_json,
      raw_value: v.raw_value,
      confidence: v.confidence,
      evidence: v.evidence,
      page_number: v.page_number,
      chunk_index: v.chunk_index,
      start_char: v.start_char,
      end_char: v.end_char,
      extraction_method: v.extraction_method,
    }));

    const { data, error } = await supabase
      .from('summary_field_values')
      .insert(insertData)
      .select();

    if (error) throw new Error(`Failed to insert field values: ${error.message}`);
    return data || [];
  }

  /**
   * Insert quality issues (batch)
   */
  async insertQualityIssues(
    runId: string,
    issues: Omit<SummaryQualityIssue, 'id' | 'run_id' | 'created_at'>[]
  ): Promise<SummaryQualityIssue[]> {
    if (issues.length === 0) return [];

    const supabase = await createClient();

    const insertData = issues.map((issue) => ({
      run_id: runId,
      field_key: issue.field_key,
      issue: issue.issue,
      severity: issue.severity,
      context: issue.context,
      remediation: issue.remediation,
    }));

    const { data, error } = await supabase
      .from('summary_quality_issues')
      .insert(insertData)
      .select();

    if (error) throw new Error(`Failed to insert quality issues: ${error.message}`);
    return data || [];
  }

  /**
   * Get quality issues for a run
   */
  async getQualityIssues(runId: string): Promise<SummaryQualityIssue[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('summary_quality_issues')
      .select('*')
      .eq('run_id', runId)
      .order('severity', { ascending: false });

    if (error) throw new Error(`Failed to get quality issues: ${error.message}`);
    return data || [];
  }

  /**
   * Calculate and update summary metrics using database function
   */
  async calculateMetrics(summaryId: string): Promise<{
    coverage: number;
    avg_confidence: number;
    quality_pass: boolean;
  }> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('calculate_summary_metrics', {
      summary_id_param: summaryId,
    });

    if (error) throw new Error(`Failed to calculate metrics: ${error.message}`);

    if (!data || data.length === 0) {
      throw new Error('No metrics returned from calculation');
    }

    return {
      coverage: data[0].coverage,
      avg_confidence: data[0].avg_confidence,
      quality_pass: data[0].quality_pass,
    };
  }

  /**
   * Delete summary and all related data
   */
  async deleteSummary(summaryId: string): Promise<void> {
    const supabase = await createClient();

    // Cascading delete will handle field_values
    const { error } = await supabase
      .from('document_summaries')
      .delete()
      .eq('id', summaryId);

    if (error) throw new Error(`Failed to delete summary: ${error.message}`);
  }

  /**
   * Get all runs for a document (with pagination)
   */
  async getDocumentRuns(
    documentId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<SummaryRun[]> {
    const supabase = await createClient();
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    const { data, error } = await supabase
      .from('summary_runs')
      .select('*')
      .eq('document_id', documentId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to get document runs: ${error.message}`);
    return data || [];
  }
}

/**
 * Singleton instance
 */
let repositoryInstance: SummaryRepository | null = null;

/**
 * Get or create repository instance
 */
export function getSummaryRepository(): SummaryRepository {
  if (!repositoryInstance) {
    repositoryInstance = new SummaryRepository();
  }
  return repositoryInstance;
}
