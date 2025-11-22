/**
 * Valuation Repository
 *
 * Data access layer for SaaS valuation models
 * Handles all database operations with error handling and validation
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import type {
  ValuationModel,
  ValuationModelWithStats,
  ValuationComparable,
  ValuationScenario,
  ValuationExport,
  CreateValuationModelInput,
  UpdateValuationModelInput,
  CreateComparableInput,
  CreateScenarioInput,
  ListValuationsFilters,
} from '../types';
import { ValuationError, ValuationErrorCode } from '../types';

// ============================================================================
// VALUATION MODELS
// ============================================================================

/**
 * Create a new valuation model
 */
export async function createValuationModel(
  input: CreateValuationModelInput,
  userId: string
): Promise<ValuationModel> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('saas_valuation_models')
      .insert({
        data_room_id: input.data_room_id,
        created_by: userId,
        model_name: input.model_name,
        company_name: input.company_name,
        valuation_date: input.valuation_date || new Date().toISOString().split('T')[0],
        currency: input.currency || 'USD',
        fiscal_year_end: input.fiscal_year_end,
        arr: input.arr,
        mrr: input.mrr,
        revenue_growth_rate: input.revenue_growth_rate,
        gross_margin: input.gross_margin,
        net_revenue_retention: input.net_revenue_retention,
        cac_payback_months: input.cac_payback_months,
        burn_rate: input.burn_rate,
        runway_months: input.runway_months,
        ebitda: input.ebitda,
        employees: input.employees,
        valuation_method: input.valuation_method || 'revenue_multiple',
        source_documents: input.source_documents,
        extraction_method: input.extraction_method || 'manual',
        assumptions: input.assumptions,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return data as ValuationModel;
  } catch (error) {
    console.error('[ValuationRepository] Create failed:', error);
    throw new ValuationError(
      'Failed to create valuation model',
      ValuationErrorCode.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Get valuation model by ID
 */
export async function getValuationModelById(
  id: string
): Promise<ValuationModel | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('saas_valuation_models')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as ValuationModel;
  } catch (error) {
    console.error('[ValuationRepository] Get by ID failed:', error);
    throw new ValuationError(
      'Failed to retrieve valuation model',
      ValuationErrorCode.DATABASE_ERROR,
      { id, originalError: error }
    );
  }
}

/**
 * Get valuation model with aggregated statistics
 */
export async function getValuationModelWithStats(
  id: string
): Promise<ValuationModelWithStats | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('valuation_models_with_stats')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as ValuationModelWithStats;
  } catch (error) {
    console.error('[ValuationRepository] Get with stats failed:', error);
    throw new ValuationError(
      'Failed to retrieve valuation model with stats',
      ValuationErrorCode.DATABASE_ERROR,
      { id, originalError: error }
    );
  }
}

/**
 * List valuation models with filters
 */
export async function listValuationModels(
  filters: ListValuationsFilters = {}
): Promise<ValuationModelWithStats[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('valuation_models_with_stats')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.data_room_id) {
      query = query.eq('data_room_id', filters.data_room_id);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.valuation_method) {
      query = query.eq('valuation_method', filters.valuation_method);
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    if (filters.date_from) {
      query = query.gte('valuation_date', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('valuation_date', filters.date_to);
    }

    if (filters.search) {
      query = query.or(
        `company_name.ilike.%${filters.search}%,model_name.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ValuationModelWithStats[];
  } catch (error) {
    console.error('[ValuationRepository] List failed:', error);
    throw new ValuationError(
      'Failed to list valuation models',
      ValuationErrorCode.DATABASE_ERROR,
      { filters, originalError: error }
    );
  }
}

/**
 * Update valuation model
 */
export async function updateValuationModel(
  id: string,
  input: UpdateValuationModelInput
): Promise<ValuationModel> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('saas_valuation_models')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return data as ValuationModel;
  } catch (error) {
    console.error('[ValuationRepository] Update failed:', error);
    throw new ValuationError(
      'Failed to update valuation model',
      ValuationErrorCode.DATABASE_ERROR,
      { id, originalError: error }
    );
  }
}

/**
 * Update valuation model status
 */
export async function updateValuationStatus(
  id: string,
  status: ValuationModel['status'],
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('saas_valuation_models')
      .update({
        status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[ValuationRepository] Update status failed:', error);
    throw new ValuationError(
      'Failed to update valuation status',
      ValuationErrorCode.DATABASE_ERROR,
      { id, status, originalError: error }
    );
  }
}

/**
 * Update valuation calculation results
 */
export async function updateValuationResults(
  id: string,
  results: {
    revenue_multiple_low: number;
    revenue_multiple_mid: number;
    revenue_multiple_high: number;
    estimated_valuation_low: number;
    estimated_valuation_mid: number;
    estimated_valuation_high: number;
    valuation_confidence: number;
    data_quality_score: number;
    ai_insights?: unknown;
    ai_model?: string;
    ai_processing_time_ms?: number;
    calculation_details?: unknown;
  }
): Promise<ValuationModel> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('saas_valuation_models')
      .update({
        ...results,
        status: 'complete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ValuationModel;
  } catch (error) {
    console.error('[ValuationRepository] Update results failed:', error);
    throw new ValuationError(
      'Failed to update valuation results',
      ValuationErrorCode.DATABASE_ERROR,
      { id, originalError: error }
    );
  }
}

/**
 * Soft delete valuation model
 */
export async function deleteValuationModel(id: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('saas_valuation_models')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[ValuationRepository] Delete failed:', error);
    throw new ValuationError(
      'Failed to delete valuation model',
      ValuationErrorCode.DATABASE_ERROR,
      { id, originalError: error }
    );
  }
}

// ============================================================================
// COMPARABLES
// ============================================================================

/**
 * Create a comparable company
 */
export async function createComparable(
  input: CreateComparableInput
): Promise<ValuationComparable> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('valuation_comparables')
      .insert({
        valuation_model_id: input.valuation_model_id,
        company_name: input.company_name,
        ticker_symbol: input.ticker_symbol,
        industry: input.industry,
        geography: input.geography,
        company_stage: input.company_stage,
        arr: input.arr,
        revenue: input.revenue,
        revenue_growth_rate: input.revenue_growth_rate,
        gross_margin: input.gross_margin,
        ebitda_margin: input.ebitda_margin,
        employees: input.employees,
        revenue_multiple: input.revenue_multiple,
        market_cap: input.market_cap,
        valuation: input.valuation,
        valuation_date: input.valuation_date,
        source: input.source,
        source_url: input.source_url,
        source_document_id: input.source_document_id,
        data_quality_score: input.data_quality_score || 0.5,
        relevance_score: input.relevance_score || 0.5,
        weight: input.weight || 1.0,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ValuationComparable;
  } catch (error) {
    console.error('[ValuationRepository] Create comparable failed:', error);
    throw new ValuationError(
      'Failed to create comparable',
      ValuationErrorCode.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * List comparables for a valuation model
 */
export async function listComparables(
  valuationModelId: string
): Promise<ValuationComparable[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('valuation_comparables')
      .select('*')
      .eq('valuation_model_id', valuationModelId)
      .order('relevance_score', { ascending: false });

    if (error) throw error;
    return (data || []) as ValuationComparable[];
  } catch (error) {
    console.error('[ValuationRepository] List comparables failed:', error);
    throw new ValuationError(
      'Failed to list comparables',
      ValuationErrorCode.DATABASE_ERROR,
      { valuationModelId, originalError: error }
    );
  }
}

/**
 * Delete a comparable
 */
export async function deleteComparable(id: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('valuation_comparables')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[ValuationRepository] Delete comparable failed:', error);
    throw new ValuationError(
      'Failed to delete comparable',
      ValuationErrorCode.DATABASE_ERROR,
      { id, originalError: error }
    );
  }
}

// ============================================================================
// SCENARIOS
// ============================================================================

/**
 * Create a scenario
 */
export async function createScenario(
  input: CreateScenarioInput
): Promise<ValuationScenario> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('valuation_scenarios')
      .insert({
        valuation_model_id: input.valuation_model_id,
        scenario_name: input.scenario_name,
        scenario_type: input.scenario_type,
        description: input.description,
        assumptions: input.assumptions,
        probability: input.probability,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ValuationScenario;
  } catch (error) {
    console.error('[ValuationRepository] Create scenario failed:', error);
    throw new ValuationError(
      'Failed to create scenario',
      ValuationErrorCode.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * List scenarios for a valuation model
 */
export async function listScenarios(
  valuationModelId: string
): Promise<ValuationScenario[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('valuation_scenarios')
      .select('*')
      .eq('valuation_model_id', valuationModelId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as ValuationScenario[];
  } catch (error) {
    console.error('[ValuationRepository] List scenarios failed:', error);
    throw new ValuationError(
      'Failed to list scenarios',
      ValuationErrorCode.DATABASE_ERROR,
      { valuationModelId, originalError: error }
    );
  }
}

/**
 * Update scenario with calculated results
 */
export async function updateScenarioResults(
  id: string,
  results: {
    revenue_multiple: number;
    estimated_valuation: number;
    upside_downside?: number;
  }
): Promise<ValuationScenario> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('valuation_scenarios')
      .update({
        ...results,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ValuationScenario;
  } catch (error) {
    console.error('[ValuationRepository] Update scenario results failed:', error);
    throw new ValuationError(
      'Failed to update scenario results',
      ValuationErrorCode.DATABASE_ERROR,
      { id, originalError: error }
    );
  }
}

/**
 * Delete a scenario
 */
export async function deleteScenario(id: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('valuation_scenarios')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[ValuationRepository] Delete scenario failed:', error);
    throw new ValuationError(
      'Failed to delete scenario',
      ValuationErrorCode.DATABASE_ERROR,
      { id, originalError: error }
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Record an export for audit trail
 */
export async function recordExport(
  input: {
    valuation_model_id: string;
    export_format: ValuationExport['export_format'];
    file_name: string;
    storage_path?: string;
    file_size_bytes?: number;
    include_scenarios?: boolean;
    include_comparables?: boolean;
    include_methodology?: boolean;
    exported_by: string;
  }
): Promise<ValuationExport> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('valuation_exports')
      .insert({
        valuation_model_id: input.valuation_model_id,
        export_format: input.export_format,
        file_name: input.file_name,
        storage_path: input.storage_path,
        file_size_bytes: input.file_size_bytes,
        include_scenarios: input.include_scenarios ?? true,
        include_comparables: input.include_comparables ?? true,
        include_methodology: input.include_methodology ?? true,
        exported_by: input.exported_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ValuationExport;
  } catch (error) {
    console.error('[ValuationRepository] Record export failed:', error);
    throw new ValuationError(
      'Failed to record export',
      ValuationErrorCode.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * List exports for a valuation model
 */
export async function listExports(
  valuationModelId: string
): Promise<ValuationExport[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('valuation_exports')
      .select('*')
      .eq('valuation_model_id', valuationModelId)
      .order('exported_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ValuationExport[];
  } catch (error) {
    console.error('[ValuationRepository] List exports failed:', error);
    throw new ValuationError(
      'Failed to list exports',
      ValuationErrorCode.DATABASE_ERROR,
      { valuationModelId, originalError: error }
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user has access to valuation model
 */
export async function checkValuationAccess(
  valuationId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('saas_valuation_models')
      .select('data_room_id')
      .eq('id', valuationId)
      .single();

    if (error || !data) return false;

    // Check data room access
    const { data: accessData, error: accessError } = await supabase
      .from('data_room_access')
      .select('id')
      .eq('data_room_id', data.data_room_id)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .single();

    return !accessError && !!accessData;
  } catch (error) {
    console.error('[ValuationRepository] Check access failed:', error);
    return false;
  }
}

/**
 * Get permission level for valuation model
 */
export async function getValuationPermission(
  valuationId: string,
  userId: string
): Promise<'owner' | 'editor' | 'viewer' | 'commenter' | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('saas_valuation_models')
      .select('data_room_id')
      .eq('id', valuationId)
      .single();

    if (error || !data) return null;

    // Get data room permission
    const { data: accessData, error: accessError } = await supabase
      .from('data_room_access')
      .select('permission_level')
      .eq('data_room_id', data.data_room_id)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .single();

    if (accessError || !accessData) return null;

    return accessData.permission_level as 'owner' | 'editor' | 'viewer' | 'commenter';
  } catch (error) {
    console.error('[ValuationRepository] Get permission failed:', error);
    return null;
  }
}
